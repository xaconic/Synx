import { randomBytes, randomUUID } from 'node:crypto'
import { normalizeLocalMusicPath } from '#shared/song-audio'
import { validateMusicFile } from './music-files'

type Track = {
  id: string
  title: string
  artist: string
  cover: string
  durationMs: number
  audioUrl?: string
}

type Member = {
  id: string
  name: string
  role: 'host' | 'moderator' | 'member'
  joinedAt: number
  lastSeen: number
}

type RoomMessage = {
  id: string
  clientId?: string
  memberId: string
  memberName: string
  text: string
  track?: Track
  reactions: Record<string, string[]>
  createdAt: number
}

type Room = {
  code: string
  name: string
  isPrivate: boolean
  locked: boolean
  ended: boolean
  hostId: string
  members: Member[]
  currentTrack: Track | null
  queue: Array<Track & { addedBy: string; addedByName: string; requestId?: string }>
  previousTracks: Track[]
  messages: RoomMessage[]
  activity: Array<{ id: string; text: string; createdAt: number }>
  playback: {
    playing: boolean
    positionMs: number
    startedAt: number | null
    shuffle: boolean
    repeat: 'off' | 'all' | 'one'
    volume: number
  }
  updatedAt: number
}

const rooms = new Map<string, Room>()
const reactions = ['❤️', '🔥', '🎵', '😂', '👀']

function makeTrack(track: Partial<Track> & Pick<Track, 'title' | 'artist'>): Track {
  const audioUrl = track.audioUrl ? normalizeLocalMusicPath(track.audioUrl) : null
  if (track.audioUrl && !audioUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid local SYNX audio file.' })
  }
  if (audioUrl) {
    const filename = audioUrl.slice('/music/'.length)
    if (validateMusicFile(filename).status !== 'available') {
      throw createError({ statusCode: 400, statusMessage: 'That SYNX audio file is not available for playback.' })
    }
  }

  return {
    id: track.id || randomUUID(),
    title: track.title.trim().slice(0, 120),
    artist: track.artist.trim().slice(0, 120),
    cover: track.cover || '',
    durationMs: Math.min(Math.max(Number(track.durationMs) || 210_000, 1_000), 3_600_000),
    ...(audioUrl ? { audioUrl } : {}),
  }
}

function addActivity(room: Room, text: string) {
  room.activity.unshift({ id: randomUUID(), text, createdAt: Date.now() })
  room.activity = room.activity.slice(0, 80)
  room.updatedAt = Date.now()
}

function seedRoom() {
  const now = Date.now()
  const hostId = 'synx-demo-host'
  const room: Room = {
    code: '0042',
    name: 'The Midnight Crew',
    isPrivate: false,
    locked: false,
    ended: false,
    hostId,
    members: [{ id: hostId, name: 'Mia', role: 'host', joinedAt: now - 60_000, lastSeen: now - 60_000 }],
    currentTrack: makeTrack({
      id: 'synx-1',
      title: 'The Night We Met',
      artist: 'Lord Huron',
      cover: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=600&q=85',
      durationMs: 208_000,
      audioUrl: '/music/the-night-we-met.mp3',
    }),
    queue: [],
    previousTracks: [],
    messages: [],
    activity: [{ id: randomUUID(), text: 'The room is open. Come listen together.', createdAt: now }],
    playback: { playing: false, positionMs: 0, startedAt: null, shuffle: false, repeat: 'off', volume: 50 },
    updatedAt: now,
  }
  rooms.set(room.code, room)
}

seedRoom()

function getRoom(code: string): Room {
  const room = rooms.get(code.toUpperCase())
  if (!room || room.ended) {
    throw createError({ statusCode: 404, statusMessage: 'That listening room is no longer available.' })
  }
  return room
}

function getMember(room: Room, memberId: string): Member {
  const member = room.members.find((item) => item.id === memberId)
  if (!member) throw createError({ statusCode: 403, statusMessage: 'Join this room before taking that action.' })
  return member
}

