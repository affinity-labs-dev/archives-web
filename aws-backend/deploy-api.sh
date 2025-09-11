#!/bin/bash

# AWS Lambda Deployment Script for Archives API Routes
# Deploys payment-sheet, customer-portal, and checkout-session APIs

set -e  # Exit on any error

echo "🚀 Starting Archives API Routes Deployment to AWS Lambda"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Configuration
REGION="us-east-1"
RUNTIME="nodejs18.x"
TIMEOUT=30
MEMORY=256

# Function configuration
PAYMENT_SHEET_FUNCTION_NAME="archives-payment-sheet-api"

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

# Get existing API Gateway ID (from webhook deployment)
API_NAME="archives-webhook-api"
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='$API_NAME'].id" --output text 2>/dev/null)

if [ -z "$API_ID" ] || [ "$API_ID" == "None" ]; then
    echo "❌ API Gateway not found. Please deploy the webhook first using deploy.sh"
    exit 1
fi

echo "✅ Using existing API Gateway: $API_ID"

# Get or create IAM role
ROLE_NAME="archives-lambda-webhook-role"
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$ROLE_ARN" ]; then
    echo "❌ IAM role not found. Please deploy the webhook first using deploy.sh"
    exit 1
fi

echo "✅ Using existing IAM role: $ROLE_ARN"

# Deploy payment-sheet Lambda function
echo "🔄 Deploying payment-sheet API Lambda function..."

FUNCTION_NAME="$PAYMENT_SHEET_FUNCTION_NAME"

# Create deployment package for payment-sheet
echo "📦 Creating payment-sheet deployment package..."
rm -f payment-sheet-api.zip
zip -r payment-sheet-api.zip src/payment-sheet-handler.js src/payment-sheet-lambda.js node_modules/ package.json

echo "✅ Payment-sheet package created: $(du -h payment-sheet-api.zip | cut -f1)"

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &> /dev/null; then
    echo "🔄 Updating existing payment-sheet Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://payment-sheet-api.zip \
        --region $REGION
else
    echo "🆕 Creating new payment-sheet Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler src/payment-sheet-lambda.handler \
        --zip-file fileb://payment-sheet-api.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY \
        --region $REGION
fi

# Set environment variables for payment-sheet function
echo "🔧 Setting environment variables for payment-sheet..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment "Variables={STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY,STRIPE_PRICE_MONTHLY=$STRIPE_PRICE_MONTHLY,STRIPE_PRICE_YEARLY=$STRIPE_PRICE_YEARLY,EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=$EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY}" \
    --region $REGION

# Update API Gateway for payment-sheet
echo "🌐 Setting up API Gateway routes for payment-sheet..."

# Get root resource
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --query 'items[?path==`/`].id' --output text)

# Create or get /api resource
API_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --query 'items[?pathPart==`api`].id' --output text 2>/dev/null)

if [ -z "$API_RESOURCE_ID" ] || [ "$API_RESOURCE_ID" == "None" ]; then
    echo "🆕 Creating /api resource..."
    API_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $ROOT_ID \
        --path-part api \
        --query 'id' --output text)
fi

# Create or get /api/payment-sheet resource
PAYMENT_SHEET_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --query 'items[?pathPart==`payment-sheet`].id' --output text 2>/dev/null)

if [ -z "$PAYMENT_SHEET_RESOURCE_ID" ] || [ "$PAYMENT_SHEET_RESOURCE_ID" == "None" ]; then
    echo "🆕 Creating /api/payment-sheet resource..."
    PAYMENT_SHEET_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $API_RESOURCE_ID \
        --path-part payment-sheet \
        --query 'id' --output text)
fi

# Create POST method for payment-sheet
echo "🔄 Setting up POST method for payment-sheet..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $PAYMENT_SHEET_RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --region $REGION 2>/dev/null || true

# Create OPTIONS method for CORS
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $PAYMENT_SHEET_RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION 2>/dev/null || true

# Create integration for payment-sheet POST
LAMBDA_ARN="arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:$FUNCTION_NAME"

aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $PAYMENT_SHEET_RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $REGION

# Create integration for OPTIONS (CORS)
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $PAYMENT_SHEET_RESOURCE_ID \
    --http-method OPTIONS \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $REGION

# Add Lambda permission for API Gateway
aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id apigateway-invoke-payment-sheet \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*" \
    --region $REGION 2>/dev/null || true

# Deploy API changes
echo "🚀 Deploying API Gateway changes..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "Deploy payment-sheet API endpoint"

# Get the API URLs
PAYMENT_SHEET_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/prod/api/payment-sheet"
WEBHOOK_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/prod/webhooks/stripe"

echo ""
echo "🎉 Payment Sheet API Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Payment Sheet API URL: $PAYMENT_SHEET_URL"
echo "📍 Webhook URL: $WEBHOOK_URL"
echo ""
echo "Next steps:"
echo "1. Test the payment-sheet API endpoint:"
echo "   curl -X POST $PAYMENT_SHEET_URL \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"selectedPlan\": \"monthly\"}'"
echo ""
echo "2. Update your app configuration to use:"
echo "   API_BASE_URL=\"https://$API_ID.execute-api.$REGION.amazonaws.com/prod\""
echo ""
echo "3. Test in your React Native app"
echo ""

# Clean up
rm -f payment-sheet-api.zip

echo "✅ Deployment files cleaned up"