import { getRoom, snapshot, touchMember } from '../../utils/listeningRooms'

export default defineEventHandler((event) => {
  const code = getRouterParam(event, 'code') || ''
  const memberId = String(getQuery(event).memberId || '')
  const room = getRoom(code)
  touchMember(room, memberId)
  return snapshot(room)
})
