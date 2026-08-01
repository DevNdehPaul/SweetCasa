const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const { getPrisma } = require('./prisma')

// Map userId -> Set<socket.id> so a user can be connected from multiple devices
const userSockets = new Map()

let io = null

/**
 * Attach Socket.IO to the running HTTP server.
 * JWT-authenticated: the client must pass `?token=<jwt>` or `auth: { token }`.
 */
function initSocket(server) {
  if (io) return io

  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    // Railwaay/healthy-timeout friendly
    pingInterval: 25000,
    pingTimeout: 20000,
  })

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.query?.token && String(socket.handshake.query.token)) ||
        null

      if (!token) return next(new Error('Authentication error'))

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      const user = await getPrisma().user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, status: true },
      })

      if (!user || user.status === 'Suspended') {
        return next(new Error('Unauthorized'))
      }

      socket.userId = user.id
      socket.userRole = user.role
      next()
    } catch (err) {
      return next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket) => {
    // Register the socket in the user → sockets map
    if (socket.userId) {
      if (!userSockets.has(socket.userId)) userSockets.set(socket.userId, new Set())
      userSockets.get(socket.userId).add(socket.id)
    }

    // Client can join a room per conversation for targeted broadcasts
    socket.on('join_conversation', (conversationId) => {
      if (conversationId) socket.join(`conversation:${conversationId}`)
    })

    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) socket.leave(`conversation:${conversationId}`)
    })

    socket.on('disconnect', () => {
      if (socket.userId && userSockets.has(socket.userId)) {
        userSockets.get(socket.userId).delete(socket.id)
        if (userSockets.get(socket.userId).size === 0) userSockets.delete(socket.userId)
      }
    })
  })

  return io
}

/**
 * Emit an event to every socket belonging to a user.
 * Returns the number of sockets the event was delivered to.
 */
function emitToUser(userId, event, payload) {
  if (!io) return 0
  const sockets = userSockets.get(userId)
  if (!sockets || sockets.size === 0) return 0

  let delivered = 0
  for (const socketId of sockets) {
    io.to(socketId).emit(event, payload)
    delivered += 1
  }
  return delivered
}

/**
 * Emit an event to every socket in a conversation room.
 */
function emitToConversation(conversationId, event, payload) {
  if (!io) return
  io.to(`conversation:${conversationId}`).emit(event, payload)
}

function getIO() {
  return io
}

module.exports = { initSocket, emitToUser, emitToConversation, getIO }

