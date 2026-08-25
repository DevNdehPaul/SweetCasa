const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const { getPrisma } = require('./prisma')

// Map userId -> Set<socket.id>
// Allows the same user to be connected from multiple devices/tabs.
const userSockets = new Map()

let io = null

/**
 * Attach Socket.IO to the running HTTP server.
 *
 * JWT-authenticated:
 * - Client can pass auth: { token }
 * - Or ?token=<jwt> in the handshake query
 *
 * The JWT is verified and the user is also checked against the database.
 */
function initSocket(httpServer) {
  if (io) return io

  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:8081', '*'],
      credentials: true,
    },

    // Railway / proxy friendly settings if needed:
    // pingInterval: 25000,
    // pingTimeout: 20000,
  })

  /**
   * Socket authentication middleware.
   */
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.query?.token &&
          String(socket.handshake.query.token)) ||
        null

      if (!token) {
        return next(new Error('Authentication error'))
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      if (!decoded?.id) {
        return next(new Error('Authentication error'))
      }

      // Verify the user still exists and is allowed to connect.
      const user = await getPrisma().user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          role: true,
          status: true,
        },
      })

      if (!user || user.status === 'Suspended') {
        return next(new Error('Unauthorized'))
      }

      // Store authenticated user information on the socket.
      socket.userId = user.id
      socket.userRole = user.role

      next()
    } catch (err) {
      console.error('Socket authentication error:', err.message)

      return next(new Error('Authentication error'))
    }
  })

  /**
   * Handle new connections.
   */
  io.on('connection', (socket) => {
    const { userId } = socket

    if (!userId) {
      socket.disconnect(true)
      return
    }

    /**
     * Personal room.
     *
     * Useful for events that should only be received by this user,
     * such as:
     * - deposit status updates
     * - withdrawal status updates
     * - notifications
     * - account events
     */
    socket.join(`user:${userId}`)

    /**
     * Register socket in user -> sockets map.
     *
     * This supports multiple devices/tabs for the same user.
     */
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set())
    }

    userSockets.get(userId).add(socket.id)

    console.log(
      `Socket connected: ${socket.id} (user: ${userId})`
    )

    /**
     * Join a conversation room.
     *
     * Example:
     * conversation:abc123
     */
    socket.on('join_conversation', (conversationId) => {
      if (!conversationId) return

      socket.join(`conversation:${conversationId}`)
    })

    /**
     * Leave a conversation room.
     */
    socket.on('leave_conversation', (conversationId) => {
      if (!conversationId) return

      socket.leave(`conversation:${conversationId}`)
    })

    /**
     * Disconnect cleanup.
     */
    socket.on('disconnect', (reason) => {
      const sockets = userSockets.get(userId)

      if (sockets) {
        sockets.delete(socket.id)

        if (sockets.size === 0) {
          userSockets.delete(userId)
        }
      }

      console.log(
        `Socket disconnected: ${socket.id} (user: ${userId}) - ${reason}`
      )
    })
  })

  return io
}

/**
 * Emit an event to every socket belonging to a specific user.
 *
 * Useful when the user may be connected from:
 * - phone
 * - laptop
 * - multiple browser tabs
 *
 * Returns the number of sockets the event was sent to.
 */
function emitToUser(userId, event, payload) {
  if (!io) return 0

  const sockets = userSockets.get(userId)

  if (!sockets || sockets.size === 0) {
    return 0
  }

  let delivered = 0

  for (const socketId of sockets) {
    io.to(socketId).emit(event, payload)
    delivered += 1
  }

  return delivered
}

/**
 * Emit an event to the user's personal room.
 *
 * This is useful when you don't care about the number of connected
 * sockets and simply want Socket.IO to broadcast to all devices/tabs.
 *
 * Example:
 *
 * emitToUserRoom(userId, 'deposit_updated', deposit)
 */
function emitToUserRoom(userId, event, payload) {
  if (!io) return 0

  io.to(`user:${userId}`).emit(event, payload)

  return 1
}

/**
 * Emit an event to everyone currently inside a conversation room.
 *
 * Example:
 *
 * emitToConversation(
 *   conversationId,
 *   'new_message',
 *   message
 * )
 */
function emitToConversation(conversationId, event, payload) {
  if (!io) return

  io.to(`conversation:${conversationId}`).emit(event, payload)
}

/**
 * Get the initialized Socket.IO instance.
 *
 * Throws if Socket.IO has not been initialized yet.
 */
function getIO() {
  if (!io) {
    throw new Error(
      'Socket.IO has not been initialized yet — call initSocket() first.'
    )
  }

  return io
}

module.exports = {
  initSocket,
  emitToUser,
  emitToUserRoom,
  emitToConversation,
  getIO,
}