function canModerate(member: Member) {
  return member.role === 'host' || member.role === 'moderator'
}

function touchMember(room: Room, memberId: string) {
  const member = getMember(room, memberId)
  member.lastSeen = Date.now()
  return member
}

function currentPosition(room: Room, now = Date.now()) {
  if (!room.currentTrack) return 0
  const elapsed = room.playback.playing && room.playback.startedAt
    ? now - room.playback.startedAt
    : 0
  return Math.min(room.currentTrack.durationMs, Math.max(0, room.playback.positionMs + elapsed))
}

function snapshot(room: Room) {
  const now = Date.now()
  return {
    code: room.code,
    name: room.name,
    isPrivate: room.isPrivate,
    locked: room.locked,
    hostId: room.hostId,
    members: room.members.map((member) => ({
      ...member,
      online: now - member.lastSeen < 15_000,
    })),
    currentTrack: room.currentTrack,
    queue: room.queue,
    messages: room.messages,
    activity: room.activity,
    playback: {
      ...room.playback,
      positionMs: currentPosition(room, now),
      serverTime: now,
    },
    updatedAt: room.updatedAt,
  }
}

function createRoom(memberId: string, memberName: string, name: string, isPrivate: boolean) {
  const now = Date.now()
  let code = randomBytes(3).toString('hex').toUpperCase()
  while (rooms.has(code)) code = randomBytes(3).toString('hex').toUpperCase()
  const room: Room = {
    code,
    name: name.trim().slice(0, 60) || 'A New Frequency',
    isPrivate,
    locked: false,
    ended: false,
    hostId: memberId,
    members: [{ id: memberId, name: memberName.trim().slice(0, 40) || 'Listener', role: 'host', joinedAt: now, lastSeen: now }],
    currentTrack: makeTrack({
      id: 'synx-1',
      title: 'The Night We Met',
      artist: 'Lord Huron',
      cover: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=600&q=85',
      durationMs: 208_000,
      audioUrl: '/music/the-night-we-met.mp3',
    }),
    queue: [],
    previousTracks: [],
    messages: [],
    activity: [],
    playback: { playing: false, positionMs: 0, startedAt: null, shuffle: false, repeat: 'off', volume: 50 },
    updatedAt: now,
  }
  rooms.set(code, room)
  addActivity(room, `${memberName} opened the room.`)
  return snapshot(room)
}

function joinRoom(code: string, memberId: string, memberName: string) {
  const room = getRoom(code)
  if (room.locked && !room.members.some((member) => member.id === memberId)) {
    throw createError({ statusCode: 423, statusMessage: 'This room is locked.' })
  }
  const existing = room.members.find((member) => member.id === memberId)
  if (existing) {
    existing.lastSeen = Date.now()
    existing.name = memberName.trim().slice(0, 40) || existing.name
  } else {
    const firstListener = room.members.length === 0
    const member: Member = {
      id: memberId,
      name: memberName.trim().slice(0, 40) || 'Listener',
      role: firstListener ? 'host' : 'member',
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    }
    room.members.push(member)
    if (firstListener) room.hostId = memberId
    addActivity(room, `${member.name} joined the room.`)
  }
  return snapshot(room)
}

function leaveRoom(code: string, memberId: string) {
  const room = getRoom(code)
  const member = getMember(room, memberId)
  if (member.id === room.hostId && room.members.length > 1) {
    throw createError({ statusCode: 409, statusMessage: 'Transfer host first, or end the room before leaving.' })
  }
  room.members = room.members.filter((item) => item.id !== memberId)
  addActivity(room, `${member.name} left the room.`)
  if (!room.members.length) room.ended = true
  return { left: true }
}

