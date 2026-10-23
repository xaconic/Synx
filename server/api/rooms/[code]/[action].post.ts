import {
  addQueueItem,
  joinRoom,
  leaveRoom,
  manageRoom,
  removeMember,
  sendMessage,
  toggleMessageReaction,
  touchMember,
  getRoom,
} from '../../../utils/listeningRooms'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code') || ''
  const action = getRouterParam(event, 'action') || ''
  const body = await readBody<Record<string, unknown>>(event)
  const memberId = typeof body.memberId === 'string' ? body.memberId : ''
  const memberName = typeof body.memberName === 'string' ? body.memberName : 'Listener'

  if (!memberId || memberId.length > 80) {
    throw createError({ statusCode: 400, statusMessage: 'A valid demo listener identity is required.' })
  }

  if (action === 'join') return joinRoom(code, memberId, memberName)
  if (action === 'leave') return leaveRoom(code, memberId)
  if (action === 'heartbeat') {
    const room = getRoom(code)
    touchMember(room, memberId)
    return { alive: true }
  }
  if (action === 'chat') return sendMessage(code, memberId, body)
  if (action === 'reaction') {
    return toggleMessageReaction(code, memberId, String(body.messageId || ''), String(body.emoji || ''))
  }
  if (action === 'queue') return addQueueItem(code, memberId, body)
  if (action === 'kick') return removeMember(code, memberId, String(body.targetId || ''))
  if (['lock', 'moderator', 'transfer', 'end'].includes(action)) {
    return manageRoom(code, memberId, action, body)
  }

  throw createError({ statusCode: 404, statusMessage: 'That room action is not supported.' })
})
