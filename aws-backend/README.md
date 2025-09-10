# Archives Expo - AWS Backend Deployment

Standalone webhook handler for Stripe subscription lifecycle management, extracted from the main Expo app for independent AWS hosting.

## 🏗️ Architecture

- **AWS Lambda**: Webhook handler execution
- **API Gateway**: Public HTTPS endpoint for Stripe
- **Supabase**: Database operations for subscription tracking
- **PaymentLogger**: Comprehensive logging system

## 📁 Project Structure

```
aws-backend/
├── src/
│   ├── webhook-handler.js    # Main webhook logic
│   └── lambda.js            # AWS Lambda entry point
├── test/
│   └── test-webhook.js      # Local testing script
├── package.json             # Dependencies and scripts
├── deploy.sh               # Automated deployment script
└── README.md               # This file
```

## 🚀 Quick Deployment

### Prerequisites

1. **AWS CLI configured** with your IAM user credentials:
   ```bash
   aws configure
   # Access Key: AKIAUCSZZ5VUET4OSAFZ
   # Secret Key: [your secret access key]
   # Region: us-east-1
   ```

2. **Node.js 18+** installed

### Deploy to AWS

```bash
cd aws-backend
./deploy.sh
```

This script will:
- ✅ Create AWS Lambda function
- ✅ Set up API Gateway with `/webhooks/stripe` endpoint
- ✅ Configure IAM roles and permissions
- ✅ Return your webhook URL for Stripe configuration

## 🔧 Configuration

After deployment, update these environment variables in AWS Lambda:

### Required Environment Variables

```bash
# From your .env file
STRIPE_SECRET_KEY=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

# From Stripe Dashboard (after adding webhook)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# From Supabase Dashboard
SUPABASE_URL=https://kcgihainlnntshupiztu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### Update Environment Variables

```bash
aws lambda update-function-configuration \
    --function-name archives-stripe-webhook \
    --environment Variables='{
        "STRIPE_SECRET_KEY":"sk_live_your_real_key",
        "STRIPE_WEBHOOK_SECRET":"whsec_your_real_secret",
        "SUPABASE_URL":"https://kcgihainlnntshupiztu.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY":"your_real_service_key"
    }'
```

## 🌐 Webhook Events Handled

- `checkout.session.completed` - Creates subscription record
- `invoice.payment_succeeded` - Activates subscription
- `invoice.payment_failed` - Marks subscription past_due
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Cancels subscription

## 🔗 Stripe Dashboard Configuration

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook signing secret
5. Update Lambda environment variables

## 🧪 Testing

### Local Testing
```bash
npm test
```

### Test Deployed Webhook
```bash
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

Should return:
```json
{"error": "No signature", "sessionId": "abc123"}
```

## 📊 Monitoring

### View Logs
```bash
aws logs tail /aws/lambda/archives-stripe-webhook --follow
```

### Check Function Status
```bash
aws lambda get-function --function-name archives-stripe-webhook
```

## 💰 Costs

Estimated monthly costs for typical usage:
- **Lambda**: ~$0.20 per 1M requests
- **API Gateway**: ~$3.50 per 1M requests  
- **CloudWatch Logs**: ~$0.50 per GB
- **Total**: Under $5/month for most subscription volumes

## 🔄 Updates

To deploy code changes:
```bash
./deploy.sh
```

The script handles both new deployments and updates.

## 🐛 Troubleshooting

### Common Issues

1. **"No signature" error**
   - Check `STRIPE_WEBHOOK_SECRET` environment variable
   - Verify webhook URL in Stripe Dashboard

2. **Database connection error**
   - Check `SUPABASE_SERVICE_ROLE_KEY`
   - Ensure Supabase table exists (run SQL schema)

3. **Lambda timeout**
   - Check CloudWatch logs for specific error
   - Increase timeout if needed (currently 30s)

### Debug Mode

Enable detailed logging by adding:
```bash
aws lambda update-function-configuration \
    --function-name archives-stripe-webhook \
    --environment Variables='{"DEBUG":"true", ...other_vars}'
```

## 📝 Database Schema

Ensure this table exists in Supabase:
```sql
-- Run the SQL in: ../supabase-subscription-schema.sql
```

## 🔐 Security

- ✅ Webhook signature verification
- ✅ CORS headers configured
- ✅ Row Level Security on database
- ✅ Service role permissions only
- ✅ No sensitive data in logs (PaymentLogger.logSafeData)

## 📞 Support

If you encounter issues:
1. Check CloudWatch logs
2. Verify environment variables
3. Test with Stripe CLI for local development
4. Check Supabase database permissions