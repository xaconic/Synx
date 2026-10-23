import { removeQueueItem } from '../../../../utils/listeningRooms'

export default defineEventHandler((event) => {
  const code = getRouterParam(event, 'code') || ''
  const itemId = getRouterParam(event, 'itemId') || ''
  const memberId = String(getQuery(event).memberId || '')
  return removeQueueItem(code, memberId, itemId)
})
