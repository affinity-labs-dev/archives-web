// AWS Lambda entry point for payment sheet API
// Handles the Lambda event/response format and CORS

const { handlePaymentSheetRequest, PaymentLogger } = require('./payment-sheet-handler');

exports.handler = async (event, context) => {
  // Generate session ID for tracking
  const sessionId = Math.random().toString(36).substring(7);

  // CORS headers for mobile app
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  try {
    // Handle CORS preflight request
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'CORS preflight successful' }),
      };
    }

    // Only allow POST method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Method not allowed',
          sessionId: sessionId,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    PaymentLogger.log("LAMBDA_START", `Lambda invocation started for session ${sessionId}`, {
      httpMethod: event.httpMethod,
      path: event.path,
      headers: event.headers,
    });

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      PaymentLogger.error("BODY_PARSE_ERROR", `Failed to parse request body for session ${sessionId}`, parseError);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
          sessionId: sessionId,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Validate required fields
    if (!body.selectedPlan) {
      PaymentLogger.error("VALIDATION_ERROR", `Missing selectedPlan for session ${sessionId}`);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required field: selectedPlan',
          sessionId: sessionId,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Validate selectedPlan value
    if (!['monthly', 'yearly'].includes(body.selectedPlan)) {
      PaymentLogger.error("VALIDATION_ERROR", `Invalid selectedPlan for session ${sessionId}: ${body.selectedPlan}`);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Invalid selectedPlan. Must be "monthly" or "yearly"',
          sessionId: sessionId,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Check required environment variables
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_PRICE_MONTHLY',
      'STRIPE_PRICE_YEARLY',
      'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      PaymentLogger.error("ENV_VAR_ERROR", `Missing environment variables for session ${sessionId}`, {
        missingEnvVars
      });
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Server configuration error',
          sessionId: sessionId,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Process the payment sheet request
    const responseData = await handlePaymentSheetRequest(body, sessionId);

    PaymentLogger.log("LAMBDA_SUCCESS", `Lambda invocation completed successfully for session ${sessionId}`);

    // Return successful response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(responseData),
    };

  } catch (error) {
    PaymentLogger.error("LAMBDA_ERROR", `Lambda invocation failed for session ${sessionId}`, {
      error: error.message,
      stack: error.stack,
    });

    // Return error response
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to create subscription',
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};