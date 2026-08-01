const notificationService = require('../services/notification.service');

/**
 * POST /notifications/register-token
 * Register or update an Expo push token for the authenticated user.
 * Body: { token: string, platform: 'ios' | 'android' | 'web' }
 */
exports.registerPushToken = async (req, res) => {
  try {
    const { token, platform = 'ios' } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'Push token is required.' });
    }

    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();

    // Upsert: if the same token exists for this user, update the platform;
    // otherwise create a new record.
    const existing = await prisma.pushToken.findFirst({
      where: { userId, token },
    });

    if (existing) {
      await prisma.pushToken.update({
        where: { id: existing.id },
        data: { platform },
      });
    } else {
      await prisma.pushToken.create({
        data: { userId, token, platform },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Register push token error:', err);
    res.status(500).json({ error: 'Failed to register push token.' });
  }
};

/**
 * DELETE /notifications/register-token
 * Remove a push token for the authenticated user.
 * Body: { token: string }
 */
exports.unregisterPushToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'Push token is required.' });
    }

    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();

    await prisma.pushToken.deleteMany({
      where: { userId, token },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Unregister push token error:', err);
    res.status(500).json({ error: 'Failed to unregister push token.' });
  }
};

/**
 * GET /notifications
 * Get notifications for the authenticated user.
 * Query: type, limit, offset, unreadOnly
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, limit, offset, unreadOnly } = req.query;

    const result = await notificationService.getNotifications(userId, {
      type,
      limit: limit ? Number.parseInt(limit, 10) : 50,
      offset: offset ? Number.parseInt(offset, 10) : 0,
      unreadOnly: unreadOnly === 'true',
    });

    res.json(result);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
};

/**
 * PATCH /notifications/:id/read
 * Mark a single notification as read.
 */
exports.markAsRead = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid notification ID.' });

    await notificationService.markAsRead(id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
};

/**
 * PATCH /notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
exports.markAllAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
};

/**
 * DELETE /notifications/:id
 * Delete a single notification.
 */
exports.deleteNotification = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid notification ID.' });

    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();

    await prisma.notification.deleteMany({
      where: { id, userId: req.user.id },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
};

/**
 * GET /notifications/unread-count
 * Get the count of unread notifications for the authenticated user.
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();

    const count = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    });

    res.json({ count });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: 'Failed to get unread count.' });
  }
};
