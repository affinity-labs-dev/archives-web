// AWS Lambda entry point for Stripe webhook handler
// This file adapts the webhook handler for AWS Lambda runtime

const { handleWebhook } = require('./webhook-handler');

// Lambda function handler
exports.handler = async (event, context) => {
  // Enable callback waits for empty event loop (important for database connections)
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Log the incoming request for debugging
    console.log('Lambda invocation:', {
      httpMethod: event.httpMethod,
      path: event.path,
      headers: Object.keys(event.headers || {}),
      bodyLength: event.body ? event.body.length : 0,
      isBase64Encoded: event.isBase64Encoded
    });
    
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Stripe-Signature',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: ''
      };
    }
    
    // Only allow POST requests for webhook
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Method not allowed',
          message: 'Only POST requests are accepted'
        })
      };
    }
    
    // Check if body exists
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Missing request body',
          message: 'Webhook body is required'
        })
      };
    }
    
    // Decode body if it's base64 encoded
    let body = event.body;
    if (event.isBase64Encoded) {
      body = Buffer.from(event.body, 'base64').toString('utf8');
    }
    
    // Create modified event for the webhook handler
    const webhookEvent = {
      ...event,
      body: body,
      headers: event.headers || {}
    };
    
    // Call the webhook handler
    const result = await handleWebhook(webhookEvent, context);
    
    // Add CORS headers to response
    return {
      ...result,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...result.headers
      }
    };
    
  } catch (error) {
    console.error('Lambda handler error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Lambda execution failed',
        timestamp: new Date().toISOString()
      })
    };
  }
};