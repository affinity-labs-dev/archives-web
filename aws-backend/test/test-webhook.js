// Test script for the webhook handler
// Run with: node test/test-webhook.js

const { handleWebhook } = require('../src/webhook-handler');

// Mock environment variables for testing
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_secret';
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_key';

// Mock event for testing
const mockEvent = {
  httpMethod: 'POST',
  headers: {
    'stripe-signature': 'mock_signature'
  },
  body: JSON.stringify({
    id: 'evt_test_webhook',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_session',
        customer: 'cus_test_customer',
        subscription: 'sub_test_subscription'
      }
    }
  })
};

const mockContext = {
  callbackWaitsForEmptyEventLoop: false
};

async function testWebhook() {
  console.log('🧪 Testing webhook handler...');
  
  try {
    const result = await handleWebhook(mockEvent, mockContext);
    console.log('✅ Test result:', result);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testWebhook();
}