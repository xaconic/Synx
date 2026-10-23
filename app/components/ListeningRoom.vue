<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  profileName: { type: String, required: true },
  isGuest: { type: Boolean, default: false },
})
const emit = defineEmits(['require-account'])

const room = ref(null)
const memberId = ref('')
const codeInput = ref('0042')
const roomNameInput = ref('The Midnight Crew')
const makePrivate = ref(false)
const loading = ref(false)
const searching = ref(false)
const connected = ref(false)
const notice = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const activePanel = ref('queue')
const chatDraft = ref('')
const sendingMessage = ref(false)
const songQuery = ref('')
const songResults = ref([])
const songSearchError = ref('')
const playbackPosition = ref(0)
const chatList = ref(null)
const expandedSettings = ref(false)
const draggedQueueId = ref('')
const endedBySelf = ref(false)

let pollTimer
let playbackTimer
let noticeTimer
let completedPlaybackTrackId = ''

const currentMember = computed(() => room.value?.members.find((member) => member.id === memberId.value))
const isHost = computed(() => currentMember.value?.role === 'host')
const canModerate = computed(() => !props.isGuest && ['host', 'moderator'].includes(currentMember.value?.role))
const isOnline = computed(() => room.value?.members.filter((member) => member.online).length || 0)
const trackDuration = computed(() => room.value?.currentTrack?.durationMs || 0)
const progressPercent = computed(() => trackDuration.value ? Math.min(100, (playbackPosition.value / trackDuration.value) * 100) : 0)
const repeatLabel = computed(() => room.value?.playback.repeat === 'one' ? 'REPEAT ONE' : room.value?.playback.repeat === 'all' ? 'REPEAT ALL' : 'REPEAT OFF')

