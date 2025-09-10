#!/bin/bash

# AWS Lambda Deployment Script for Archives Stripe Webhook Handler
# Uses your existing IAM user: archives-expo-deploy

set -e  # Exit on any error

echo "🚀 Starting Archives Webhook Deployment to AWS Lambda"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Configuration
FUNCTION_NAME="archives-stripe-webhook"
REGION="us-east-1"  # Change if you prefer a different region
RUNTIME="nodejs18.x"
TIMEOUT=30
MEMORY=256

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run:"
    echo "   aws configure"
    echo "   Access Key: AKIAUCSZZ5VUET4OSAFZ"
    echo "   Secret Key: [your secret key]"
    echo "   Region: us-east-1"
    exit 1
fi

echo "✅ AWS CLI configured"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --only=production

# Create deployment package
echo "📦 Creating deployment package..."
rm -f webhook-handler.zip
zip -r webhook-handler.zip src/ node_modules/ package.json

echo "✅ Deployment package created: $(du -h webhook-handler.zip | cut -f1)"

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &> /dev/null; then
    echo "🔄 Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://webhook-handler.zip \
        --region $REGION
else
    echo "🆕 Creating new Lambda function..."
    
    # Create IAM role for Lambda if it doesn't exist
    ROLE_NAME="archives-lambda-webhook-role"
    ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")
    
    if [ -z "$ROLE_ARN" ]; then
        echo "🔑 Creating IAM role for Lambda..."
        
        # Create trust policy
        cat > /tmp/trust-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF
        
        aws iam create-role \
            --role-name $ROLE_NAME \
            --assume-role-policy-document file:///tmp/trust-policy.json \
            --region $REGION
        
        # Attach basic Lambda execution policy
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
            --region $REGION
        
        # Get the role ARN
        ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
        
        echo "⏳ Waiting for role to be available..."
        sleep 10
    fi
    
    echo "✅ Using IAM role: $ROLE_ARN"
    
    # Create the Lambda function
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler src/lambda.handler \
        --zip-file fileb://webhook-handler.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY \
        --region $REGION
fi

# Set environment variables (placeholders - you'll need to update these)
echo "🔧 Setting environment variables..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables="{
        STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here,
        STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here,
        SUPABASE_URL=https://kcgihainlnntshupiztu.supabase.co,
        SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
    }" \
    --region $REGION

# Create or update API Gateway
echo "🌐 Setting up API Gateway..."
API_NAME="archives-webhook-api"

# Check if API exists
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='$API_NAME'].id" --output text 2>/dev/null)

if [ -z "$API_ID" ] || [ "$API_ID" == "None" ]; then
    echo "🆕 Creating new API Gateway..."
    
    # Create API
    API_ID=$(aws apigateway create-rest-api \
        --name $API_NAME \
        --description "API for Archives Stripe webhook handler" \
        --query 'id' --output text)
    
    # Get root resource
    ROOT_ID=$(aws apigateway get-resources \
        --rest-api-id $API_ID \
        --query 'items[?path==`/`].id' --output text)
    
    # Create webhooks resource
    WEBHOOKS_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $ROOT_ID \
        --path-part webhooks \
        --query 'id' --output text)
    
    # Create stripe resource under webhooks
    STRIPE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $WEBHOOKS_ID \
        --path-part stripe \
        --query 'id' --output text)
    
    # Create POST method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $STRIPE_ID \
        --http-method POST \
        --authorization-type NONE
    
    # Create integration
    LAMBDA_ARN="arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:$FUNCTION_NAME"
    
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $STRIPE_ID \
        --http-method POST \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations"
    
    # Add Lambda permission for API Gateway
    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id apigateway-invoke \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$REGION:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*" \
        --region $REGION
    
    # Deploy API
    aws apigateway create-deployment \
        --rest-api-id $API_ID \
        --stage-name prod
    
    echo "✅ API Gateway created: $API_ID"
else
    echo "✅ Using existing API Gateway: $API_ID"
fi

# Get the webhook URL
WEBHOOK_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/prod/webhooks/stripe"

echo ""
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Webhook URL: $WEBHOOK_URL"
echo ""
echo "Next steps:"
echo "1. Update environment variables with real values:"
echo "   - STRIPE_SECRET_KEY"
echo "   - STRIPE_WEBHOOK_SECRET (get from Stripe Dashboard)"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "2. Add webhook URL to Stripe Dashboard:"
echo "   $WEBHOOK_URL"
echo ""
echo "3. Test the webhook endpoint:"
echo "   curl -X POST $WEBHOOK_URL"
echo ""

# Clean up
rm -f webhook-handler.zip
rm -f /tmp/trust-policy.json

echo "✅ Deployment files cleaned up"