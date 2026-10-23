import { reorderQueue } from '../../../utils/listeningRooms'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code') || ''
  const body = await readBody<{ memberId?: string; itemId?: string; direction?: number }>(event)
  if (!body.memberId || !body.itemId || !body.direction) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a queue item and a direction.' })
  }
  return reorderQueue(code, body.memberId, body.itemId, body.direction)
})
