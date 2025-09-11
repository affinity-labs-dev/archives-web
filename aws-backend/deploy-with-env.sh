#!/bin/bash

# Deploy Archives API with environment variables
# This script sources environment variables from the parent .env file and deploys the API

set -e

echo "🔧 Loading environment variables from parent .env file..."

# Source environment variables from parent directory
if [ -f "../.env" ]; then
    # Export variables that are needed for deployment
    export STRIPE_SECRET_KEY=$(grep "^STRIPE_SECRET_KEY=" ../.env | cut -d '=' -f2)
    export STRIPE_PRICE_MONTHLY=$(grep "^STRIPE_PRICE_MONTHLY=" ../.env | cut -d '=' -f2)
    export STRIPE_PRICE_YEARLY=$(grep "^STRIPE_PRICE_YEARLY=" ../.env | cut -d '=' -f2)
    export EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=$(grep "^EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=" ../.env | cut -d '=' -f2)
    export SUPABASE_URL=$(grep "^EXPO_PUBLIC_SUPABASE_URL=" ../.env | cut -d '=' -f2)
    export SUPABASE_SERVICE_ROLE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" ../.env | cut -d '=' -f2)
    
    echo "✅ Environment variables loaded"
    echo "   STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:0:10}..."
    echo "   STRIPE_PRICE_MONTHLY: $STRIPE_PRICE_MONTHLY"
    echo "   STRIPE_PRICE_YEARLY: $STRIPE_PRICE_YEARLY"
    echo "   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:0:10}..."
    echo "   SUPABASE_URL: $SUPABASE_URL"
    echo "   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:10}..."
else
    echo "❌ .env file not found in parent directory"
    exit 1
fi

echo ""
echo "🚀 Running API deployment script..."
./deploy-api.sh

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the API Gateway URL from the output above"
echo "2. Update EXPO_PUBLIC_AWS_API_BASE_URL in both .env and eas.json with the real URL"
echo "3. Create a new TestFlight build to test the fix"