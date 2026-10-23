import { addQueueItem } from '../../../utils/listeningRooms'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code') || ''
  const body = await readBody<Record<string, unknown>>(event)
  const memberId = typeof body.memberId === 'string' ? body.memberId : ''
  if (!memberId || memberId.length > 80) {
    throw createError({ statusCode: 400, statusMessage: 'A valid demo listener identity is required.' })
  }
  return addQueueItem(code, memberId, body)
})
