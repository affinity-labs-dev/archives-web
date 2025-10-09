/**
 * Archives Expo - Scheduled Push Notifications
 * Supabase Edge Function using expo-server-sdk
 *
 * Features:
 * - Timezone-aware scheduling (user's local 10PM)
 * - Sequential message rotation per user
 * - DeviceNotRegistered error handling
 * - Push receipt verification
 * - Anonymous + authenticated user support
 * - Activity-based frequency (daily/weekly)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Expo } from 'npm:expo-server-sdk@3.10.0';

// Calculate notification frequency based on user activity
function calculateFrequency(lastActiveAt: any, userId: any, createdAt: any): string {
  // Authenticated user - use Clerk last_active_at
  if (userId && lastActiveAt) {
    try {
      const lastActive = new Date(lastActiveAt);
      const daysSince = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= 2 ? 'weekly' : 'daily';
    } catch {
      return 'daily';
    }
  }

  // Anonymous user - use created_at
  if (!userId && createdAt) {
    try {
      const created = new Date(createdAt);
      const daysSince = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= 7 ? 'weekly' : 'daily';
    } catch {
      return 'daily';
    }
  }

  return 'daily';
}

// Check if notification should be sent
function shouldSend(frequency: string, lastSent: any, notifTime: string, timezone: string): boolean {
  try {
    const now = new Date();
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

    const [hour, minute] = notifTime.split(':').map(Number);
    const currentHour = localTime.getHours();
    const currentMin = localTime.getMinutes();

    // Check if past notification time
    if (currentHour < hour || (currentHour === hour && currentMin < minute)) {
      return false;
    }

    // First notification
    if (!lastSent) {
      return true;
    }

    // Check if different day
    const lastSentUtc = new Date(lastSent);
    const lastSentLocal = new Date(lastSentUtc.toLocaleString('en-US', { timeZone: timezone }));

    if (localTime.toDateString() === lastSentLocal.toDateString()) {
      return false; // Already sent today
    }

    // Daily: send next day
    if (frequency === 'daily') {
      return true;
    }

    // Weekly: check 7+ days
    if (frequency === 'weekly') {
      const days = Math.floor((localTime.getTime() - lastSentLocal.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 7;
    }

    return false;
  } catch (error) {
    console.error('Error checking send time:', error);
    return false;
  }
}

// Main handler
Deno.serve(async (req) => {
  try {
    console.log('='.repeat(60));
    console.log('🔔 Archives Expo Notification Service');
    console.log(`⏰ ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize Expo client with security token
    const expo = new Expo({
      accessToken: expoToken,
      useFcmV1: true,
    });

    console.log('🔐 Expo client initialized' + (expoToken ? ' (secured)' : ''));

    // Get all enabled users
    const { data: users, error: fetchError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('notifications_enabled', true);

    if (fetchError) throw fetchError;

    console.log(`📊 Found ${users?.length || 0} enabled users`);

    // Get Clerk user data for authenticated users (separate query - no FK needed)
    const userIds = users?.filter(u => u.user_id).map(u => u.user_id) || [];
    let clerkUsersMap = new Map();

    if (userIds.length > 0) {
      const { data: clerkUsers } = await supabase
        .from('clerk_user')
        .select('id, last_active_at')
        .in('id', userIds);

      if (clerkUsers) {
        clerkUsersMap = new Map(clerkUsers.map(u => [u.id, u]));
      }
    }

    // Filter eligible users
    const eligible: any[] = [];
    const currentUtc = new Date();

    for (const user of users || []) {
      const tz = user.timezone || 'UTC';
      const notifTime = user.notification_time || '22:00:00';
      const userId = user.user_id;

      // Get Clerk data from map (if user is authenticated)
      const clerkData = userId ? clerkUsersMap.get(userId) : null;
      const lastActiveAt = clerkData?.last_active_at || null;

      const freq = calculateFrequency(lastActiveAt, userId, user.created_at);

      if (shouldSend(freq, user.last_notification_sent, notifTime, tz)) {
        eligible.push({ ...user, calculated_frequency: freq });

        const display = userId ? userId.substring(0, 8) + '...' : 'anonymous';
        console.log(`✅ ${display} (${freq})`);
      }
    }

    console.log(`📤 Sending to ${eligible.length} users`);

    if (eligible.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        users_notified: 0,
        message: 'No eligible users'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare messages
    const messages: any[] = [];
    const userMap = new Map();
    const receiptIds: string[] = [];

    for (const user of eligible) {
      const freq = user.calculated_frequency;
      const lastSeq = freq === 'daily' ? user.last_daily_sequence : user.last_weekly_sequence;

      // Get next message
      const { data: msgData } = await supabase
        .from('notification_messages')
        .select('*')
        .eq('message_type', freq)
        .eq('is_active', true)
        .order('sequence_order');

      let message: any = null;
      if (msgData && msgData.length > 0) {
        // Find next in sequence
        for (const msg of msgData) {
          if (msg.sequence_order > lastSeq) {
            message = msg;
            break;
          }
        }
        if (!message) {
          message = msgData[0]; // Loop back
        }
      } else {
        // Fallback message
        message = {
          sequence_order: 1,
          title: 'Time to Learn',
          body: 'Your lesson awaits.',
        };
      }

      // Validate push token
      if (!Expo.isExpoPushToken(user.push_token)) {
        console.error(`❌ Invalid token: ${user.push_token}`);
        continue;
      }

      const notificationPayload = {
        to: user.push_token,
        title: message.title,
        body: message.body,
        data: {
          type: 'learning_reminder',
          deepLink: 'archives://lesson/next',
        },
        sound: 'default',
        priority: 'high',
        categoryId: 'learning_reminder',
      };

      console.log(`📝 Queued message for ${user.user_id || 'anonymous'}:`, {
        title: message.title,
        body: message.body,
        token: user.push_token.substring(0, 30) + '...'
      });

      messages.push(notificationPayload);

      userMap.set(user.push_token, {
        user_id: user.user_id,
        push_token: user.push_token,
        message_sequence: message.sequence_order,
        message_type: freq,
      });
    }

    // Send in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const results: any[] = [];

    console.log(`📦 Sending ${messages.length} messages in ${chunks.length} chunks`);

    for (const chunk of chunks) {
      try {
        console.log(`📤 Sending chunk of ${chunk.length} messages...`);
        const tickets = await expo.sendPushNotificationsAsync(chunk);

        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          const msg = chunk[i];
          const userData = userMap.get(msg.to);

          console.log(`📨 Ticket ${i + 1}/${tickets.length}:`, {
            status: ticket.status,
            token: msg.to.substring(0, 30) + '...',
            user: userData.user_id || 'anonymous'
          });

          if (ticket.status === 'error') {
            // Handle DeviceNotRegistered
            if (ticket.details?.error === 'DeviceNotRegistered') {
              console.log(`🔕 Device not registered: ${userData.user_id || 'anonymous'}`);

              await supabase
                .from('notification_preferences')
                .update({ notifications_enabled: false })
                .eq('push_token', userData.push_token);

              results.push({ ...userData, status: 'device_not_registered' });
            } else {
              console.error(`❌ Ticket error: ${ticket.message}`, ticket.details);
              results.push({ ...userData, status: 'error', error: ticket.message });
            }
          } else {
            // Success - collect receipt ID
            console.log(`✅ Ticket OK - Receipt ID: ${ticket.id}`);
            if (ticket.id) {
              receiptIds.push(ticket.id);
            }
            results.push({ ...userData, status: 'ok', receiptId: ticket.id });
          }
        }
      } catch (error) {
        console.error('❌ Chunk send error:', error);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Check receipts (verify actual delivery)
    if (receiptIds.length > 0) {
      console.log(`🔍 Checking ${receiptIds.length} receipts...`);

      try {
        const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

        for (const chunk of receiptChunks) {
          const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

          console.log(`📬 Received ${Object.keys(receipts).length} receipts`);

          for (const id in receipts) {
            const receipt = receipts[id];

            if (receipt.status === 'ok') {
              console.log(`✅ Receipt ${id}: Delivered successfully`);
            } else if (receipt.status === 'error') {
              console.error(`❌ Receipt ${id} error:`, {
                message: receipt.message,
                details: receipt.details
              });

              if (receipt.details?.error === 'DeviceNotRegistered') {
                console.log('🔕 Receipt: Device not registered - user likely uninstalled app');
              } else if (receipt.details?.error === 'MessageTooBig') {
                console.log('📏 Receipt: Message payload too large');
              } else if (receipt.details?.error === 'MessageRateExceeded') {
                console.log('⏱️ Receipt: Rate limit exceeded');
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Receipt check error:', error);
      }
    } else {
      console.warn('⚠️ No receipt IDs to check - all messages may have failed');
    }

    // Update database
    const now = new Date().toISOString();
    const successful = results.filter(r => r.status === 'ok');

    for (const result of successful) {
      try {
        // Build update object conditionally
        let updateObj: any;

        if (result.message_type === 'daily') {
          updateObj = {
            last_notification_sent: now,
            last_daily_sequence: result.message_sequence,
          };
        } else if (result.message_type === 'weekly') {
          updateObj = {
            last_notification_sent: now,
            last_weekly_sequence: result.message_sequence,
          };
        } else {
          updateObj = {
            last_notification_sent: now,
          };
        }

        await supabase
          .from('notification_preferences')
          .update(updateObj)
          .eq('push_token', result.push_token);

      } catch (error) {
        console.error('⚠️ Update error:', error);
      }
    }

    const sent = results.filter(r => r.status === 'ok').length;
    const uninstalled = results.filter(r => r.status === 'device_not_registered').length;
    const failed = results.filter(r => r.status === 'error').length;

    console.log('='.repeat(60));
    console.log(`✅ Sent: ${sent}`);
    console.log(`🔕 Uninstalled: ${uninstalled}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(60));

    return new Response(JSON.stringify({
      success: true,
      users_notified: sent,
      device_not_registered: uninstalled,
      failed: failed,
      timestamp: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Critical error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
