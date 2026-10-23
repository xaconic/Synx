import { createRoom } from '../../utils/listeningRooms'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const memberId = typeof body.memberId === 'string' ? body.memberId.trim() : ''
  const memberName = typeof body.memberName === 'string' ? body.memberName : 'Listener'
  const name = typeof body.name === 'string' ? body.name : ''

  if (!memberId || memberId.length > 80) {
    throw createError({ statusCode: 400, statusMessage: 'A valid demo listener identity is required.' })
  }

  return createRoom(memberId, memberName, name, body.isPrivate === true)
})