function formatTime(milliseconds) {
  const seconds = Math.floor(Math.max(0, milliseconds || 0) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function displayTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function setNotice(message, kind = 'success') {
  clearTimeout(noticeTimer)
  notice.value = message
  if (kind === 'error') errorMessage.value = message
  else successMessage.value = message
  noticeTimer = setTimeout(() => {
    notice.value = ''
    errorMessage.value = ''
    successMessage.value = ''
  }, 3600)
}

function explainError(error, fallback) {
  return error?.data?.statusMessage || error?.statusMessage || fallback
}

function randomId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

function saveRoomCode(code) {
  try {
    localStorage.setItem('synx-listening-room', code)
  } catch {
    setNotice('Room joined, but this browser could not save the reconnect code.', 'error')
  }
}

function clearSavedRoom() {
  try {
    localStorage.removeItem('synx-listening-room')
  } catch {
    setNotice('You left the room, but the saved reconnect code could not be cleared.', 'error')
  }
}

function applyRoomState(nextRoom) {
  room.value = nextRoom
  playbackPosition.value = nextRoom.playback.positionMs || 0
  connected.value = true
}

function removeRoomInviteFromAddress() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('room')) return
  url.searchParams.delete('room')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

async function requestRoomSnapshot(showError = false) {
  if (!room.value || !memberId.value) return
  try {
    const nextRoom = await $fetch(`/api/rooms/${encodeURIComponent(room.value.code)}`, {
      query: { memberId: memberId.value },
    })
    applyRoomState(nextRoom)
  } catch (error) {
    connected.value = false
    if ([403, 404].includes(error?.statusCode || error?.status)) {
      room.value = null
      clearSavedRoom()
      setNotice(explainError(error, 'You are no longer a member of this room.'), 'error')
      return
    }
    if (showError) setNotice(explainError(error, 'Could not reconnect to the room.'), 'error')
  }
}

async function joinRoom(code = codeInput.value) {
  const normalizedCode = code.trim().toUpperCase()
  if (!normalizedCode) {
    setNotice('Enter a room code to join.', 'error')
    return
  }
  loading.value = true
  try {
    const nextRoom = await $fetch(`/api/rooms/${encodeURIComponent(normalizedCode)}/join`, {
      method: 'POST',
      body: { memberId: memberId.value, memberName: props.profileName },
    })
    applyRoomState(nextRoom)
    codeInput.value = nextRoom.code
    saveRoomCode(nextRoom.code)
    removeRoomInviteFromAddress()
    setNotice(`Joined ${nextRoom.name}.`)
  } catch (error) {
    setNotice(explainError(error, 'Could not join that room.'), 'error')
  } finally {
    loading.value = false
  }
}

async function createRoom() {
  if (props.isGuest) {
    emit('require-account', 'create_room')
    return
  }
  loading.value = true
  try {
    const nextRoom = await $fetch('/api/rooms', {
      method: 'POST',
      body: {
        memberId: memberId.value,
        memberName: props.profileName,
        name: roomNameInput.value,
        isPrivate: makePrivate.value,
      },
    })
    applyRoomState(nextRoom)
    codeInput.value = nextRoom.code
    saveRoomCode(nextRoom.code)
    setNotice('Your listening room is ready.')
  } catch (error) {
    setNotice(explainError(error, 'Could not create the room.'), 'error')
  } finally {
    loading.value = false
  }
}

async function postAction(action, data = {}) {
  if (!room.value) return null
  loading.value = true
  try {
    const result = action === 'queue'
      ? await $fetch(`/api/rooms/${encodeURIComponent(room.value.code)}/queue`, {
          method: 'POST',
          body: { memberId: memberId.value, memberName: props.profileName, ...data },
        })
      : await $fetch(`/api/rooms/${encodeURIComponent(room.value.code)}/${action}`, {
          method: 'POST',
          body: { memberId: memberId.value, memberName: props.profileName, ...data },
        })
    if (result?.ended) {
      room.value = null
      clearSavedRoom()
      endedBySelf.value = true
      setNotice('The room has ended.')
      return result
    }
    if (result?.left) {
      room.value = null
      clearSavedRoom()
      setNotice('You left the listening room.')
      return result
    }
    applyRoomState(result)
    return result
  } catch (error) {
    setNotice(explainError(error, 'That room action could not be completed.'), 'error')
    return null
  } finally {
    loading.value = false
  }
}

async function leaveRoom() {
  await postAction('leave')
}

async function inviteFriends() {
  if (!room.value) return
  const inviteUrl = new URL(window.location.href)
  inviteUrl.searchParams.set('room', room.value.code)
  try {
    await navigator.clipboard.writeText(inviteUrl.toString())
    setNotice('Room invite link copied.')
  } catch {
    setNotice(`Share room code ${room.value.code} with your friends.`, 'error')
  }
}

async function controlPlayback(action, value) {
  if (!room.value) return
  if (!canModerate.value) {
    if (props.isGuest && ['host', 'moderator'].includes(currentMember.value?.role)) emit('require-account', 'room_host_controls')
    return
  }
  loading.value = true
  try {
    const result = await $fetch(`/api/rooms/${encodeURIComponent(room.value.code)}/playback`, {
      method: 'PATCH',
      body: { memberId: memberId.value, action, value },
    })
    applyRoomState(result)
  } catch (error) {
    setNotice(explainError(error, 'Playback could not be updated.'), 'error')
  } finally {
    loading.value = false
  }
}

async function searchSongs() {
  const query = songQuery.value.trim()
  if (!query) {
    setNotice('Search for a song or artist first.', 'error')
    return
  }
  searching.value = true
  songSearchError.value = ''
  songResults.value = []
  try {
    const result = await $fetch('/api/spotify/search', { query: { q: query } })
    songResults.value = result.tracks.map((track) => ({
      ...track,
      cover: track.artwork,
      durationMs: durationFromString(track.duration),
    }))
    if (!songResults.value.length) songSearchError.value = 'No tracks found. Try another search.'
  } catch (error) {
    songSearchError.value = explainError(error, 'Spotify song search is unavailable.')
  } finally {
    searching.value = false
  }
}

function durationFromString(value) {
  const [minutes, seconds] = String(value || '3:30').split(':').map(Number)
  return ((minutes || 0) * 60 + (seconds || 0)) * 1000
}

async function addSong(track) {
  const requestId = randomId('queue')
  const result = await postAction('queue', {
    ...track,
    requestId,
  })
  if (result) setNotice(`${track.title} added to the queue.`)
}

async function removeSong(item) {
  if (!room.value) return
  loading.value = true
  try {
    const result = await $fetch(`/api/rooms/${encodeURIComponent(room.value.code)}/queue/${encodeURIComponent(item.id)}`, {
      method: 'DELETE',
      query: { memberId: memberId.value },
    })
    applyRoomState(result)
    setNotice(`${item.title} removed from the queue.`)
  } catch (error) {
    setNotice(explainError(error, 'Could not remove that song.'), 'error')
  } finally {
    loading.value = false
  }
}

async function reorderSong(itemId, direction) {
  if (!room.value) return
  try {
    const result = await $fetch(`/api/rooms/${encodeURIComponent(room.value.code)}/queue`, {
      method: 'PATCH',
      body: { memberId: memberId.value, itemId, direction },
    })
    applyRoomState(result)
  } catch (error) {
    setNotice(explainError(error, 'Could not reorder the queue.'), 'error')
  }
}

function startQueueDrag(itemId) {
  if (canModerate.value) draggedQueueId.value = itemId
}

async function dropQueueItem(targetId) {
  if (!room.value || !draggedQueueId.value || draggedQueueId.value === targetId) return
  const draggedId = draggedQueueId.value
  const from = room.value.queue.findIndex((item) => item.id === draggedId)
  const to = room.value.queue.findIndex((item) => item.id === targetId)
  if (from < 0 || to < 0) return
  const direction = to > from ? 1 : -1
  for (let move = from; move !== to; move += direction) {
    await reorderSong(draggedId, direction)
  }
  draggedQueueId.value = ''
}

async function sendRoomMessage(track = null) {
  if (sendingMessage.value) return
  const text = chatDraft.value.trim() || (track ? `Listening to ${track.title} by ${track.artist}.` : '')
  if (!text) return
  sendingMessage.value = true
  try {
    const result = await postAction('chat', {
      text,
      clientId: randomId('message'),
      track,
    })
    if (result) {
      chatDraft.value = ''
      await scrollChatToLatest()
    }
  } finally {
    sendingMessage.value = false
  }
}

async function reactToMessage(message, emoji) {
  await postAction('reaction', { messageId: message.id, emoji })
}

async function manageMember(action, member) {
  if (props.isGuest) {
    emit('require-account', 'room_host_controls')
    return
  }
  const message = action === 'transfer'
    ? `Transfer room ownership to ${member.name}? You will become a member.`
    : `${member.role === 'moderator' ? 'Remove moderator access from' : 'Make'} ${member.name} ${member.role === 'moderator' ? '?' : 'a moderator?'}`
  if (!window.confirm(message)) return
  const result = await postAction(action, { targetId: member.id })
  if (result) setNotice(action === 'transfer' ? `Host transferred to ${member.name}.` : 'Member permissions updated.')
}

async function kickMember(member) {
  if (props.isGuest) {
    emit('require-account', 'room_host_controls')
    return
  }
  if (!window.confirm(`Remove ${member.name} from this room?`)) return
  const result = await postAction('kick', { targetId: member.id })
  if (result) setNotice(`${member.name} was removed from the room.`)
}

async function toggleLock() {
  if (props.isGuest) {
    emit('require-account', 'room_host_controls')
    return
  }
  const result = await postAction('lock')
  if (result) setNotice(result.locked ? 'Room locked. New members cannot join.' : 'Room unlocked.')
}

async function endRoom() {
  if (props.isGuest) {
    emit('require-account', 'room_host_controls')
    return
  }
  if (!window.confirm('End this room for everyone? This action cannot be undone.')) return
  await postAction('end')
}

async function scrollChatToLatest() {
  await nextTick()
  if (chatList.value) chatList.value.scrollTop = chatList.value.scrollHeight
}

watch(() => room.value?.messages.length, (length, previousLength) => {
  if (length && length !== previousLength) scrollChatToLatest()
})

onMounted(async () => {
  try {
    memberId.value = localStorage.getItem('synx-room-member-id') || randomId('listener')
    localStorage.setItem('synx-room-member-id', memberId.value)
  } catch {
    memberId.value = randomId('listener')
  }

  const params = new URLSearchParams(window.location.search)
  let rememberedCode = params.get('room')
  if (!rememberedCode) {
    try {
      rememberedCode = localStorage.getItem('synx-listening-room')
    } catch {
      rememberedCode = null
    }
  }
  if (rememberedCode) await joinRoom(rememberedCode)

  pollTimer = window.setInterval(() => requestRoomSnapshot(), 2500)
  playbackTimer = window.setInterval(() => {
    if (!room.value?.playback.playing) return
    if (playbackPosition.value < trackDuration.value) {
      playbackPosition.value = Math.min(trackDuration.value, playbackPosition.value + 1000)
      return
    }
    const trackId = room.value.currentTrack?.id
    if (trackId && completedPlaybackTrackId !== trackId) {
      completedPlaybackTrackId = trackId
      controlPlayback('next')
    }
  }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(pollTimer)
  clearInterval(playbackTimer)
  clearTimeout(noticeTimer)
})
</script>

<template>
  <section class="page-heading listening-heading">
    <span class="section-index">SYNX / 05</span>
    <h1>LISTEN<br><em>IN GOOD COMPANY.</em></h1>
    <p>One room. One queue. Everyone on the same wavelength.</p>
  </section>

  <section v-if="!room" class="room-lobby" aria-labelledby="room-lobby-title">
    <div class="lobby-intro">
      <span class="section-index">SHARED FREQUENCY / ROOM SYSTEM</span>
      <h2 id="room-lobby-title">Find your <em>people.</em></h2>
      <p>Join a room with a code, or open a new listening space for your crew.</p>
      <p v-if="endedBySelf" class="room-ended-note">That room has ended. Start a new one or join another room.</p>
    </div>
    <div class="lobby-actions">
      <form class="room-card join-card" @submit.prevent="joinRoom()">
        <span class="room-card-index">01 / JOIN A ROOM</span>
        <label for="room-code">INVITE CODE</label>
        <div class="room-code-row">
          <input id="room-code" v-model="codeInput" maxlength="12" placeholder="e.g. 0042" autocomplete="off" />
          <button class="room-primary-button" type="submit" :disabled="loading">JOIN <span>↗</span></button>
        </div>
        <p>Got a link? Open it in this browser to join by invite.</p>
      </form>
      <form class="room-card create-card" @submit.prevent="createRoom">
        <span class="room-card-index">02 / START A NEW ROOM</span>
        <label for="new-room-name">ROOM NAME</label>
        <input id="new-room-name" v-model="roomNameInput" maxlength="60" placeholder="A New Frequency" />
        <label class="privacy-choice"><input v-model="makePrivate" type="checkbox" /> Invite code only</label>
        <button class="room-primary-button create-room-button" type="submit" :disabled="loading">CREATE ROOM <span>↗</span></button>
      </form>
    </div>
    <p class="prototype-note"><span class="live-dot"></span> Prototype room service · State lasts while the server is running · Audio is not streamed</p>
  </section>

  <section v-else class="listening-room" :aria-label="`${room.name} listening room`">
    <div v-if="!connected" class="room-connection-banner" role="status">
      <span>CONNECTION INTERRUPTED · TRYING TO REJOIN</span>
      <button type="button" @click="requestRoomSnapshot(true)">RECONNECT ↻</button>
    </div>
    <header class="room-header">
      <div class="room-identity">
        <div class="room-cover-mark" aria-hidden="true">S<span>✳</span></div>
        <div class="room-heading-copy">
          <span class="room-eyebrow"><i :class="{ 'offline-dot': !connected }"></i> {{ room.isPrivate ? 'INVITE ROOM' : 'OPEN ROOM' }} <span>//</span> CODE {{ room.code }}</span>
          <h2>{{ room.name }}</h2>
          <div class="room-host-line">HOSTED BY <strong>{{ room.members.find((member) => member.id === room.hostId)?.name || 'Listener' }}</strong> <span>·</span> {{ isOnline }} LISTENING</div>
        </div>
      </div>
      <div class="room-header-actions">
        <span class="room-presence-pill"><i></i>{{ connected ? 'CONNECTED' : 'RECONNECTING' }}</span>
        <button type="button" class="room-outline-button" @click="inviteFriends">INVITE <span>↗</span></button>
        <button type="button" class="room-outline-button settings-trigger" :aria-expanded="expandedSettings" @click="expandedSettings = !expandedSettings">ROOM SETTINGS <span>⌄</span></button>
        <div v-if="expandedSettings" class="room-settings-menu">
          <p>{{ room.locked ? 'ROOM LOCKED' : 'ROOM OPEN' }} · {{ room.isPrivate ? 'INVITE ONLY' : 'CODE ACCESS' }}</p>
          <button v-if="isHost && !isGuest" type="button" @click="toggleLock">{{ room.locked ? 'UNLOCK ROOM' : 'LOCK ROOM' }}</button>
          <button v-if="isHost && isGuest" type="button" @click="emit('require-account', 'room_host_controls')">SIGN IN FOR HOST TOOLS</button>
          <button type="button" @click="leaveRoom">LEAVE ROOM</button>
          <button v-if="isHost && !isGuest" type="button" class="danger-action" @click="endRoom">END FOR EVERYONE…</button>
        </div>
      </div>
    </header>

    <div class="room-sync-banner" role="status">
      <span class="sync-wave">♫</span>
      <span><strong>ROOM STATE SYNCED</strong><small>Track controls and queue update for every connected browser.</small></span>
      <span class="audio-prototype-label">DEMO STATE · NO AUDIO STREAM</span>
    </div>

    <div class="room-workspace">
      <main class="room-main-column">
        <section class="room-player-card" aria-labelledby="now-playing-title">
          <div class="room-player-art">
            <img v-if="room.currentTrack?.cover" :src="room.currentTrack.cover" :alt="`Artwork for ${room.currentTrack.title}`" />
            <div v-else class="room-art-empty" aria-hidden="true">S<span>✳</span></div>
            <div class="art-shade"></div>
            <span class="art-kicker"><i class="live-dot"></i> NOW PLAYING IN THE ROOM</span>
            <div class="art-track-copy">
              <span>{{ room.currentTrack?.artist || 'THE QUEUE IS READY' }}</span>
              <h3 id="now-playing-title">{{ room.currentTrack?.title || 'Choose the first song.' }}</h3>
            </div>
            <div v-if="room.playback.playing" class="record-mark" aria-hidden="true">S<span>✳</span></div>
          </div>
          <div class="player-meta-row">
            <div class="track-title-block">
              <span class="section-index">THE SHARED FREQUENCY</span>
              <strong>{{ room.currentTrack?.title || 'Nothing playing yet' }}</strong>
              <span>{{ room.currentTrack?.artist || 'Add a track to get started' }}</span>
            </div>
            <span class="playback-state" :class="{ playing: room.playback.playing }"><i></i>{{ room.playback.playing ? 'PLAYING' : 'PAUSED' }}</span>
          </div>
          <div class="timeline-control">
            <input
              aria-label="Seek through the current track"
              type="range"
              min="0"
              :max="trackDuration || 1"
              :value="playbackPosition"
              :style="{ '--progress': `${progressPercent}%` }"
              :disabled="!trackDuration || !canModerate"
              @change="controlPlayback('seek', Number($event.target.value))"
            />
            <div class="track-time"><span>{{ formatTime(playbackPosition) }}</span><span>{{ formatTime(trackDuration) }}</span></div>
          </div>
          <div class="playback-toolbar" :class="{ 'controls-disabled': !canModerate }">
            <button type="button" class="transport-toggle" :aria-label="room.playback.shuffle ? 'Disable shuffle' : 'Enable shuffle'" :aria-pressed="room.playback.shuffle" :disabled="!canModerate" @click="controlPlayback('shuffle')">⤨</button>
            <button type="button" class="transport-button" aria-label="Previous track" :disabled="!canModerate" @click="controlPlayback('previous')">|◀</button>
            <button type="button" class="transport-play" :aria-label="room.playback.playing ? 'Pause playback' : 'Start playback'" :disabled="!canModerate" @click="controlPlayback(room.playback.playing ? 'pause' : 'play')">{{ room.playback.playing ? 'Ⅱ' : '▶' }}</button>
            <button type="button" class="transport-button" aria-label="Next track" :disabled="!canModerate" @click="controlPlayback('next')">▶|</button>
            <button type="button" class="transport-toggle repeat-toggle" :aria-label="repeatLabel" :aria-pressed="room.playback.repeat !== 'off'" :disabled="!canModerate" @click="controlPlayback('repeat')"><span>↻</span><small>{{ room.playback.repeat === 'one' ? '1' : '' }}</small></button>
            <div class="volume-control"><span aria-hidden="true">◖))</span><input aria-label="Room playback volume" type="range" min="0" max="100" :value="room.playback.volume" @input="controlPlayback('volume', Number($event.target.value))" :disabled="!canModerate" /></div>
          </div>
          <p v-if="!canModerate" class="permission-hint">
            {{ isGuest && ['host', 'moderator'].includes(currentMember?.role) ? 'Sign in to use host and moderator playback controls.' : 'Only the host and moderators can control playback.' }}
            <button v-if="isGuest && ['host', 'moderator'].includes(currentMember?.role)" type="button" @click="emit('require-account', 'room_host_controls')">SIGN IN</button>
          </p>
        </section>

        <section class="room-chat-card" aria-labelledby="room-chat-title">
          <div class="panel-heading chat-panel-heading">
            <div><span class="section-index">THE ROOM, IN REAL TIME</span><h3 id="room-chat-title">Listening notes <span>{{ room.messages.length }}</span></h3></div>
            <span class="chat-live-indicator"><i></i> LIVE</span>
          </div>
          <div ref="chatList" class="room-message-list" role="log" aria-live="polite" aria-relevant="additions">
            <p v-if="!room.messages.length" class="empty-room-state">No messages yet. Share the first thought or send the current track.</p>
            <article v-for="message in room.messages" :key="message.id" class="room-message" :class="{ 'own-message': message.memberId === memberId }">
              <div class="message-byline"><strong>{{ message.memberName }}</strong><time :datetime="new Date(message.createdAt).toISOString()">{{ displayTime(message.createdAt) }}</time></div>
              <p>{{ message.text }}</p>
              <div v-if="message.track" class="shared-song-chip"><span>♫</span><div><strong>{{ message.track.title }}</strong><small>{{ message.track.artist }}</small></div></div>
              <div class="message-reactions">
                <button v-for="emoji in ['❤️', '🔥', '🎵', '😂', '👀']" :key="emoji" type="button" :aria-label="`React ${emoji} to ${message.memberName}'s message`" :aria-pressed="message.reactions[emoji]?.includes(memberId) || false" @click="reactToMessage(message, emoji)">
                  {{ emoji }} <span v-if="message.reactions[emoji]?.length">{{ message.reactions[emoji].length }}</span>
                </button>
              </div>
            </article>
          </div>
          <form class="room-composer" @submit.prevent="sendRoomMessage()">
            <input v-model="chatDraft" maxlength="500" aria-label="Write a room message" placeholder="Leave a note for the room..." />
            <button type="button" class="composer-share" :disabled="!room.currentTrack || sendingMessage" aria-label="Share the current song to chat" @click="sendRoomMessage(room.currentTrack)">♫</button>
            <button class="room-send-button" type="submit" :disabled="!chatDraft.trim() || sendingMessage">SEND <span>↗</span></button>
          </form>
        </section>
      </main>

      <aside class="room-side-column">
        <section class="room-side-panel" aria-label="Room queue, members, and activity">
          <div class="room-panel-tabs" role="tablist" aria-label="Room panels">
            <button v-for="tab in [{ id: 'queue', label: 'QUEUE' }, { id: 'members', label: 'PEOPLE' }, { id: 'activity', label: 'ACTIVITY' }]" :key="tab.id" type="button" role="tab" :aria-selected="activePanel === tab.id" :class="{ selected: activePanel === tab.id }" @click="activePanel = tab.id">{{ tab.label }}<span v-if="tab.id === 'queue'">{{ room.queue.length }}</span><span v-else-if="tab.id === 'members'">{{ isOnline }}</span></button>
          </div>

          <div v-if="activePanel === 'queue'" class="queue-panel" role="tabpanel">
            <div class="panel-heading queue-heading"><div><span class="section-index">UP NEXT</span><h3>Room queue</h3></div><span class="queue-count">{{ room.queue.length }} TRACKS</span></div>
            <form class="song-search-form" @submit.prevent="searchSongs">
              <label class="visually-hidden" for="room-song-search">Search Spotify for a song</label>
              <input id="room-song-search" v-model="songQuery" placeholder="Find a song or artist..." />
              <button type="submit" :disabled="searching">{{ searching ? '…' : 'SEARCH' }}</button>
            </form>
            <p v-if="songSearchError" class="search-feedback" role="status">{{ songSearchError }}</p>
            <div v-if="songResults.length" class="song-search-results">
              <article v-for="song in songResults" :key="song.id" class="song-result-row">
                <img v-if="song.cover" :src="song.cover" alt="" />
                <div class="search-result-copy"><strong>{{ song.title }}</strong><span>{{ song.artist }}</span></div>
                <button type="button" :aria-label="`Add ${song.title} to the queue`" @click="addSong(song)">+</button>
              </article>
            </div>
            <div v-if="room.queue.length" class="queue-list" aria-label="Upcoming songs">
              <article
                v-for="(item, index) in room.queue"
                :key="item.id"
                class="queue-row"
                :class="{ draggable: canModerate, dragging: draggedQueueId === item.id }"
                :draggable="canModerate"
                @dragstart="startQueueDrag(item.id)"
                @dragover.prevent
                @drop.prevent="dropQueueItem(item.id)"
                @dragend="draggedQueueId = ''"
              >
                <span class="queue-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <img v-if="item.cover" :src="item.cover" alt="" />
                <span v-else class="queue-art-fallback">♫</span>
                <div class="queue-track-copy"><strong>{{ item.title }}</strong><span>{{ item.artist }}</span><small>ADDED BY {{ item.addedByName }}</small></div>
                <div class="queue-item-actions">
                  <button v-if="canModerate" type="button" :aria-label="`Move ${item.title} up`" :disabled="index === 0" @click="reorderSong(item.id, -1)">↑</button>
                  <button v-if="canModerate" type="button" :aria-label="`Move ${item.title} down`" :disabled="index === room.queue.length - 1" @click="reorderSong(item.id, 1)">↓</button>
                  <button v-if="canModerate || item.addedBy === memberId" type="button" :aria-label="`Remove ${item.title} from queue`" @click="removeSong(item)">×</button>
                </div>
              </article>
            </div>
            <div v-else-if="!songResults.length" class="queue-empty-state"><span>♫</span><strong>The queue is open.</strong><p>Search above and add a track to choose what comes next.</p></div>
            <p class="panel-permission-note">{{ canModerate ? 'Drag songs or use arrows to reorder.' : 'You can remove songs you added. Hosts and moderators manage order.' }}</p>
          </div>

          <div v-else-if="activePanel === 'members'" class="members-panel" role="tabpanel">
            <div class="panel-heading"><div><span class="section-index">IN THE SAME ROOM</span><h3>Listeners <span>{{ isOnline }}</span></h3></div><span class="members-live"><i></i> LIVE</span></div>
            <div v-for="member in room.members" :key="member.id" class="member-row">
              <span class="member-avatar" :class="{ 'avatar-offline': !member.online }">{{ member.name.charAt(0).toUpperCase() }}</span>
              <div class="member-copy"><strong>{{ member.name }} <small v-if="member.id === memberId">YOU</small></strong><span>{{ member.online ? 'LISTENING NOW' : 'RECONNECTING…' }}</span></div>
              <span class="member-role" :class="`role-${member.role}`">{{ member.role }}</span>
              <div v-if="isHost && !isGuest && member.id !== memberId" class="member-manage">
                <button type="button" :aria-label="`${member.role === 'moderator' ? 'Remove moderator' : 'Make moderator'} ${member.name}`" @click="manageMember('moderator', member)">{{ member.role === 'moderator' ? '−M' : '+M' }}</button>
                <button type="button" :aria-label="`Transfer host to ${member.name}`" @click="manageMember('transfer', member)">★</button>
                <button type="button" :aria-label="`Remove ${member.name} from the room`" @click="kickMember(member)">×</button>
              </div>
              <span v-else class="member-presence" :class="{ online: member.online }" :aria-label="member.online ? 'Online' : 'Offline'"></span>
            </div>
            <p class="panel-permission-note">The host can assign moderators, transfer ownership, or remove a listener.</p>
          </div>

          <div v-else class="activity-panel" role="tabpanel">
            <div class="panel-heading"><div><span class="section-index">ROOM SIGNALS</span><h3>Recent activity</h3></div></div>
            <ol v-if="room.activity.length" class="activity-list">
              <li v-for="event in room.activity" :key="event.id"><span class="activity-mark">✳</span><span>{{ event.text }}<time>{{ displayTime(event.createdAt) }}</time></span></li>
            </ol>
            <p v-else class="empty-room-state">Room updates will appear here.</p>
          </div>
        </section>
      </aside>
    </div>
    <div class="room-bottom-actions">
      <span><i class="live-dot"></i> {{ isOnline }} LISTENING · CODE {{ room.code }}</span>
      <button type="button" class="leave-room-button" @click="leaveRoom">LEAVE ROOM ↗</button>
    </div>
    <Transition name="room-notice"><div v-if="notice" class="room-notice" :class="{ 'notice-error': errorMessage }" role="status">{{ notice }}</div></Transition>
  </section>
