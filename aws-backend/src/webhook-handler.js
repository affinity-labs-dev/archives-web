// Standalone webhook handler for AWS Lambda deployment
// Extracted from Expo app structure for independent hosting

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

// Initialize Supabase with service role key for webhook operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Payment Logger utility for comprehensive logging
class PaymentLogger {
  static log(phase, message, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 💳 ${phase}: ${message}`);
    if (data) {
      console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2));
    }
  }
  
  static error(phase, message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ${phase}: ${message}`);
    if (error) {
      console.error(`[${timestamp}] 🚨 Error Details:`, error);
      if (error.stack) {
        console.error(`[${timestamp}] 📚 Stack:`, error.stack);
      }
    }
  }
  
  static success(phase, message, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ ${phase}: ${message}`);
    if (data) {
      console.log(`[${timestamp}] 📈 Success Data:`, data);
    }
  }
  
  static warn(phase, message, data) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] ⚠️ ${phase}: ${message}`);
    if (data) {
      console.warn(`[${timestamp}] ⚠️ Warning Data:`, data);
    }
  }
  
  static logSafeData(phase, message, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 💳 ${phase}: ${message}`);
    
    if (data) {
      const safeData = { ...data };
      const sensitiveFields = ['client_secret', 'secret', 'key', 'token', 'password'];
      
      const removeSensitiveData = (obj) => {
        if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
              obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
              removeSensitiveData(obj[key]);
            }
          }
        }
      };
      
      removeSensitiveData(safeData);
      console.log(`[${timestamp}] 📊 Safe Data:`, JSON.stringify(safeData, null, 2));
    }
  }
}

// Main webhook handler function
async function handleWebhook(event, context) {
  const sessionId = Math.random().toString(36).substring(7);
  
  try {
    PaymentLogger.log('WEBHOOK_START', `Webhook request ${sessionId} received`);
    
    const body = event.body;
    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    
    if (!signature) {
      PaymentLogger.error('WEBHOOK_SIGNATURE_MISSING', `No signature header for session ${sessionId}`);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No signature' })
      };
    }
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      PaymentLogger.error('WEBHOOK_SECRET_MISSING', `Webhook secret not configured for session ${sessionId}`);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Webhook secret not configured' })
      };
    }
    
    // Verify webhook signature
    PaymentLogger.log('WEBHOOK_VERIFY', `Verifying signature for session ${sessionId}`);
    const stripeEvent = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    
    PaymentLogger.log('WEBHOOK_EVENT', `Event received for session ${sessionId}`, {
      type: stripeEvent.type,
      id: stripeEvent.id,
      created: new Date(stripeEvent.created * 1000).toISOString(),
      livemode: stripeEvent.livemode
    });
    
    // Handle different event types
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object, sessionId);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object, sessionId);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object, sessionId);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object, sessionId);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object, sessionId);
        break;
        
      default:
        PaymentLogger.log('WEBHOOK_UNHANDLED', `Unhandled event type for session ${sessionId}`, {
          type: stripeEvent.type
        });
    }
    
    PaymentLogger.success('WEBHOOK_SUCCESS', `Webhook session ${sessionId} processed successfully`);
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, sessionId })
    };
    
  } catch (error) {
    PaymentLogger.error('WEBHOOK_ERROR', `Webhook session ${sessionId} failed`, error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook handler failed', sessionId })
    };
  }
}

// Handle checkout session completed
async function handleCheckoutCompleted(session, sessionId) {
  PaymentLogger.log('CHECKOUT_COMPLETED', `Processing checkout completion for session ${sessionId}`, {
    sessionId: session.id,
    customerId: session.customer,
    subscriptionId: session.subscription
  });
  
  try {
    if (session.subscription) {
      // Fetch the full subscription object
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      PaymentLogger.log('SUBSCRIPTION_RETRIEVED', `Subscription retrieved for session ${sessionId}`, {
        subscriptionId: subscription.id,
        status: subscription.status,
        customerId: subscription.customer
      });
      
      // Insert or update subscription in database
      const subscriptionData = {
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        status: subscription.status,
        plan_interval: subscription.items.data[0]?.price?.recurring?.interval || 'month',
        plan_amount: subscription.items.data[0]?.price?.unit_amount || 0,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        metadata: {
          created_from_checkout: true,
          session_id: sessionId
        }
      };
      
      PaymentLogger.log('SUBSCRIPTION_DB_UPSERT', `Upserting subscription to database for session ${sessionId}`);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .upsert(subscriptionData, { 
          onConflict: 'stripe_subscription_id'
        })
        .select()
        .single();
      
      if (error) {
        PaymentLogger.error('SUBSCRIPTION_DB_ERROR', `Failed to upsert subscription for session ${sessionId}`, error);
        throw error;
      }
      
      PaymentLogger.success('CHECKOUT_PROCESSED', `Checkout completed and stored for session ${sessionId}`, {
        dbRecordId: data.id,
        subscriptionId: subscription.id
      });
    }
    
  } catch (error) {
    PaymentLogger.error('CHECKOUT_COMPLETED_ERROR', `Failed to process checkout for session ${sessionId}`, error);
    throw error;
  }
}

// Handle successful payment
async function handlePaymentSucceeded(invoice, sessionId) {
  PaymentLogger.log('PAYMENT_SUCCEEDED', `Processing payment success for session ${sessionId}`, {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    customerId: invoice.customer,
    amountPaid: invoice.amount_paid
  });
  
  try {
    if (invoice.subscription) {
      const updateData = {
        status: 'active',
        current_period_start: new Date(invoice.period_start * 1000),
        current_period_end: new Date(invoice.period_end * 1000),
      };
      
      PaymentLogger.log('PAYMENT_DB_UPDATE', `Updating subscription status for session ${sessionId}`);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('stripe_subscription_id', invoice.subscription)
        .select()
        .single();
      
      if (error) {
        PaymentLogger.error('PAYMENT_DB_ERROR', `Failed to update subscription for session ${sessionId}`, error);
        throw error;
      }
      
      PaymentLogger.success('PAYMENT_PROCESSED', `Payment succeeded and subscription activated for session ${sessionId}`, {
        subscriptionId: invoice.subscription,
        dbRecordId: data.id
      });
      
      // TODO: Grant user access to premium features based on user_id
      if (data.user_id) {
        PaymentLogger.log('ACCESS_GRANT_NEEDED', `Should grant access for user ${data.user_id}`);
        // await grantUserAccess(data.user_id);
      }
    }
    
  } catch (error) {
    PaymentLogger.error('PAYMENT_SUCCEEDED_ERROR', `Failed to process payment success for session ${sessionId}`, error);
    throw error;
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice, sessionId) {
  PaymentLogger.error('PAYMENT_FAILED', `Processing payment failure for session ${sessionId}`, {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    customerId: invoice.customer,
    attemptCount: invoice.attempt_count
  });
  
  try {
    if (invoice.subscription) {
      const updateData = {
        status: 'past_due',
      };
      
      PaymentLogger.log('PAYMENT_FAILURE_DB_UPDATE', `Updating subscription to past_due for session ${sessionId}`);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('stripe_subscription_id', invoice.subscription)
        .select()
        .single();
      
      if (error) {
        PaymentLogger.error('PAYMENT_FAILURE_DB_ERROR', `Failed to update subscription for session ${sessionId}`, error);
        throw error;
      }
      
      PaymentLogger.warn('SUBSCRIPTION_PAST_DUE', `Subscription marked past due for session ${sessionId}`, {
        subscriptionId: invoice.subscription,
        dbRecordId: data.id,
        attemptCount: invoice.attempt_count
      });
      
      // TODO: Handle failed payment logic (notifications, grace period, etc.)
      if (data.user_id) {
        PaymentLogger.log('PAYMENT_FAILURE_USER_ACTION', `Should handle payment failure for user ${data.user_id}`);
        // await handleFailedPaymentLogic(data.user_id, invoice.subscription);
      }
    }
    
  } catch (error) {
    PaymentLogger.error('PAYMENT_FAILED_ERROR', `Failed to process payment failure for session ${sessionId}`, error);
    throw error;
  }
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription, sessionId) {
  PaymentLogger.log('SUBSCRIPTION_UPDATED', `Processing subscription update for session ${sessionId}`, {
    subscriptionId: subscription.id,
    status: subscription.status,
    customerId: subscription.customer
  });
  
  try {
    const updateData = {
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
    };
    
    PaymentLogger.log('SUBSCRIPTION_UPDATE_DB', `Updating subscription in database for session ${sessionId}`);
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update(updateData)
      .eq('stripe_subscription_id', subscription.id)
      .select()
      .single();
    
    if (error) {
      PaymentLogger.error('SUBSCRIPTION_UPDATE_DB_ERROR', `Failed to update subscription for session ${sessionId}`, error);
      throw error;
    }
    
    PaymentLogger.success('SUBSCRIPTION_UPDATE_PROCESSED', `Subscription updated for session ${sessionId}`, {
      subscriptionId: subscription.id,
      status: subscription.status,
      dbRecordId: data.id
    });
    
  } catch (error) {
    PaymentLogger.error('SUBSCRIPTION_UPDATED_ERROR', `Failed to process subscription update for session ${sessionId}`, error);
    throw error;
  }
}

// Handle subscription deleted/cancelled
async function handleSubscriptionDeleted(subscription, sessionId) {
  PaymentLogger.warn('SUBSCRIPTION_DELETED', `Processing subscription deletion for session ${sessionId}`, {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
  });
  
  try {
    const updateData = {
      status: 'canceled',
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : new Date(),
    };
    
    PaymentLogger.log('SUBSCRIPTION_DELETION_DB', `Updating subscription to canceled for session ${sessionId}`);
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update(updateData)
      .eq('stripe_subscription_id', subscription.id)
      .select()
      .single();
    
    if (error) {
      PaymentLogger.error('SUBSCRIPTION_DELETION_DB_ERROR', `Failed to update canceled subscription for session ${sessionId}`, error);
      throw error;
    }
    
    PaymentLogger.warn('SUBSCRIPTION_ACCESS_REVOKED', `Subscription canceled and access should be revoked for session ${sessionId}`, {
      subscriptionId: subscription.id,
      dbRecordId: data.id
    });
    
    // TODO: Revoke user access based on user_id
    if (data.user_id) {
      PaymentLogger.log('ACCESS_REVOKE_NEEDED', `Should revoke access for user ${data.user_id}`);
      // await revokeUserAccess(data.user_id);
    }
    
  } catch (error) {
    PaymentLogger.error('SUBSCRIPTION_DELETED_ERROR', `Failed to process subscription deletion for session ${sessionId}`, error);
    throw error;
  }
}

module.exports = { handleWebhook };