function removeMember(code: string, memberId: string, targetId: string) {
  const room = getRoom(code)
  const member = touchMember(room, memberId)
  const target = getMember(room, targetId)
  if (!canModerate(member)) throw createError({ statusCode: 403, statusMessage: 'Only the host or a moderator can remove listeners.' })
  if (target.id === room.hostId || target.id === member.id) {
    throw createError({ statusCode: 403, statusMessage: 'You cannot remove the host or yourself.' })
  }
  if (member.role === 'moderator' && target.role !== 'member') {
    throw createError({ statusCode: 403, statusMessage: 'Moderators can only remove regular members.' })
  }
  room.members = room.members.filter((item) => item.id !== targetId)
  addActivity(room, `${target.name} was removed from the room.`)
  return snapshot(room)
}

function updatePlayback(code: string, memberId: string, action: string, value?: unknown) {
  const room = getRoom(code)
  const member = touchMember(room, memberId)
  if (!canModerate(member)) throw createError({ statusCode: 403, statusMessage: 'Only the host or a moderator can control playback.' })
  const now = Date.now()
  const previousPosition = currentPosition(room, now)
  const nextTrack = () => {
    if (room.playback.repeat === 'one' && room.currentTrack) {
      room.playback.positionMs = 0
      room.playback.startedAt = room.playback.playing ? now : null
      return
    }
    if (!room.queue.length && room.playback.repeat === 'all' && room.previousTracks.length) {
      room.queue = room.previousTracks.splice(0).map((track) => ({
        ...track,
        addedBy: room.hostId,
        addedByName: room.members.find((item) => item.id === room.hostId)?.name || 'Host',
      }))
    }
    if (!room.queue.length) {
      room.playback.playing = false
      room.playback.positionMs = 0
      room.playback.startedAt = null
      return
    }
    let index = 0
    if (room.playback.shuffle) index = Math.floor(Math.random() * room.queue.length)
    const [queued] = room.queue.splice(index, 1)
    if (room.currentTrack) room.previousTracks.push(room.currentTrack)
    room.currentTrack = {
      id: queued.id,
      title: queued.title,
      artist: queued.artist,
      cover: queued.cover,
      durationMs: queued.durationMs,
      ...(queued.audioUrl ? { audioUrl: queued.audioUrl } : {}),
    }
    room.playback.positionMs = 0
    room.playback.playing = true
    room.playback.startedAt = now
    addActivity(room, `Now playing ${queued.title} by ${queued.artist}.`)
  }

  if (action === 'play') {
    if (!room.currentTrack) {
      if (!room.queue.length) throw createError({ statusCode: 409, statusMessage: 'The queue is empty. Add a song before pressing play.' })
      nextTrack()
    } else if (!room.playback.playing) {
      room.playback.positionMs = previousPosition >= (room.currentTrack.durationMs || 0) ? 0 : previousPosition
      room.playback.playing = true
      room.playback.startedAt = now
    }
  } else if (action === 'pause') {
    room.playback.positionMs = previousPosition
    room.playback.playing = false
    room.playback.startedAt = null
  } else if (action === 'next') {
    nextTrack()
  } else if (action === 'previous') {
    const previous = room.previousTracks.pop()
    if (previous) {
      if (room.currentTrack) room.queue.unshift({ ...room.currentTrack, addedBy: member.id, addedByName: member.name })
      room.currentTrack = previous
      room.playback.positionMs = 0
      room.playback.playing = true
      room.playback.startedAt = now
      addActivity(room, `Back to ${previous.title} by ${previous.artist}.`)
    } else {
      room.playback.positionMs = 0
      room.playback.startedAt = room.playback.playing ? now : null
    }
  } else if (action === 'seek') {
    const position = Number(value)
    if (!Number.isFinite(position)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid playback position.' })
    room.playback.positionMs = Math.min(room.currentTrack?.durationMs || 0, Math.max(0, position))
    room.playback.startedAt = room.playback.playing ? now : null
  } else if (action === 'shuffle') {
    room.playback.shuffle = !room.playback.shuffle
  } else if (action === 'repeat') {
    room.playback.repeat = room.playback.repeat === 'off' ? 'all' : room.playback.repeat === 'all' ? 'one' : 'off'
  } else if (action === 'volume') {
    const volume = Number(value)
    if (!Number.isFinite(volume)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid volume.' })
    room.playback.volume = Math.min(100, Math.max(0, volume))
  } else if (action === 'duration') {
    const duration = Number(value)
    if (!room.currentTrack?.audioUrl || !Number.isFinite(duration) || duration < 1_000) {
      throw createError({ statusCode: 400, statusMessage: 'Choose a valid duration for the current local audio track.' })
    }
    room.currentTrack.durationMs = Math.min(3_600_000, Math.round(duration))
    room.playback.positionMs = Math.min(previousPosition, room.currentTrack.durationMs)
    room.playback.startedAt = room.playback.playing ? now : null
  } else {
    throw createError({ statusCode: 404, statusMessage: 'That playback action is not supported.' })
  }
  room.updatedAt = now
  return snapshot(room)
}

function addQueueItem(code: string, memberId: string, payload: Record<string, unknown>) {
  const room = getRoom(code)
  const member = touchMember(room, memberId)
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const artist = typeof payload.artist === 'string' ? payload.artist.trim() : ''
  if (!title || !artist) throw createError({ statusCode: 400, statusMessage: 'Choose a song with a title and artist.' })
  if (typeof payload.audioUrl !== 'string' || !payload.audioUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a song with verified local audio before adding it to the room.' })
  }
  if (room.queue.length >= 100) throw createError({ statusCode: 409, statusMessage: 'The room queue is full.' })
  const requestId = typeof payload.requestId === 'string' ? payload.requestId : undefined
  if (requestId && room.queue.some((item) => item.requestId === requestId)) return snapshot(room)
  const track = makeTrack({
    id: typeof payload.id === 'string' ? payload.id : undefined,
    title,
    artist,
    cover: typeof payload.cover === 'string' ? payload.cover : '',
    durationMs: Number(payload.durationMs),
    audioUrl: typeof payload.audioUrl === 'string' ? payload.audioUrl : undefined,
  })
  if (room.queue.some((item) => item.id === track.id) || room.currentTrack?.id === track.id) {
    throw createError({ statusCode: 409, statusMessage: 'That track is already in the room.' })
  }
  room.queue.push({ ...track, addedBy: member.id, addedByName: member.name, requestId })
  addActivity(room, `${member.name} added ${track.title} to the queue.`)
  return snapshot(room)
}

function removeQueueItem(code: string, memberId: string, itemId: string) {
  const room = getRoom(code)
  const member = touchMember(room, memberId)
  const index = room.queue.findIndex((item) => item.id === itemId)
  if (index === -1) throw createError({ statusCode: 404, statusMessage: 'That song is no longer in the queue.' })
  const item = room.queue[index]
  if (!canModerate(member) && item.addedBy !== member.id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only remove songs you added.' })
  }
  room.queue.splice(index, 1)
  addActivity(room, `${member.name} removed ${item.title} from the queue.`)
  return snapshot(room)
}

function reorderQueue(code: string, memberId: string, itemId: string, direction: number) {
  const room = getRoom(code)
  const member = touchMember(room, memberId)
  if (!canModerate(member)) throw createError({ statusCode: 403, statusMessage: 'Only the host or a moderator can reorder the queue.' })
  const from = room.queue.findIndex((item) => item.id === itemId)
  const to = from + Math.sign(direction)
  if (from === -1 || to < 0 || to >= room.queue.length) return snapshot(room)
  const [item] = room.queue.splice(from, 1)
  room.queue.splice(to, 0, item)
  addActivity(room, `${member.name} reordered the queue.`)
  return snapshot(room)
}

function sendMessage(code: string, memberId: string, payload: Record<string, unknown>) {
  const room = getRoom(code)
  const member = touchMember(room, memberId)
  const text = typeof payload.text === 'string' ? payload.text.trim() : ''
  if (!text || text.length > 500) throw createError({ statusCode: 400, statusMessage: 'Messages must be between 1 and 500 characters.' })
  const clientId = typeof payload.clientId === 'string' ? payload.clientId : undefined
  const duplicate = clientId && room.messages.find((message) => message.clientId === clientId)
  if (duplicate) return snapshot(room)
  const trackPayload = payload.track && typeof payload.track === 'object' ? payload.track as Record<string, unknown> : null
  const message: RoomMessage = {
    id: randomUUID(),
    clientId,
    memberId,
    memberName: member.name,
    text,
    track: trackPayload && typeof trackPayload.title === 'string' && typeof trackPayload.artist === 'string'
      ? makeTrack({
          id: typeof trackPayload.id === 'string' ? trackPayload.id : undefined,
          title: trackPayload.title,
          artist: trackPayload.artist,
          cover: typeof trackPayload.cover === 'string' ? trackPayload.cover : '',
          durationMs: Number(trackPayload.durationMs),
        })
      : undefined,
    reactions: {},
    createdAt: Date.now(),
  }
  room.messages.push(message)
  room.messages = room.messages.slice(-300)
  addActivity(room, message.track ? `${member.name} shared ${message.track.title}.` : `${member.name} sent a message.`)
  return snapshot(room)
}

function toggleMessageReaction(code: string, memberId: string, messageId: string, emoji: string) {
  const room = getRoom(code)
  const member = touchMember(room, memberId)
  if (!reactions.includes(emoji)) throw createError({ statusCode: 400, statusMessage: 'That reaction is not available.' })
  const message = room.messages.find((item) => item.id === messageId)
  if (!message) throw createError({ statusCode: 404, statusMessage: 'That message is no longer available.' })
  const users = message.reactions[emoji] || []
  message.reactions[emoji] = users.includes(member.id)
    ? users.filter((id) => id !== member.id)
    : [...users, member.id]
  if (!message.reactions[emoji].length) delete message.reactions[emoji]
  addActivity(room, `${member.name} reacted ${emoji}.`)
  return snapshot(room)
}

function manageRoom(code: string, memberId: string, action: string, payload: Record<string, unknown>) {
  const room = getRoom(code)
  const member = touchMember(room, memberId)
  if (action === 'lock') {
    if (member.id !== room.hostId) throw createError({ statusCode: 403, statusMessage: 'Only the host can change room privacy.' })
    room.locked = !room.locked
    addActivity(room, room.locked ? 'The host locked the room.' : 'The host opened the room.')
  } else if (action === 'moderator') {
    if (member.id !== room.hostId) throw createError({ statusCode: 403, statusMessage: 'Only the host can assign moderators.' })
    const target = room.members.find((item) => item.id === payload.targetId)
    if (!target || target.id === room.hostId) throw createError({ statusCode: 404, statusMessage: 'Choose a room member to update.' })
    target.role = target.role === 'moderator' ? 'member' : 'moderator'
    addActivity(room, `${target.name} is ${target.role === 'moderator' ? 'now a moderator' : 'no longer a moderator'}.`)
  } else if (action === 'transfer') {
    if (member.id !== room.hostId) throw createError({ statusCode: 403, statusMessage: 'Only the host can transfer ownership.' })
    const target = room.members.find((item) => item.id === payload.targetId)
    if (!target || target.id === room.hostId) throw createError({ statusCode: 404, statusMessage: 'Choose another room member.' })
    member.role = 'member'
    target.role = 'host'
    room.hostId = target.id
    addActivity(room, `${target.name} is now hosting the room.`)
  } else if (action === 'end') {
    if (member.id !== room.hostId) throw createError({ statusCode: 403, statusMessage: 'Only the host can end this room.' })
    room.ended = true
    rooms.delete(room.code)
    return { ended: true }
  } else {
    throw createError({ statusCode: 404, statusMessage: 'That room action is not supported.' })
  }
  return snapshot(room)
}

export {
  addQueueItem,
  createRoom,
  getMember,
  getRoom,
  joinRoom,
  leaveRoom,
  manageRoom,
  removeMember,
  removeQueueItem,
  reorderQueue,
  sendMessage,
  snapshot,
  toggleMessageReaction,
  touchMember,
  updatePlayback,
}