</template>

<style>
.listening-heading h1 em{color:var(--orange)}
.room-lobby{margin-top:24px;padding:clamp(22px,4vw,48px);border:1px solid #34352f;background:#20211e;color:var(--paper)}
.lobby-intro{max-width:660px}.lobby-intro .section-index{color:#a09d94}.lobby-intro h2{margin:13px 0 7px;font-family:var(--display);font-size:clamp(38px,5vw,59px);line-height:.95}.lobby-intro h2 em{color:var(--orange);font-style:normal}.lobby-intro>p:not(.room-ended-note){margin:0;color:#a09d94;line-height:1.7}
.room-ended-note{color:var(--orange)}.lobby-actions{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:28px}.room-card{display:grid;align-content:start;padding:20px;border:1px solid #464740;background:#252621}.room-card-index{margin-bottom:22px;color:#a09d94;font-family:var(--mono);font-size:9px}.room-card>label:not(.privacy-choice){margin-bottom:7px;color:#aaa79e;font-family:var(--mono);font-size:9px}.room-card input:not([type=checkbox]){width:100%;height:42px;padding:0 11px;border:1px solid #55564e;background:#191a18;color:var(--paper);font-family:var(--mono);font-size:11px}.room-card input::placeholder{color:#77766f}.room-code-row{display:grid;grid-template-columns:1fr auto;gap:8px}.room-primary-button{min-height:42px;padding:0 16px;border:1px solid var(--orange);background:var(--orange);color:#171714;font-family:var(--mono);font-size:9px}.room-primary-button:disabled{opacity:.55;cursor:wait}.room-primary-button span{margin-left:13px}.room-card>p{margin:10px 0 0;color:#8e8c83;font-size:10px;line-height:1.5}.privacy-choice{display:flex;align-items:center;gap:8px;margin:13px 0;color:#c5c1b7;font-size:11px}.privacy-choice input{accent-color:var(--orange)}.create-room-button{justify-content:space-between}.prototype-note{display:flex;align-items:center;gap:9px;margin:21px 0 0;color:#9b988f;font-family:var(--mono);font-size:9px}
.listening-room{position:relative;margin-top:20px;border:1px solid #363731;background:#1e1f1c;color:#f1eee6;box-shadow:5px 5px 0 #171815}.room-header{position:relative;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 20px;border-bottom:1px solid #41423c}.room-identity{display:flex;align-items:center;gap:13px;min-width:0}.room-cover-mark,.room-art-empty{display:grid;place-content:center;flex:none;width:52px;aspect-ratio:1;background:linear-gradient(145deg,#f26a3d,#985039);color:#171714;font-family:var(--display);font-size:23px;font-weight:900}.room-cover-mark span,.room-art-empty span{font-size:9px}.room-heading-copy{min-width:0}.room-eyebrow{display:flex;align-items:center;gap:7px;color:#a19e95;font-family:var(--mono);font-size:8px}.room-eyebrow i,.room-presence-pill i,.members-live i,.chat-live-indicator i{width:6px;height:6px;border-radius:50%;background:#82a885;box-shadow:0 0 8px #82a88599}.room-eyebrow i.offline-dot{background:#e4bf5b}.room-eyebrow>span{color:var(--orange)}.room-heading-copy h2{overflow:hidden;margin:4px 0 3px;font-family:var(--display);font-size:clamp(24px,3vw,33px);line-height:1;text-overflow:ellipsis;white-space:nowrap}.room-host-line{color:#97948b;font-family:var(--mono);font-size:8px}.room-host-line strong{color:#e6e2d8;font-weight:500}.room-host-line>span{padding:0 4px;color:var(--orange)}.room-header-actions{position:relative;display:flex;align-items:center;gap:7px;flex:none}.room-presence-pill{display:flex;align-items:center;gap:6px;margin-right:3px;color:#a9a69d;font-family:var(--mono);font-size:8px}.room-outline-button{height:33px;padding:0 10px;border:1px solid #55564e;background:transparent;color:#e3dfd6;font-family:var(--mono);font-size:8px}.room-outline-button span{margin-left:8px;color:var(--orange)}.room-outline-button:hover,.room-settings-menu button:hover{border-color:var(--orange);color:var(--orange)}.room-settings-menu{position:absolute;z-index:4;top:41px;right:0;width:205px;padding:12px;border:1px solid #505149;background:#262722;box-shadow:4px 4px 0 #111}.room-settings-menu p{margin:0 0 8px;color:#96938a;font-family:var(--mono);font-size:8px}.room-settings-menu button{width:100%;padding:9px 5px;border:0;border-top:1px solid #41423c;background:none;color:#eee9df;text-align:left;font-family:var(--mono);font-size:9px}.room-settings-menu .danger-action{color:#f26a3d}
.room-sync-banner{display:flex;align-items:center;gap:11px;padding:10px 20px;border-bottom:1px solid #393a34;background:#23241f}.sync-wave{display:grid;place-items:center;width:27px;height:27px;border:1px solid #5a5b52;color:var(--orange);font-size:14px}.room-sync-banner>span:nth-child(2){display:grid;gap:3px}.room-sync-banner strong{font-family:var(--mono);font-size:8px;font-weight:500;letter-spacing:.04em}.room-sync-banner small{color:#97948b;font-size:9px}.audio-prototype-label{margin-left:auto;color:#e3a07f;font-family:var(--mono);font-size:8px}
.room-workspace{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(285px,.85fr);gap:0}.room-main-column{min-width:0;padding:15px}.room-player-card{overflow:hidden;border:1px solid #41423c;background:#242520}.room-player-art{position:relative;height:clamp(210px,27vw,300px);overflow:hidden;background:#353630}.room-player-art>img{width:100%;height:100%;object-fit:cover;filter:brightness(.72) saturate(.85)}.art-shade{position:absolute;inset:0;background:linear-gradient(180deg,#13141136,transparent 30%,#131411df 100%)}.art-kicker,.art-track-copy,.record-mark{position:absolute;z-index:1}.art-kicker{top:14px;left:15px;display:flex;align-items:center;gap:7px;color:#f1eee6;font-family:var(--mono);font-size:8px}.art-track-copy{bottom:17px;left:18px;max-width:75%}.art-track-copy>span{font-family:var(--mono);font-size:9px}.art-track-copy h3{margin:5px 0 0;font-family:var(--display);font-size:clamp(34px,5vw,58px);line-height:.88}.record-mark{right:24px;top:50%;display:grid;place-content:center;width:72px;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,#111 0 1px,#292a26 2px 4px);color:var(--orange);font-family:var(--display);font-size:19px;transform:translateY(-50%);animation:room-record-spin 14s linear infinite}.record-mark span{font-size:8px}.room-art-empty{position:absolute;inset:50% auto auto 50%;width:74px;transform:translate(-50%,-50%)}@keyframes room-record-spin{to{transform:translateY(-50%) rotate(360deg)}}
.player-meta-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 15px 7px}.track-title-block{display:grid;gap:4px;min-width:0}.track-title-block>.section-index{color:#9b988f}.track-title-block strong{overflow:hidden;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.track-title-block>span:last-child{color:#9b988f;font-size:10px}.playback-state{display:flex;align-items:center;gap:6px;color:#a09d94;font-family:var(--mono);font-size:8px}.playback-state i{width:6px;height:6px;border-radius:50%;background:#77766f}.playback-state.playing{color:#a5c39e}.playback-state.playing i{background:#82a885;box-shadow:0 0 8px #82a885aa}
.timeline-control{padding:0 15px}.timeline-control input{display:block;width:100%;height:14px;margin:4px 0 0;appearance:none;background:transparent;cursor:pointer}.timeline-control input::-webkit-slider-runnable-track{height:3px;background:linear-gradient(to right,var(--orange) var(--progress),#4b4c45 var(--progress))}.timeline-control input::-moz-range-track{height:3px;background:#4b4c45}.timeline-control input::-moz-range-progress{height:3px;background:var(--orange)}.timeline-control input::-webkit-slider-thumb{width:9px;height:9px;margin-top:-3px;appearance:none;border-radius:50%;background:var(--orange)}.timeline-control input::-moz-range-thumb{width:9px;height:9px;border:0;border-radius:50%;background:var(--orange)}.timeline-control input:disabled{cursor:not-allowed;opacity:.55}.track-time{display:flex;justify-content:space-between;color:#99968d;font-family:var(--mono);font-size:8px}
.playback-toolbar{display:flex;align-items:center;justify-content:center;gap:clamp(7px,2vw,18px);padding:11px 14px 13px}.playback-toolbar button{position:relative;display:grid;place-items:center;flex:none;border:0;background:none;color:#d8d4ca}.playback-toolbar button:disabled{cursor:not-allowed;opacity:.4}.transport-toggle{width:25px;height:30px;font-size:18px}.transport-toggle[aria-pressed=true]{color:var(--orange)}.transport-button{width:32px;height:32px;font-size:12px}.transport-play{width:40px;height:40px;background:var(--orange)!important;color:#171714!important;font-size:15px}.repeat-toggle small{position:absolute;right:0;bottom:0;font-family:var(--mono);font-size:8px}.volume-control{display:flex;align-items:center;gap:6px;margin-left:5px;color:#bdb9af}.volume-control input{width:66px;height:3px;accent-color:var(--orange)}.permission-hint{margin:0;padding:0 15px 12px;color:#9b988f;font-size:9px}
.room-chat-card{display:flex;flex-direction:column;min-height:380px;margin-top:14px;border:1px solid #41423c;background:#242520}.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;border-bottom:1px solid #41423c}.panel-heading h3{margin:4px 0 0;font-family:var(--display);font-size:22px;line-height:1}.panel-heading h3>span{color:var(--orange);font-family:var(--mono);font-size:9px}.chat-live-indicator,.members-live{display:flex;align-items:center;gap:6px;color:#a09d94;font-family:var(--mono);font-size:8px}.room-message-list{display:flex;flex:1;flex-direction:column;gap:12px;min-height:190px;max-height:390px;padding:14px;overflow:auto;overscroll-behavior:contain}.empty-room-state{margin:auto;color:#99968d;font-size:11px;line-height:1.6;text-align:center}.room-message{align-self:flex-start;max-width:86%;padding:9px 11px;border:1px solid #45463f;background:#2c2d27}.room-message.own-message{align-self:flex-end;border-color:#75503e;background:#392a22}.message-byline{display:flex;align-items:center;gap:12px}.message-byline strong{color:#e69d7f;font-family:var(--mono);font-size:8px;text-transform:uppercase}.message-byline time{color:#929087;font-family:var(--mono);font-size:8px}.room-message>p{margin:7px 0 0;color:#e5e1d7;font-size:11px;line-height:1.5;overflow-wrap:anywhere}.shared-song-chip{display:flex;align-items:center;gap:8px;margin-top:8px;padding:7px;border:1px solid #505149;background:#242520}.shared-song-chip>span{color:var(--orange)}.shared-song-chip div{display:grid;gap:3px}.shared-song-chip strong{font-size:10px}.shared-song-chip small{color:#aaa79e;font-size:9px}.message-reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}.message-reactions button{min-width:31px;height:26px;padding:0 5px;border:1px solid #55564e;background:#242520;color:#eee9df;font-size:11px}.message-reactions button[aria-pressed=true]{border-color:var(--orange);background:#f26a3d24}.message-reactions button span{padding-left:2px;color:#c4bfb5;font-family:var(--mono);font-size:8px}.room-composer{display:flex;gap:7px;padding:11px;border-top:1px solid #41423c}.room-composer input{flex:1;min-width:0;height:39px;padding:0 11px;border:1px solid #55564e;background:#1a1b18;color:#f1eee6;font-size:11px}.room-composer input::placeholder{color:#89877f}.composer-share,.room-send-button{height:39px;border:1px solid #55564e;background:transparent;color:#eee9df}.composer-share{width:39px;color:var(--orange);font-size:17px}.room-send-button{padding:0 11px;border-color:var(--orange);background:var(--orange);color:#171714;font-family:var(--mono);font-size:8px}.room-send-button span{margin-left:9px}.room-composer button:disabled{opacity:.45;cursor:not-allowed}
.room-side-column{min-width:0;padding:15px 15px 15px 0}.room-side-panel{height:100%;min-height:550px;border:1px solid #41423c;background:#242520}.room-panel-tabs{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #41423c}.room-panel-tabs button{height:43px;border:0;border-bottom:2px solid transparent;background:transparent;color:#99968d;font-family:var(--mono);font-size:8px}.room-panel-tabs button.selected{border-bottom-color:var(--orange);color:#f1eee6}.room-panel-tabs button span{margin-left:5px;color:var(--orange)}.queue-panel,.members-panel,.activity-panel{padding:0 12px 12px}.queue-heading{margin:0 -12px}.queue-count{color:#aaa79e;font-family:var(--mono);font-size:8px}.song-search-form{display:flex;gap:6px;margin:12px 0}.song-search-form input{flex:1;min-width:0;height:34px;padding:0 9px;border:1px solid #505149;background:#1a1b18;color:#f1eee6;font-size:10px}.song-search-form button{padding:0 9px;border:1px solid #66665e;background:transparent;color:#e8e3d9;font-family:var(--mono);font-size:8px}.song-search-form button:disabled{opacity:.5}.search-feedback{margin:6px 0;color:#e4a07f;font-size:10px;line-height:1.5}.song-search-results{display:grid;gap:4px;max-height:180px;margin-bottom:11px;overflow:auto}.song-result-row{display:flex;align-items:center;gap:8px;padding:6px;background:#2a2b25}.song-result-row img{width:34px;height:34px;object-fit:cover}.search-result-copy{display:grid;flex:1;min-width:0;gap:3px}.search-result-copy strong,.search-result-copy span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.search-result-copy strong{font-size:9px}.search-result-copy span{color:#a6a299;font-size:8px}.song-result-row button{width:28px;height:28px;border:1px solid #5a5b52;background:transparent;color:var(--orange);font-size:17px}
.queue-list{display:grid;gap:5px;max-height:360px;overflow:auto}.queue-row{display:grid;grid-template-columns:19px 36px minmax(0,1fr) auto;align-items:center;gap:8px;min-height:55px;padding:6px 5px;border:1px solid #393a34;background:#292a25}.queue-row.draggable{cursor:grab}.queue-row.dragging{opacity:.45}.queue-index{color:#88867d;font-family:var(--mono);font-size:8px}.queue-row>img,.queue-art-fallback{display:grid;place-items:center;width:36px;height:36px;object-fit:cover;background:#3a3b34;color:var(--orange)}.queue-track-copy{display:grid;min-width:0;gap:3px}.queue-track-copy strong,.queue-track-copy span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.queue-track-copy strong{font-size:9px}.queue-track-copy>span{color:#aaa79e;font-size:8px}.queue-track-copy small{color:#77766f;font-family:var(--mono);font-size:7px}.queue-item-actions{display:flex;gap:2px}.queue-item-actions button{width:23px;height:25px;border:1px solid #4e4f47;background:transparent;color:#d5d1c8;font-size:12px}.queue-item-actions button:disabled{opacity:.3}.queue-item-actions button:last-child{color:#df9b7d}.queue-empty-state{display:grid;justify-items:center;padding:26px 16px;color:#aaa79e;text-align:center}.queue-empty-state>span{color:var(--orange);font-size:22px}.queue-empty-state strong{margin-top:7px;color:#e6e2d8;font-family:var(--display);font-size:21px}.queue-empty-state p{max-width:220px;margin:5px 0 0;font-size:10px;line-height:1.5}.panel-permission-note{margin:11px 0 0;padding-top:9px;border-top:1px solid #41423c;color:#8e8c83;font-size:9px;line-height:1.5}
.members-panel .panel-heading,.activity-panel .panel-heading{margin:0 -12px}.members-panel .panel-heading h3>span{font-size:16px}.member-row{display:flex;align-items:center;gap:8px;min-height:57px;border-bottom:1px solid #393a34}.member-avatar{display:grid;place-items:center;flex:none;width:32px;height:32px;background:#a76a4f;color:#171714;font-family:var(--display);font-size:17px;font-weight:800}.avatar-offline{filter:grayscale(.8);opacity:.55}.member-copy{display:grid;flex:1;min-width:0;gap:4px}.member-copy strong{overflow:hidden;color:#e9e5db;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.member-copy strong small{margin-left:4px;color:var(--orange);font-family:var(--mono);font-size:7px}.member-copy>span{color:#97948b;font-family:var(--mono);font-size:7px}.member-role{padding:4px 5px;border:1px solid #4d4e46;color:#aaa79e;font-family:var(--mono);font-size:7px;text-transform:uppercase}.role-host{border-color:#a85c3e;color:#f09a76}.role-moderator{border-color:#668577;color:#9bc5ac}.member-manage{display:flex;gap:2px}.member-manage button{width:23px;height:24px;border:1px solid #4d4e46;background:transparent;color:#d7d2c7;font-family:var(--mono);font-size:8px}.member-manage button:hover{border-color:var(--orange);color:var(--orange)}.member-presence{width:7px;height:7px;border-radius:50%;background:#77766f}.member-presence.online{background:#82a885;box-shadow:0 0 6px #82a885aa}
.activity-list{display:grid;gap:0;margin:0;padding:4px 0;list-style:none}.activity-list li{display:grid;grid-template-columns:23px 1fr;gap:7px;padding:12px 0;border-bottom:1px solid #393a34;color:#c9c5bb;font-size:10px;line-height:1.5}.activity-mark{color:var(--orange)}.activity-list time{display:block;margin-top:4px;color:#89877f;font-family:var(--mono);font-size:8px}
.room-bottom-actions{display:flex;align-items:center;justify-content:space-between;padding:10px 15px;border-top:1px solid #41423c;color:#96938a;font-family:var(--mono);font-size:8px}.room-bottom-actions>span{display:flex;align-items:center;gap:7px}.leave-room-button{padding:7px 9px;border:1px solid #55564e;background:transparent;color:#ddd8ce;font-family:var(--mono);font-size:8px}.leave-room-button:hover{border-color:var(--orange);color:var(--orange)}.room-connection-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 14px;background:#68432f;color:#fff0dc;font-family:var(--mono);font-size:8px}.room-connection-banner button{padding:5px 8px;border:1px solid #edb083;background:transparent;color:#fff0dc;font:inherit}.room-notice{position:fixed;z-index:20;right:24px;bottom:24px;max-width:min(400px,calc(100vw - 32px));padding:13px 16px;border:1px solid #5a5b52;background:#242520;color:#f1eee6;box-shadow:4px 4px 0 #111;font-size:11px}.room-notice.notice-error{border-color:#f26a3d;color:#ffd8c6}.room-notice-enter-active,.room-notice-leave-active{transition:opacity .18s,transform .18s}.room-notice-enter-from,.room-notice-leave-to{opacity:0;transform:translateY(8px)}.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.listening-room button:focus-visible,.room-lobby button:focus-visible,.room-lobby input:focus-visible,.listening-room input:focus-visible{outline:2px solid var(--orange);outline-offset:2px}
@media(max-width:900px){.room-workspace{grid-template-columns:minmax(0,1fr)}.room-side-column{padding:0 15px 15px}.room-side-panel{min-height:0}.queue-list{max-height:320px}}
@media(max-width:600px){.lobby-actions{grid-template-columns:1fr}.room-lobby{padding:18px}.room-header{align-items:flex-start;flex-direction:column;padding:14px}.room-header-actions{flex-wrap:wrap;width:100%}.room-presence-pill{margin-right:auto}.room-cover-mark{width:43px}.room-heading-copy h2{max-width:calc(100vw - 100px);font-size:27px}.room-sync-banner{align-items:flex-start;padding:9px 12px}.room-sync-banner small{max-width:210px;line-height:1.4}.audio-prototype-label{max-width:100px;font-size:7px;line-height:1.4;text-align:right}.room-main-column{padding:10px}.room-player-art{height:230px}.art-track-copy h3{font-size:39px}.record-mark{right:13px;width:55px}.room-side-column{padding:0 10px 10px}.room-chat-card{min-height:350px}.room-message-list{max-height:300px;padding:10px}.room-message{max-width:95%}.playback-toolbar{gap:8px}.volume-control{gap:4px;margin-left:0}.volume-control input{width:44px}.transport-toggle{width:22px}.transport-button{width:27px}.room-composer{gap:5px;padding:8px}.room-composer input{font-size:10px}.room-send-button{padding:0 8px}.room-bottom-actions{padding:9px 10px;font-size:7px}.member-manage button{width:25px;height:28px}.room-notice{right:12px;bottom:12px}}
@media(prefers-reduced-motion:reduce){.record-mark{animation:none}.room-notice-enter-active,.room-notice-leave-active{transition:none}}
</style>
