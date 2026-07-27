const { getPrisma } = require('./prisma')

// Never throws — a failed audit write should not break the action it's logging.
async function logAction({ actorId, actorRole, action, entityType, entityId, entityLabel, metadata }) {
  try {
    const prisma = getPrisma()

    let actorName = 'System'
    if (actorId) {
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { name: true, companyName: true, email: true },
      })
      actorName = actor?.name || actor?.companyName || actor?.email || `User #${actorId}`
    }

    await prisma.auditLog.create({
      data: {
        actorId: actorId ?? null,
        actorName,
        actorRole: actorRole || null,
        action,
        entityType: entityType || null,
        entityId: entityId ?? null,
        entityLabel: entityLabel || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })
  } catch (err) {
    console.error('[audit] Failed to log action:', err.message)
  }
}

module.exports = { logAction }
