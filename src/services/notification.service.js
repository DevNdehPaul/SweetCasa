const { getPrisma } = require('../lib/prisma');
const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send a push notification to a specific user's Expo push tokens.
 * Falls back silently if the user has no tokens or tokens are invalid.
 */
async function sendPushNotification(userId, { title, body, data = {} }) {
  try {
    const prisma = getPrisma();

    const pushTokens = await prisma.pushToken.findMany({
      where: { userId },
    });

    if (!pushTokens.length) return;

    const messages = [];

    for (const pt of pushTokens) {
      // Check that the token is a valid Expo push token
      if (!Expo.isExpoPushToken(pt.token)) {
        console.warn(`[push] Invalid Expo push token for user ${userId}: ${pt.token}`);
        continue;
      }

      messages.push({
        to: pt.token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        ...(pt.platform === 'android' ? { channelId: 'default' } : {}),
      });
    }

    if (!messages.length) return;

    // Send the messages in chunks (Expo accepts up to 100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (err) {
        console.error('[push] Error sending chunk:', err.message);
      }
    }

    // Check for receipts later (optional — could be done in a background job)
    return tickets;
  } catch (err) {
    console.error('[push] sendPushNotification error:', err.message);
    // Never throw — push failures shouldn't break the main flow
  }
}

/**
 * Create an in-app notification record and optionally send a push notification.
 */
async function createNotification(userId, { type, title, body, data = {}, sendPush = true }) {
  try {
    const prisma = getPrisma();

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data || undefined,
        sent: false,
      },
    });

    if (sendPush) {
      await sendPushNotification(userId, { title, body, data: { ...data, notificationId: notification.id } });
      await prisma.notification.update({
        where: { id: notification.id },
        data: { sent: true },
      });
    }

    return notification;
  } catch (err) {
    console.error('[notification] createNotification error:', err.message);
    return null;
  }
}

/**
 * Mark a notification as read.
 */
async function markAsRead(notificationId, userId) {
  try {
    const prisma = getPrisma();
    return await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  } catch (err) {
    console.error('[notification] markAsRead error:', err.message);
  }
}

/**
 * Mark all notifications as read for a user.
 */
async function markAllAsRead(userId) {
  try {
    const prisma = getPrisma();
    return await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  } catch (err) {
    console.error('[notification] markAllAsRead error:', err.message);
  }
}

/**
 * Get notifications for a user with optional filtering and pagination.
 */
async function getNotifications(userId, { type, limit = 50, offset = 0, unreadOnly = false } = {}) {
  try {
    const prisma = getPrisma();
    const where = { userId };

    if (type && type !== 'All') {
      where.type = type.toLowerCase();
    }
    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return { notifications, total, unreadCount };
  } catch (err) {
    console.error('[notification] getNotifications error:', err.message);
    return { notifications: [], total: 0, unreadCount: 0 };
  }
}

module.exports = {
  sendPushNotification,
  createNotification,
  markAsRead,
  markAllAsRead,
  getNotifications,
};
