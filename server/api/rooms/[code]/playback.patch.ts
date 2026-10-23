import { updatePlayback } from '../../../utils/listeningRooms'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code') || ''
  const body = await readBody<{ memberId?: string; action?: string; value?: unknown }>(event)
  if (!body.memberId || body.memberId.length > 80 || !body.action) {
    throw createError({ statusCode: 400, statusMessage: 'A listener identity and playback action are required.' })
  }
  return updatePlayback(code, body.memberId, body.action, body.value)
})
