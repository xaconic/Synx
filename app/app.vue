<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { expectedLocalAudioPath, localAudioFileForSong } from '#shared/song-audio'
import FlipCard from '~/components/FlipCard.vue'
import BorderGlow from '~/components/BorderGlow.vue'
import Iridescence from '~/components/Iridescence.vue'
import OptionWheel from '~/components/OptionWheel.vue'
import WakeSlider from '~/components/WakeSlider.vue'
import FuzzyText from '~/components/FuzzyText.vue'
import LocalAudioChip from '~/components/LocalAudioChip.vue'

const navigation = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'discover', label: 'Discover', icon: '✳' },
  { id: 'library', label: 'Library', icon: '▤' },
  { id: 'chat', label: 'Chat', icon: '◌', count: '2' },
  { id: 'groups', label: 'Listening room', icon: '◎' },
  { id: 'profile', label: 'My identity', icon: '↗' },
]

// IDs are configured from official or authorized uploads. The embed API remains
// authoritative: unavailable/private or embedding-disabled videos are rejected at runtime.
//
// audioUrl is not written by hand: it is derived from the explicit song-id → filename
// manifest in shared/song-audio.ts. A configured path is NOT proof the file exists —
// real availability comes from server verification (GET /api/music/report) and is
// exposed through localAudioStatus()/hasVerifiedLocalAudio() below.
function withLocalAudioSource(song) {
  return { ...song, audioUrl: expectedLocalAudioPath(song.id) || song.audioUrl || '' }
}

const catalogTracks = [
  { id: 1, title: 'The Night We Met', artist: 'Lord Huron', genre: 'Indie folk', mood: 'Nostalgic', duration: '3:28', audioUrl: '', youtubeVideoId: 'KtlgYxa6BMU', cover: 'photo-1519608487953-e999c86e7455', color: '#b65f37', tags: ['night', 'nostalgic', 'cinematic', 'dreamy', 'calm', 'indie', 'late'] },
  { id: 2, title: 'Genesis', artist: 'Grimes', genre: 'Electronic', mood: 'Electric', duration: '4:15', audioUrl: '', youtubeVideoId: '', cover: 'photo-1519608487953-e999c86e7455', color: '#b73d50', tags: ['energetic', 'electronic', 'rebellious', 'creative', 'night', 'gamer'] },
  { id: 3, title: 'Space Song', artist: 'Beach House', genre: 'Dream pop', mood: 'Dreamy', duration: '5:20', audioUrl: '', youtubeVideoId: 'm_npTC0Rvgg', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/09/e0/d5/09e0d559-0682-f0f0-5e0c-3cd11e3114fd/beachhouse_depressioncherry_2400_300.jpg/600x600bb.jpg', color: '#375b77', tags: ['dreamy', 'nostalgic', 'calm', 'atmospheric', 'night', 'indie'] },
  { id: 4, title: 'After Dark', artist: 'Mr.Kitty', genre: 'Darkwave', mood: 'Midnight', duration: '4:17', audioUrl: '', youtubeVideoId: 'sVx1mJDeUjY', cover: 'photo-1519608487953-e999c86e7455', color: '#684b74', tags: ['dark', 'night', 'electronic', 'late', 'rebellious', 'focused'] },
  { id: 5, title: 'Sweet Disposition', artist: 'The Temper Trap', genre: 'Alternative', mood: 'Free', duration: '3:54', audioUrl: '', youtubeVideoId: 'vN7HQrgakZU', cover: 'photo-1470225620780-dba8ba36b745', color: '#9b7041', tags: ['energetic', 'alternative', 'cinematic', 'traveler', 'adventurous'] },
  { id: 6, title: 'Show Me How', artist: 'Men I Trust', genre: 'Indie', mood: 'Soft focus', duration: '3:35', audioUrl: '', youtubeVideoId: 'cpU7Yrl-AwM', cover: 'photo-1470252649378-9c29740c9fa8', color: '#66816c', tags: ['calm', 'dreamy', 'indie', 'study', 'focused', 'late'] },
  { id: 7, title: 'Sunset Lover', artist: 'Petit Biscuit', genre: 'Electronic', mood: 'Weightless', duration: '3:58', audioUrl: '', youtubeVideoId: '4fQeaM62mOY', cover: 'photo-1470252649378-9c29740c9fa8', color: '#c47b49', tags: ['electronic', 'calm', 'traveler', 'dreamy', 'cinematic'] },
  { id: 8, title: '505', artist: 'Arctic Monkeys', genre: 'Alternative', mood: 'Restless', duration: '4:13', audioUrl: '', youtubeVideoId: 'KfEEm4Zx-EU', cover: 'photo-1470225620780-dba8ba36b745', color: '#46667e', tags: ['alternative', 'nostalgic', 'rebellious', 'night', 'energetic'] },
]

const tracks = catalogTracks.map(withLocalAudioSource)

const starterArchiveTrackIds = {
  1: [1, 3, 4, 8],
  2: [3, 6, 7],
  3: [2, 4],
}

const libraries = ref([
  { id: 1, title: 'Midnight drive', subtitle: 'NO DESTINATION REQUIRED', count: 4, trackIds: [1, 3, 4, 8], mood: 'DREAMY / ALTERNATIVE', cover: 'photo-1519608487953-e999c86e7455', color: '#9e523d', saved: true },
  { id: 2, title: 'Soft focus', subtitle: 'A LITTLE ROOM TO THINK', count: 3, trackIds: [3, 6, 7], mood: 'CALM / ATMOSPHERIC', cover: 'photo-1470252649378-9c29740c9fa8', color: '#637b5d', saved: true },
  { id: 3, title: 'After hours', subtitle: 'THE CITY IS STILL AWAKE', count: 2, trackIds: [2, 4], mood: 'DARK / ELECTRONIC', cover: 'photo-1470225620780-dba8ba36b745', color: '#394f73', saved: true },
])

const activeView = ref('home')
const theme = ref('light')
const welcome = ref(true)
const showCreateAccount = ref(false)
const spotifyConnected = ref(false)
const email = ref('')
const password = ref('')
const loginError = ref('')
const createAccountName = ref('')
const createAccountEmail = ref('')
const createAccountPassword = ref('')
const accountRegistry = ref([])

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function getStoredAccounts() {
  if (!import.meta.client) return []

  try {
    const saved = localStorage.getItem('synx-accounts')
    const accounts = saved ? JSON.parse(saved) : []
    return Array.isArray(accounts) ? accounts : []
  } catch {
    localStorage.removeItem('synx-accounts')
    return []
  }
}

function persistAccountRegistry() {
  if (!import.meta.client) return
  localStorage.setItem('synx-accounts', JSON.stringify(accountRegistry.value))
}

function findAccountByEmail(targetEmail) {
  const normalizedEmail = normalizeEmail(targetEmail)
  return accountRegistry.value.find((account) => normalizeEmail(account.email) === normalizedEmail)
}

function loginWithValidatedAccount(targetEmail, targetPassword = '') {
  const account = findAccountByEmail(targetEmail)

  if (!account) {
    loginError.value = 'No account found for that email. Create an account first.'
    notify('No account found for that email. Create an account first.')
    return false
  }

  if (targetPassword && account.password && targetPassword !== account.password) {
    loginError.value = 'That password does not match this account.'
    notify('That password does not match this account.')
    return false
  }

  loginError.value = ''
  return true
}
const description = ref("I'm feeling nostalgic, energetic, and a little rebellious. I like late-night drives, old-school sounds, and music that feels cinematic.")
const generated = ref(false)
const moodOptions = ['Nostalgic', 'Late night', 'Restless', 'Soft focus', 'Rebellious', 'Cinematic']
const selectedMoods = ref(['Nostalgic', 'Late night'])
const discoveryPreferences = ref({
  description: description.value,
  moods: [...selectedMoods.value],
  style: 'Techno',
})
const isGenerating = ref(false)
const recommendationError = ref('')
const recommendationFilterType = ref('All')
const recommendationFilter = ref('All')
const soundStyles = ['Ambient', 'House', 'Techno', 'Jazz', 'Lo-Fi', 'Synthwave']
const selectedStyle = ref(soundStyles[2])
const search = ref('')
const spotifySearchQuery = ref('')
const spotifySearchResults = ref([])
const spotifySearchLoading = ref(false)
const spotifySearchError = ref('')
const selectedSpotifyTrack = ref(null)
const selectedFilter = ref('All')
const libraryTab = ref('All')
const selectedLibraryId = ref(null)
const savedTracks = ref([1, 3, 6])
const currentTrack = ref(tracks[2])
const playbackQueue = ref(tracks)
const manualQueue = ref([])
const playHistory = ref([])
const shuffleEnabled = ref(false)
const repeatMode = ref('off')
const showQueue = ref(false)
const isPlaying = ref(false)
const audioElement = ref(null)
const currentTime = ref(0)
const durationSeconds = ref(0)
const playbackStatus = ref('idle')
const audioError = ref('')
const playbackProvider = ref('audio')
// Verified local-audio state per song id, loaded once from GET /api/music/report.
// Values: 'available' | 'missing' | 'invalid' | 'unconfigured' | 'unverified'.
const audioStatuses = ref({})
const audioReportStatus = ref('idle')
const isDevMode = import.meta.dev
const youtubeVideoIds = ref({})
const youtubeMount = ref(null)
const showYouTubeConfig = ref(false)
const youtubeVideoIdInput = ref('')
const youtubeConfigTrack = ref(null)
const youtubeApiStatus = ref('idle')
const progressPercent = computed(() => durationSeconds.value ? (currentTime.value / durationSeconds.value) * 100 : 0)
let playbackRequestId = 0
let youtubePlayer = null
let youtubePlayerReady = false
let youtubeApiPromise = null
let youtubeProgressTimer = null
let pendingYouTubeVideoId = ''
let youtubeEmbedFailed = false
const volume = ref(50)
const previousVolume = ref(50)
const isExpanded = ref(false)
const toast = ref('')
const newMessage = ref('')
const reactionOptions = ['❤️', '🔥', '🎵', '😂', '👀']
const replyTarget = ref(null)
const messageSwipe = ref(null)
const activeMessageActionsId = ref(null)
let messagePressTimer
const showChatOptions = ref(false)
const showDeleteConfirm = ref(false)
const accountMenu = ref('')
const chatFriends = [
  { name: 'Drei Zamora', handle: '@dreizamora', active: true, track: 'Men I Trust · Show Me How', listeningTo: 'Show Me How — Men I Trust', avatar: 'DZ', color: '#e4a36a' },
  { name: 'Lebron James', handle: '@lebronjames', active: true, track: 'Beach House · Space Song', listeningTo: 'Space Song — Beach House', avatar: 'LJ', color: '#8fa7d2' },
  { name: 'James Ivan', handle: '@jamesivan', active: true, track: 'The Night We Met · Lord Huron', listeningTo: 'The Night We Met — Lord Huron', avatar: 'JI', color: '#78ad80' },
  { name: 'Ryan', handle: '@ryan', active: false, track: 'Last seen 2h ago', listeningTo: 'Last seen 2h ago', avatar: 'RY', color: '#b9879c' },
  { name: 'John Mico', handle: '@johnmico', active: false, track: 'Last seen yesterday', listeningTo: 'Last seen yesterday', avatar: 'JM', color: '#77b6c4' },
]
const activeFriend = ref(0)
// Chat-shared songs. youtubeVideoId values are official uploads verified as embeddable on 2026-10-23.
// Local audioUrl values are derived from the shared manifest (this also corrects the old
// '/music/ilybs.mp3' typo for ILYSB — the expected file is '/music/ilysb.mp3').
const rawChatSongs = {
  ilysb: { id: 'chat-lany-ilysb', title: 'ILYSB', artist: 'LANY', album: 'Make Out - EP', albumArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/74/23/52/74235205-45aa-e94a-c1a6-cfd2fa495726/00602557074499.rgb.jpg/600x600bb.jpg', audioUrl: '', youtubeVideoId: 'SSTp0rknOgA', duration: '3:31' },
  clouded: { id: 'chat-brent-clouded', title: 'Clouded', artist: 'Brent Faiyaz', album: 'F**k the World', albumArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a4/e2/b2/a4e2b245-0296-b072-1700-e3ebbff687d0/193436188333_01_img001.jpg/600x600bb.jpg', audioUrl: '', youtubeVideoId: 'FFu_lJ3EvAA', duration: '3:06' },
  passionfruit: { id: 'chat-drake-passionfruit', title: 'Passionfruit', artist: 'Drake', album: 'More Life', albumArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/18/9d/b8/189db80b-bfa8-89d1-1514-5fcb7e5cf8f4/00602557611526.rgb.jpg/600x600bb.jpg', audioUrl: '', youtubeVideoId: 'LDN_CuuUl2I', duration: '4:58' },
  thatsWhatILike: { id: 'chat-bruno-thats-what-i-like', title: "That's What I Like", artist: 'Bruno Mars', album: '24K Magic', albumArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/e3/47/a0/e347a0cc-87ce-5d05-d560-176c7d48f66e/075679904119.jpg/600x600bb.jpg', audioUrl: '', youtubeVideoId: 'PMivT7MJ41M', duration: '3:26' },
  comeAndSeeMe: { id: 'chat-pnd-come-and-see-me', title: 'Come and See Me', artist: 'PARTYNEXTDOOR', album: 'PARTYNEXTDOOR 3 (P3)', albumArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/d0/27/3d/d0273d64-de3f-2336-422c-e3bc97f87771/93624916932.jpg/600x600bb.jpg', audioUrl: '', youtubeVideoId: 'Ockhq8E2FrA', duration: '3:55' },
  malibuNights: { id: 'chat-lany-malibu-nights', title: 'Malibu Nights', artist: 'LANY', album: 'Malibu Nights', albumArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b4/35/dc/b435dcd6-1feb-b96f-46ce-9517b06c9e52/00602577021664.rgb.jpg/600x600bb.jpg', audioUrl: '', youtubeVideoId: 'KdcPzDNHX74', duration: '4:47' },
  allMine: { id: 'chat-brent-all-mine', title: 'ALL MINE', artist: 'Brent Faiyaz', album: 'WASTELAND', albumArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/30/1b/30/301b30ef-9bb5-8fbd-6bdc-30552aefd0c6/8DrDvnuaSqqztj1vOGwY_Wasteland-Final6.jpg/600x600bb.jpg', audioUrl: '', youtubeVideoId: 'CHtfJ-UZJM4', duration: '3:36' },
  recognize: { id: 'chat-pnd-recognize', title: 'Recognize', artist: 'PARTYNEXTDOOR', album: 'PARTYNEXTDOOR TWO', albumArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/9a/9c/51/9a9c517c-a528-118b-fe89-39afb8c93c84/27278.jpg/600x600bb.jpg', audioUrl: '', youtubeVideoId: 'WsPfSXJaelk', duration: '5:11' },
  treasure: { id: 'chat-bruno-treasure', title: 'Treasure', artist: 'Bruno Mars', album: 'Unorthodox Jukebox', albumArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/15/63/53/156353b8-d45b-a17d-f553-2d125aeb3cb3/075679957474.jpg/600x600bb.jpg', audioUrl: '', youtubeVideoId: 'nPvuNsRccVw', duration: '2:58' },
}

const chatSongs = Object.fromEntries(
  Object.entries(rawChatSongs).map(([key, song]) => [key, withLocalAudioSource(song)]),
)

const conversations = ref({
  '@dreizamora': [
    { id: 'drei-1', from: 'Drei Zamora', text: 'ILYSB is still the perfect late-night drive song.', track: chatSongs.ilysb, reactions: { '❤️': ['Drei Zamora'], '🎵': ['You'] }, replyTo: null, timestamp: '10:42 PM' },
    { id: 'drei-2', from: 'You', text: 'Adding it to the drive playlist. What else have you been playing?', reactions: { '🔥': ['You'] }, replyTo: null, timestamp: '10:43 PM' },
    { id: 'drei-3', from: 'Drei Zamora', text: 'Brent Faiyaz. Clouded has been on repeat this week.', track: chatSongs.clouded, reactions: {}, replyTo: null, timestamp: '10:44 PM' },
  ],
  '@lebronjames': [
    { id: 'lebron-1', from: 'Lebron James', text: 'Passionfruit is unbeatable when the sun goes down.', track: chatSongs.passionfruit, reactions: { '🎵': ['Lebron James'] }, replyTo: null, timestamp: '9:18 PM' },
    { id: 'lebron-2', from: 'You', text: 'That whole mood, then some Bruno Mars to lift it back up.', reactions: {}, replyTo: null, timestamp: '9:20 PM' },
    { id: 'lebron-3', from: 'Lebron James', text: "That's What I Like. No skips.", track: chatSongs.thatsWhatILike, reactions: { '🔥': ['You'] }, replyTo: null, timestamp: '9:21 PM' },
  ],
  '@jamesivan': [
    { id: 'james-1', from: 'James Ivan', text: 'Come and See Me has that after-hours feel.', track: chatSongs.comeAndSeeMe, reactions: { '👀': ['You'] }, replyTo: null, timestamp: '8:03 PM' },
    { id: 'james-2', from: 'You', text: 'Perfect for the ride home. LANY gets that same kind of atmosphere.', reactions: {}, replyTo: null, timestamp: '8:05 PM' },
    { id: 'james-3', from: 'James Ivan', text: 'Malibu Nights is the one for me.', track: chatSongs.malibuNights, reactions: {}, replyTo: null, timestamp: '8:06 PM' },
  ],
  '@ryan': [
    { id: 'ryan-1', from: 'Ryan', text: 'Been revisiting Brent Faiyaz lately. ALL MINE still hits.', track: chatSongs.allMine, reactions: { '❤️': ['You'] }, replyTo: null, timestamp: 'Yesterday' },
    { id: 'ryan-2', from: 'You', text: 'That and some Drake make a solid weekend mix.', reactions: {}, replyTo: null, timestamp: 'Yesterday' },
    { id: 'ryan-3', from: 'Ryan', text: 'Putting Passionfruit right after it.', track: chatSongs.passionfruit, reactions: {}, replyTo: null, timestamp: 'Yesterday' },
  ],
  '@johnmico': [
    { id: 'john-1', from: 'John Mico', text: 'Treasure always gets the room moving.', track: chatSongs.treasure, reactions: { '🔥': ['John Mico'] }, replyTo: null, timestamp: 'Monday' },
    { id: 'john-2', from: 'You', text: 'Then switch to something slower?', reactions: {}, replyTo: null, timestamp: 'Monday' },
    { id: 'john-3', from: 'John Mico', text: 'Recognize by PARTYNEXTDOOR. Smooth landing.', track: chatSongs.recognize, reactions: {}, replyTo: null, timestamp: 'Monday' },
  ],
})
const messages = computed(() => conversations.value[chatFriends[activeFriend.value].handle])
const chatTypingText = computed(() => chatFriends[activeFriend.value].active ? `${chatFriends[activeFriend.value].name} is typing...` : '')
function latestMessageTime(handle) {
  const thread = conversations.value[handle] || []
  return thread.at(-1)?.timestamp || 'NO MESSAGES'
}
const roomJoined = ref(false)
const roomReaction = ref('')
const showCreateLibrary = ref(false)
const libraryName = ref('')
const profileName = ref('THE NIGHT EXPLORER')
const profileHandle = computed(() => profileName.value.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'USER')
const artistMatches = [
  { name: 'Beach House', genre: 'DREAM POP · 96% MATCH', cover: 'photo-1470225620780-dba8ba36b745', color: '#405c72' },
  { name: 'Men I Trust', genre: 'INDIE · 92% MATCH', cover: 'photo-1470252649378-9c29740c9fa8', color: '#6e795e' },
  { name: 'Chromatics', genre: 'DARKWAVE · 88% MATCH', cover: 'photo-1519608487953-e999c86e7455', color: '#8b4e61' },
]
const styleAffinity = {
  Ambient: ['atmospheric', 'calm', 'dreamy'],
  House: ['electronic', 'dance', 'energetic'],
  Techno: ['electronic', 'night', 'energetic'],
  Jazz: ['jazz', 'calm', 'smooth'],
  'Lo-Fi': ['lo-fi', 'study', 'focused', 'calm'],
  Synthwave: ['electronic', 'night', 'cinematic'],
}

const filteredTracks = computed(() => {
  const query = search.value.trim().toLowerCase()
  return tracks.filter((track) => {
    const matchesQuery = !query || `${track.title} ${track.artist} ${track.genre} ${track.mood}`.toLowerCase().includes(query)
    const matchesFilter = selectedFilter.value === 'All' || (selectedFilter.value === 'Saved' ? savedTracks.value.includes(track.id) : track.genre.toLowerCase().includes(selectedFilter.value.toLowerCase()))
    return matchesQuery && matchesFilter
  })
})

const libraryTracks = computed(() => libraryTab.value === 'Songs'
  ? filteredTracks.value
  : filteredTracks.value.filter((track) => savedTracks.value.includes(track.id)))

const selectedLibrary = computed(() => libraries.value.find((library) => library.id === selectedLibraryId.value) || null)
const selectedLibraryTracks = computed(() => archiveTracks(selectedLibrary.value))
const upcomingTracks = computed(() => {
  const currentIndex = playbackQueue.value.findIndex((track) => track.id === currentTrack.value?.id)
  const contextQueue = currentIndex < 0 ? playbackQueue.value : playbackQueue.value.slice(currentIndex + 1)
  return [...manualQueue.value, ...contextQueue]
})

function archiveTracks(library) {
  const trackIds = new Set(Array.isArray(library?.trackIds) ? library.trackIds.map(String) : [])
  return tracks.filter((track) => trackIds.has(String(track.id)))
}

function libraryTrackCount(library) {
  return archiveTracks(library).length
}

const moodSignals = {
  Nostalgic: ['nostalgic', 'memory', 'memories', 'throwback', 'old school', 'homesick', 'yearning'],
  'Late night': ['late night', 'night', 'midnight', 'after hours', 'drive', 'driving'],
  Restless: ['restless', 'energetic', 'adventurous', 'movement', 'gamer'],
  'Soft focus': ['soft focus', 'calm', 'dreamy', 'study', 'focused', 'lo fi', 'ambient'],
  Rebellious: ['rebellious', 'bold', 'alternative', 'darkwave', 'electric'],
  Cinematic: ['cinematic', 'atmospheric', 'scene', 'soundtrack', 'credits', 'dramatic'],
}

function normalizedText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function scoreTrack(track, preferences) {
  const source = normalizedText([
    track?.title,
    track?.artist,
    track?.genre,
    track?.mood,
    ...(Array.isArray(track?.tags) ? track.tags : []),
  ].join(' '))
  const descriptionText = normalizedText(preferences.description)
  const selectedMoods = Array.isArray(preferences.moods) ? preferences.moods : []
  const reasons = []
  let score = 0

  for (const mood of selectedMoods) {
    const signals = moodSignals[mood] || [normalizedText(mood)]
    if (signals.some((signal) => source.includes(normalizedText(signal)))) {
      score += 4
      reasons.push(`matches ${mood.toLowerCase()}`)
    }
  }

  for (const [mood, signals] of Object.entries(moodSignals)) {
    if (!selectedMoods.includes(mood) && signals.some((signal) => descriptionText.includes(normalizedText(signal)) && source.includes(normalizedText(signal)))) {
      score += 2
      reasons.push(`fits your ${mood.toLowerCase()} description`)
    }
  }

  const fields = [track?.title, track?.artist, track?.genre].map(normalizedText).filter(Boolean)
  const descriptionTokens = descriptionText.split(' ').filter((word) => word.length >= 4 && !['that', 'with', 'like', 'this', 'from', 'something', 'music', 'song'].includes(word))
  const matchedWords = [...new Set(descriptionTokens.filter((word) => source.split(' ').includes(word)))]
  if (matchedWords.length) {
    score += Math.min(matchedWords.length, 4)
    if (matchedWords.some((word) => fields.some((field) => field.split(' ').includes(word)))) reasons.push('matches your words')
    else reasons.push('shares tags from your description')
  }

  const styleWords = styleAffinity[preferences.style] || []
  const matchedStyles = styleWords.filter((word) => source.includes(normalizedText(word)))
  if (matchedStyles.length) {
    score += matchedStyles.length * 2
    reasons.push(`fits ${preferences.style} textures`)
  }

  return {
    track,
    score,
    reason: reasons.slice(0, 2).join(' · ') || 'A related catalog alternative based on its available genre and mood tags.',
  }
}

const rankedRecommendations = computed(() => {
  const preferences = discoveryPreferences.value
  const ranked = tracks
    .map((track, index) => ({ ...scoreTrack(track, preferences), index }))
    .sort((left, right) => right.score - left.score || left.index - right.index)

  return ranked
})

const recommendationGenreOptions = computed(() => [...new Set(tracks.map((track) => track.genre).filter(Boolean))].sort())
const recommendationMoodOptions = computed(() => [...new Set([...moodOptions, ...tracks.map((track) => track.mood).filter(Boolean)])].sort())
const filteredRecommendations = computed(() => {
  if (recommendationFilterType.value === 'All' || recommendationFilter.value === 'All') return rankedRecommendations.value
  const filter = normalizedText(recommendationFilter.value)
  return rankedRecommendations.value.filter(({ track }) => recommendationFilterType.value === 'Genre'
    ? normalizedText(track.genre) === filter
    : normalizedText([track.mood, ...(Array.isArray(track.tags) ? track.tags : [])].join(' ')).includes(filter))
})

const recommendationGroups = computed(() => {
  const ranked = filteredRecommendations.value
  if (!ranked.length) return []

  const groups = [{ title: 'Your Personal Mix', tracks: ranked.slice(0, 4) }]
  const categoryGroups = [
    { title: 'Late-Night Listening', signals: ['night', 'late', 'midnight', 'drive', 'after hours'] },
    { title: 'Nostalgic Favorites', signals: ['nostalgic', 'memory', 'yearning'] },
    { title: 'Cinematic Atmosphere', signals: ['cinematic', 'atmospheric'] },
    { title: 'Soft Focus', signals: ['calm', 'dreamy', 'study', 'focused'] },
  ]

  for (const group of categoryGroups) {
    const matches = ranked.filter(({ track }) => {
      const metadata = normalizedText([track.mood, ...(Array.isArray(track.tags) ? track.tags : [])].join(' '))
      return group.signals.some((signal) => metadata.includes(normalizedText(signal)))
    }).slice(0, 3)
    if (matches.length) groups.push({ title: group.title, tracks: matches })
  }

  return groups
})

const recommendedTracks = computed(() => filteredRecommendations.value.slice(0, 4).map((item) => item.track))

const recommendedLibraries = computed(() => libraries.value
  .map((library) => {
    const members = archiveTracks(library)
    const matchingMembers = members.filter((track) => scoreTrack(track, discoveryPreferences.value).score > 0)
    const metadataMatches = normalizedText(`${library.title} ${library.mood}`).split(' ').some((word) => word.length > 3 && normalizedText(`${discoveryPreferences.value.description} ${discoveryPreferences.value.moods.join(' ')}`).includes(word))
    return { library, members, matchingMembers, metadataMatches }
  })
  .filter((item) => item.members.length && (item.matchingMembers.length || item.metadataMatches)))

const imageUrl = (photo, width = 640) => photo?.startsWith('https://') ? photo : `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${width}&q=85`

let toastTimer
function notify(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2400)
}

function enterApp(validateEmail = true) {
  const trimmedEmail = email.value.trim()

  if (!trimmedEmail) {
    loginError.value = 'You need to log in first.'
    notify('You need to log in first.')
    return
  }

  if (validateEmail && !trimmedEmail.includes('@')) {
    loginError.value = 'Add a valid email to continue'
    notify('Add a valid email to continue')
    return
  }

  if (validateEmail) {
    const trimmedPassword = password.value.trim()
    if (!loginWithValidatedAccount(trimmedEmail, trimmedPassword)) {
      return
    }

    const matchedAccount = findAccountByEmail(trimmedEmail)
    if (matchedAccount?.name) {
      profileName.value = matchedAccount.name
    }
  }

  const derivedName = trimmedEmail.split('@')[0].replace(/[._-]+/g, ' ').trim()
  if (derivedName) {
    profileName.value = derivedName
  }

  loginError.value = ''
  welcome.value = false
  notify('Your sound is ready.')
}

function openCreateAccount() {
  loginError.value = ''
  showCreateAccount.value = true
  createAccountName.value = ''
  createAccountEmail.value = ''
  createAccountPassword.value = ''
}

function connectSpotify() {
  spotifyConnected.value = true
  notify('VS Code Spotify connected.')
}

function submitCreateAccount() {
  const name = createAccountName.value.trim()
  const emailAddress = createAccountEmail.value.trim()
  const passwordValue = createAccountPassword.value.trim()

  if (!name) {
    notify('Add your name to create an account')
    return
  }

  if (!emailAddress.includes('@')) {
    notify('Use a valid email to continue')
    return
  }

  if (findAccountByEmail(emailAddress)) {
    loginError.value = 'An account with that email already exists. Log in instead.'
    notify('An account with that email already exists. Log in instead.')
    return
  }

  accountRegistry.value.push({
    name,
    email: emailAddress,
    password: passwordValue,
  })
  persistAccountRegistry()

  email.value = emailAddress
  password.value = passwordValue
  profileName.value = name || 'THE NIGHT EXPLORER'
  loginError.value = ''
  showCreateAccount.value = false
  welcome.value = false
  notify('Account created. Your sound is ready.')
}

function logout() {
  clearTimeout(toastTimer)
  welcome.value = true
  activeView.value = 'home'
  email.value = ''
  password.value = ''
  newMessage.value = ''
  replyTarget.value = null
  showChatOptions.value = false
  showDeleteConfirm.value = false
  accountMenu.value = ''
  isExpanded.value = false
  isPlaying.value = false
  toast.value = ''
}

function toggleAccountMenu(location) {
  accountMenu.value = accountMenu.value === location ? '' : location
}

function openProfile() {
  accountMenu.value = ''
  activeView.value = 'profile'
}

async function generateSound() {
  if (isGenerating.value) return
  const submittedDescription = description.value.trim()
  const moods = [...new Set(selectedMoods.value.filter((mood) => moodOptions.includes(mood)))]

  if (!submittedDescription && !moods.length) {
    recommendationError.value = 'Describe your mood or select at least one mood to build your mix.'
    notify(recommendationError.value)
    return
  }

  isGenerating.value = true
  recommendationError.value = ''
  await nextTick()

  try {
    const preferences = {
      description: submittedDescription,
      moods,
      style: soundStyles.includes(selectedStyle.value) ? selectedStyle.value : soundStyles[0],
      submittedAt: new Date().toISOString(),
    }
    discoveryPreferences.value = preferences
    localStorage.setItem('synx-discovery-preferences', JSON.stringify(preferences))
    await nextTick()
    generated.value = true
    activeView.value = 'discover'
    notify('Your personalized recommendations are ready.')
  } catch (error) {
    recommendationError.value = 'We could not save your preferences. Your entries are still here; please try again.'
    if (import.meta.dev) console.error('[Synx recommendations] Generation failed:', error)
  } finally {
    isGenerating.value = false
  }
}

function selectSoundStyle(_index, item) {
  selectedStyle.value = item
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function trackAudioUrl(track) {
  return track?.audioUrl || track?.audio || ''
}

// ---------------------------------------------------------------------------
// Local audio status
// ---------------------------------------------------------------------------
// The server verifies every configured /music/... path against the real file
// system (existence, non-empty size, MP3 signature). We fetch that report once
// per page load instead of hitting the file system on every render.

function localAudioStatus(song) {
  if (!localAudioFileForSong(song?.id)) return 'unconfigured'
  return audioStatuses.value[String(song.id)] || 'unverified'
}

function hasVerifiedLocalAudio(song) {
  return localAudioStatus(song) === 'available'
}

// True when we KNOW the local file cannot play (missing or invalid). An
// 'unverified' status still allows an attempt; the media element reports the
// truth if the file turns out to be unavailable.
function localAudioBlocked(song) {
  const status = localAudioStatus(song)
  return status === 'missing' || status === 'invalid' || status === 'unconfigured'
}

function localAudioIssueMessage(song) {
  const status = localAudioStatus(song)
  const expectedPath = trackAudioUrl(song) || (localAudioFileForSong(song?.id) ? `/music/${localAudioFileForSong(song.id)}` : '/music/<filename>.mp3')
  const title = song?.title || 'This song'
  if (status === 'invalid') return `${title}'s local file failed audio validation. Replace it with a real MP3 at public${expectedPath}.`
  if (status === 'unconfigured') return `${title} has no local audio path configured.`
  return `${title} has no verified local MP3 yet. Add your authorized file at public${expectedPath}.`
}

async function loadAudioReport() {
  audioReportStatus.value = 'loading'
  try {
    const report = await $fetch('/api/music/report')
    const statuses = {}
    for (const entry of report?.songs || []) statuses[String(entry.songId)] = entry.status
    audioStatuses.value = statuses
    audioReportStatus.value = 'ready'
  } catch (error) {
    audioReportStatus.value = 'error'
    if (import.meta.dev) console.warn('[Synx] Could not load the local-audio report:', error)
  }
}

// Local MP3 first; fall back to the song's verified YouTube embed when the
// local file is missing or invalid. Never claims a source that is not there.
function playbackProviderFor(song) {
  if (hasVerifiedLocalAudio(song)) return 'audio'
  return getYouTubeVideoId(song) ? 'youtube' : 'audio'
}

function enqueueTrack(track) {
  if (!track) return
  if (manualQueue.value.some((queuedTrack) => queuedTrack.id === track.id)) {
    notify(`${track.title} is already in the queue.`)
    return
  }
  manualQueue.value.push(track)
  notify(`Added ${track.title} to the queue.`)
}

function removeQueuedTrack(trackId) {
  const manualIndex = manualQueue.value.findIndex((track) => track.id === trackId)
  if (manualIndex >= 0) {
    manualQueue.value.splice(manualIndex, 1)
    return
  }
  const currentIndex = playbackQueue.value.findIndex((track) => track.id === currentTrack.value?.id)
  const itemIndex = playbackQueue.value.findIndex((track, index) => index > currentIndex && track.id === trackId)
  if (itemIndex >= 0) playbackQueue.value.splice(itemIndex, 1)
}

function playQueuedTrack(track) {
  const remaining = upcomingTracks.value.filter((queuedTrack) => queuedTrack.id !== track.id)
  manualQueue.value = []
  playTrack(track, [track, ...remaining])
}

function toggleShuffle() {
  shuffleEnabled.value = !shuffleEnabled.value
}

function cycleRepeatMode() {
  repeatMode.value = repeatMode.value === 'off' ? 'all' : repeatMode.value === 'all' ? 'one' : 'off'
}

function getYouTubeVideoId(track) {
  return youtubeVideoIds.value[String(track?.id)] || track?.youtubeVideoId || ''
}

function trackSourceConfigured(track) {
  // A configured audioUrl alone is not a playable source — only a verified
  // local file or an existing YouTube video id counts.
  return Boolean(getYouTubeVideoId(track)) || hasVerifiedLocalAudio(track)
}

function openYouTubeConfig(track = currentTrack.value) {
  youtubeConfigTrack.value = track
  youtubeVideoIdInput.value = getYouTubeVideoId(track)
  showYouTubeConfig.value = true
}

function saveYouTubeVideoId() {
  const videoId = youtubeVideoIdInput.value.trim()
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    notify('Enter an 11-character YouTube video ID, not a video URL.')
    return
  }

  const track = youtubeConfigTrack.value
  if (!track) return
  youtubeVideoIds.value = { ...youtubeVideoIds.value, [String(track.id)]: videoId }
  localStorage.setItem('synx-youtube-video-ids', JSON.stringify(youtubeVideoIds.value))
  showYouTubeConfig.value = false
  notify('Video ID saved. Try Play to verify that YouTube allows this embed.')
}

function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiStatus.value = 'loading'
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      youtubeApiStatus.value = 'ready'
      resolve(window.YT)
    }

    let script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = () => {
        youtubeApiStatus.value = 'error'
        youtubeApiPromise = null
        reject(new Error('Could not load the official YouTube player API.'))
      }
      document.head.appendChild(script)
    }
  })

  return youtubeApiPromise
}

function updateYouTubeProgress() {
  if (!youtubePlayerReady || playbackProvider.value !== 'youtube') return
  currentTime.value = youtubePlayer.getCurrentTime() || 0
  durationSeconds.value = youtubePlayer.getDuration() || 0
}

function onYouTubeStateChange(event) {
  if (playbackProvider.value !== 'youtube') return
  if (youtubeEmbedFailed) return
  const state = event.data
  if (state === 1) {
    isPlaying.value = true
    playbackStatus.value = 'playing'
    audioError.value = ''
    clearInterval(youtubeProgressTimer)
    youtubeProgressTimer = setInterval(updateYouTubeProgress, 250)
  } else if (state === 2) {
    isPlaying.value = false
    playbackStatus.value = 'paused'
    updateYouTubeProgress()
    clearInterval(youtubeProgressTimer)
  } else if (state === 3 || state === -1) {
    isPlaying.value = false
    playbackStatus.value = 'loading'
  } else if (state === 5) {
    isPlaying.value = false
    playbackStatus.value = 'ready'
    updateYouTubeProgress()
  } else if (state === 0) {
    isPlaying.value = false
    updateYouTubeProgress()
    clearInterval(youtubeProgressTimer)
    onTrackEnded()
  }
}

function onYouTubePlayerError(event) {
  if (playbackProvider.value !== 'youtube') return
  const messages = {
    2: 'YouTube rejected this video ID.',
    5: 'This video cannot be played by the embedded HTML5 player.',
    100: 'This YouTube video is unavailable or private.',
    101: 'The owner does not allow this video to be embedded.',
    150: 'The owner does not allow this video to be embedded.',
    153: 'YouTube could not verify the embed request. Check the browser referrer settings.',
  }
  youtubeEmbedFailed = true
  isPlaying.value = false
  playbackStatus.value = 'error'
  audioError.value = messages[event.data] || `YouTube player error ${event.data}.`
  clearInterval(youtubeProgressTimer)
  if (import.meta.dev) console.error('[Synx YouTube] Embed playback failed:', { track: currentTrack.value?.title, code: event.data })
  notify(audioError.value)
}

async function ensureYouTubePlayer() {
  const YT = await loadYouTubeAPI()
  await nextTick()
  if (youtubePlayerReady && youtubePlayer) return youtubePlayer
  if (!youtubeMount.value) throw new Error('The YouTube player mount is unavailable.')

  return new Promise((resolve, reject) => {
    try {
      youtubePlayer = new YT.Player(youtubeMount.value, {
        width: '356',
        height: '200',
        playerVars: {
          autoplay: 0,
          controls: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1,
        },
        events: {
          onReady(event) {
            youtubePlayerReady = true
            event.target.setVolume(volume.value)
            resolve(event.target)
          },
          onStateChange: onYouTubeStateChange,
          onError: (event) => {
            onYouTubePlayerError(event)
            reject(new Error(audioError.value))
          },
          onAutoplayBlocked() {
            isPlaying.value = false
            playbackStatus.value = 'paused'
            audioError.value = 'YouTube blocked automatic playback. Press Play in the embedded player.'
          },
        },
      })
    } catch (error) {
      reject(error)
    }
  })
}

async function togglePlayback() {
  const track = currentTrack.value
  if (!track) return

  // Resolve the provider from the CURRENT track so Play can never keep
  // playing a previous song while another one is displayed.
  if (playbackProviderFor(track) === 'youtube') {
    playbackProvider.value = 'youtube'
    if (!youtubePlayerReady || !youtubePlayer) {
      playbackStatus.value = 'loading'
      try {
        await ensureYouTubePlayer()
      } catch (error) {
        isPlaying.value = false
        playbackStatus.value = 'error'
        audioError.value = error instanceof Error ? error.message : 'YouTube could not load the embedded player.'
        notify(audioError.value)
        return
      }
    }
    // If the embed is empty or showing a different video than the selected track, load the right one first.
    const configuredVideoId = getYouTubeVideoId(track)
    const loadedVideoId = youtubePlayer?.getVideoData?.()?.video_id || ''
    if (configuredVideoId && (youtubeEmbedFailed || loadedVideoId !== configuredVideoId)) {
      youtubeEmbedFailed = false
      playbackStatus.value = 'loading'
      youtubePlayer.loadVideoById(configuredVideoId)
      youtubePlayer.playVideo()
      return
    }
    if (isPlaying.value) youtubePlayer.pauseVideo()
    else youtubePlayer.playVideo()
    return
  }

  const audio = audioElement.value
  if (!audio) return

  if (!audio.paused) {
    playbackRequestId += 1
    audio.pause()
    return
  }

  const source = trackAudioUrl(track)
  if (!source || localAudioBlocked(track)) {
    // Missing/invalid local audio: stop cleanly, never continue the previous
    // song, and explain exactly which file is expected.
    playbackRequestId += 1
    audio.pause()
    isPlaying.value = false
    playbackStatus.value = 'unavailable'
    audioError.value = localAudioIssueMessage(track)
    notify(audioError.value)
    return
  }

  const requestId = ++playbackRequestId
  playbackProvider.value = 'audio'
  youtubePlayer?.pauseVideo?.()
  try {
    audioError.value = ''
    playbackStatus.value = 'loading'
    const resolvedSource = new URL(source, window.location.href).href
    if (audio.src !== resolvedSource) {
      audio.src = resolvedSource
      audio.load()
    }
    audio.volume = volume.value / 100
    await audio.play()
    if (requestId !== playbackRequestId || currentTrack.value?.id !== track.id || trackAudioUrl(currentTrack.value) !== source) {
      audio.pause()
    }
  } catch (error) {
    if (requestId !== playbackRequestId || currentTrack.value?.id !== track.id) return
    audio.pause()
    isPlaying.value = false
    if (audio.error) return // the media element error handler reports this
    playbackStatus.value = 'paused'
    audioError.value = error instanceof DOMException && error.name === 'NotAllowedError'
      ? 'Your browser blocked automatic playback. Press Play to start this track.'
      : 'Playback could not start. Check the audio file and try again.'
    if (import.meta.dev) console.error('[Synx audio] Playback failed:', { track: track.title, source, error })
    notify(audioError.value)
  }
}

async function playTrack(track, queue = tracks) {
  if (!track) return
  playbackRequestId += 1
  const audio = audioElement.value
  const requestId = playbackRequestId
  const sameTrack = currentTrack.value?.id === track.id
  const provider = playbackProviderFor(track)
  const videoId = getYouTubeVideoId(track)
  const normalizedQueue = queue.length ? [...queue] : [track]
  if (!normalizedQueue.some((queuedTrack) => queuedTrack.id === track.id)) normalizedQueue.unshift(track)
  playbackQueue.value = normalizedQueue

  // Clicking the track that is already selected toggles play/pause.
  if (sameTrack && provider === playbackProvider.value && (videoId || trackAudioUrl(track))) {
    await togglePlayback()
    return
  }

  if (currentTrack.value && currentTrack.value.id !== track.id) {
    playHistory.value = [...playHistory.value, currentTrack.value].slice(-50)
  }
  currentTrack.value = track.albumArtwork ? { ...track, cover: track.albumArtwork } : track
  currentTime.value = 0
  durationSeconds.value = 0
  audioError.value = ''

  if (provider === 'youtube') {
    playbackProvider.value = 'youtube'
    youtubeEmbedFailed = false
    isPlaying.value = false
    playbackStatus.value = 'loading'
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }

    try {
      await ensureYouTubePlayer()
      if (requestId !== playbackRequestId || currentTrack.value?.id !== track.id) return
      youtubePlayer.loadVideoById(videoId)
      youtubePlayer.playVideo()
    } catch (error) {
      if (requestId !== playbackRequestId || currentTrack.value?.id !== track.id) return
      isPlaying.value = false
      playbackStatus.value = 'error'
      audioError.value = error instanceof Error ? error.message : 'YouTube could not load this embed.'
      notify(audioError.value)
      if (import.meta.dev) console.error('[Synx YouTube] Player initialization failed:', { track: track.title, videoId, error })
    }
    return
  }

  // Local audio provider — one shared <audio> element for the whole app.
  playbackProvider.value = 'audio'
  youtubePlayer?.pauseVideo?.()
  if (!audio) return

  const source = trackAudioUrl(track)
  if (!source || localAudioBlocked(track)) {
    // The song keeps its identity/artwork, but playback is clearly unavailable:
    // stop any previous audio so the UI never shows this song as playing.
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    isPlaying.value = false
    playbackStatus.value = 'unavailable'
    audioError.value = localAudioIssueMessage(track)
    notify(audioError.value)
    return
  }

  audio.pause()
  audio.src = source
  audio.volume = volume.value / 100
  audio.load()
  isPlaying.value = false
  playbackStatus.value = 'loading'
  try {
    await audio.play()
    if (requestId !== playbackRequestId || currentTrack.value?.id !== track.id) audio.pause()
  } catch (error) {
    if (requestId !== playbackRequestId || currentTrack.value?.id !== track.id) return
    if (audio.error) return // the media element error handler reports this
    isPlaying.value = false
    playbackStatus.value = 'paused'
    audioError.value = error instanceof DOMException && error.name === 'NotAllowedError'
      ? 'Your browser blocked automatic playback. Press Play to start this track.'
      : 'Playback could not start. Check the audio file and try again.'
    if (import.meta.dev) console.error('[Synx audio] Playback failed:', { track: track.title, source, error })
    notify(audioError.value)
  }
}

function advanceTrack(automatic = false) {
  const queue = playbackQueue.value.length ? playbackQueue.value : tracks
  if (automatic && repeatMode.value === 'one') {
    if (playbackProvider.value === 'youtube' && youtubePlayerReady) {
      youtubePlayer.seekTo(0, true)
      youtubePlayer.playVideo()
    } else if (audioElement.value) {
      audioElement.value.currentTime = 0
      audioElement.value.play().catch((error) => {
        isPlaying.value = false
        playbackStatus.value = 'error'
        audioError.value = 'Playback could not restart. Check the audio file and try again.'
        if (import.meta.dev) console.error('[Synx audio] Repeat playback failed:', error)
      })
    }
    return
  }

  if (manualQueue.value.length) {
    const nextTrack = manualQueue.value.shift()
    const currentIndex = queue.findIndex((track) => track.id === currentTrack.value?.id)
    const continuation = currentIndex < 0 ? queue : queue.slice(currentIndex + 1)
    playTrack(nextTrack, [nextTrack, ...manualQueue.value, ...continuation])
    manualQueue.value = []
    return
  }

  const index = queue.findIndex((track) => track.id === currentTrack.value?.id)
  let nextTrack
  if (shuffleEnabled.value) {
    const candidates = queue.filter((track) => track.id !== currentTrack.value?.id)
    if (candidates.length) nextTrack = candidates[Math.floor(Math.random() * candidates.length)]
    else if (repeatMode.value === 'all') nextTrack = currentTrack.value
  } else if (index >= 0 && index < queue.length - 1) {
    nextTrack = queue[index + 1]
  } else if (index < 0 && queue.length) {
    nextTrack = queue[0]
  } else if (repeatMode.value === 'all' && queue.length) {
    nextTrack = queue[0]
  }

  if (!nextTrack) {
    if (automatic) {
      isPlaying.value = false
      playbackStatus.value = 'ended'
    } else notify('End of queue.')
    return
  }
  playTrack(nextTrack, queue)
}

function playNextTrack() {
  advanceTrack(false)
}

function onTrackEnded() {
  advanceTrack(true)
}

function playPreviousTrack() {
  if (playbackProvider.value === 'youtube' && youtubePlayerReady && currentTime.value > 3) {
    youtubePlayer.seekTo(0, true)
    return
  }
  if (audioElement.value && currentTime.value > 3) {
    audioElement.value.currentTime = 0
    return
  }
  if (shuffleEnabled.value && playHistory.value.length) {
    const previousTrack = playHistory.value.at(-1)
    playHistory.value = playHistory.value.slice(0, -1)
    playTrack(previousTrack, [previousTrack, ...playbackQueue.value.filter((track) => track.id !== previousTrack.id)])
    return
  }
  const queue = playbackQueue.value.length ? playbackQueue.value : tracks
  const index = queue.findIndex((track) => track.id === currentTrack.value?.id)
  const previousIndex = index < 0 ? queue.length - 1 : index - 1
  if (previousIndex >= 0) playTrack(queue[previousIndex], queue)
}

function seekTo(value) {
  if (playbackProvider.value === 'youtube' && youtubePlayerReady) {
    youtubePlayer.seekTo(Math.min(durationSeconds.value, Math.max(0, value)), true)
    return
  }
  if (!audioElement.value || !Number.isFinite(durationSeconds.value)) return
  audioElement.value.currentTime = Math.min(durationSeconds.value, Math.max(0, value))
}

function onAudioMetadata() {
  if (playbackProvider.value !== 'audio') return
  durationSeconds.value = Number.isFinite(audioElement.value?.duration) ? audioElement.value.duration : 0
}

function onAudioTimeUpdate() {
  if (playbackProvider.value !== 'audio') return
  currentTime.value = audioElement.value?.currentTime || 0
}

function onAudioPlaying() {
  if (playbackProvider.value !== 'audio') return
  isPlaying.value = true
  playbackStatus.value = 'playing'
}

function onAudioPaused() {
  if (playbackProvider.value !== 'audio') return
  isPlaying.value = false
  if (playbackStatus.value === 'playing') playbackStatus.value = 'paused'
}

function onAudioError() {
  if (playbackProvider.value !== 'audio' || !audioElement.value?.getAttribute('src')) return
  isPlaying.value = false
  playbackStatus.value = 'error'
  const track = currentTrack.value
  const expectedPath = trackAudioUrl(track) || '/music/<filename>.mp3'
  audioError.value = track
    ? `Could not play the local audio for ${track.title}. Expected a valid MP3 at ${expectedPath}.`
    : 'This audio file could not be loaded. Check its path, format, and permissions.'
  if (import.meta.dev) console.error('[Synx audio] Media element error:', { track: track?.title, source: audioElement.value.currentSrc, code: audioElement.value.error?.code })
  notify(audioError.value)
}

function toggleSaved(track) {
  savedTracks.value = savedTracks.value.includes(track.id)
    ? savedTracks.value.filter((id) => id !== track.id)
    : [...savedTracks.value, track.id]
  notify(savedTracks.value.includes(track.id) ? 'Saved to your sound archive' : 'Removed from saved tracks')
}

function createLibrary() {
  const title = libraryName.value.trim()
  if (!title) return notify('Give your new archive a name')
  libraries.value = [{ id: Date.now(), title, subtitle: 'A SOUND THAT IS YOURS', count: 0, trackIds: [], mood: 'NEW / UNDEFINED', cover: 'photo-1470225620780-dba8ba36b745', color: '#476477', saved: true }, ...libraries.value]
  libraryName.value = ''
  showCreateLibrary.value = false
  activeView.value = 'library'
  notify('New archive created')
}

function openArchive(library) {
  selectedLibraryId.value = library.id
  libraryTab.value = 'Archive'
  activeView.value = 'library'
}

function setArchiveMembership(library, track, shouldAdd) {
  if (!library) return
  const trackIds = new Set(Array.isArray(library.trackIds) ? library.trackIds.map(Number) : [])
  if (shouldAdd) trackIds.add(track.id)
  else trackIds.delete(track.id)
  library.trackIds = [...trackIds]
  library.count = archiveTracks(library).length
}

function isTrackInArchive(library, track) {
  return Array.isArray(library?.trackIds) && library.trackIds.some((id) => String(id) === String(track.id))
}

function playArchive(library) {
  const queue = archiveTracks(library)
  if (!queue.length) {
    notify(`${library.title} is empty. Add songs to this archive first.`)
    return
  }
  playTrack(queue[0], queue)
}

function setReplyTarget(message) {
  clearTimeout(messagePressTimer)
  messageSwipe.value = null
  activeMessageActionsId.value = null
  replyTarget.value = {
    id: message.id,
    from: message.from,
    text: message.text,
    track: message.track || null,
  }
}

function startMessageSwipe(event, message) {
  if (event.button !== undefined && event.button !== 0) return
  if (event.target.closest?.('button, a, input, textarea')) return

  clearTimeout(messagePressTimer)
  activeMessageActionsId.value = null
  messageSwipe.value = {
    id: message.id,
    from: message.from,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offset: 0,
    longPressed: false,
  }
  event.currentTarget.setPointerCapture?.(event.pointerId)
  messagePressTimer = setTimeout(() => {
    const swipe = messageSwipe.value
    if (swipe?.id === message.id && swipe.pointerId === event.pointerId && Math.abs(swipe.offset) < 10) {
      swipe.longPressed = true
      activeMessageActionsId.value = message.id
    }
  }, 500)
}

function moveMessageSwipe(event, message) {
  const swipe = messageSwipe.value
  if (!swipe || swipe.id !== message.id || swipe.pointerId !== event.pointerId) return
  if (swipe.longPressed) return

  const horizontalOffset = event.clientX - swipe.startX
  const verticalOffset = event.clientY - swipe.startY
  if (Math.abs(horizontalOffset) > 10 || Math.abs(verticalOffset) > 10) clearTimeout(messagePressTimer)
  if (Math.abs(verticalOffset) > 14 && Math.abs(verticalOffset) > Math.abs(horizontalOffset)) {
    messageSwipe.value = null
    return
  }

  swipe.offset = swipe.from === 'You'
    ? Math.max(-58, Math.min(0, horizontalOffset))
    : Math.min(58, Math.max(0, horizontalOffset))
}

function endMessageSwipe(event, message) {
  const swipe = messageSwipe.value
  if (!swipe || swipe.id !== message.id || swipe.pointerId !== event.pointerId) return

  clearTimeout(messagePressTimer)
  const horizontalOffset = event.clientX - swipe.startX
  const verticalOffset = event.clientY - swipe.startY
  const longPressed = swipe.longPressed
  messageSwipe.value = null

  const replySwipeCompleted = swipe.from === 'You'
    ? horizontalOffset <= -54 && -horizontalOffset > Math.abs(verticalOffset) * 1.3
    : horizontalOffset >= 54 && horizontalOffset > Math.abs(verticalOffset) * 1.3

  if (!longPressed && replySwipeCompleted) {
    setReplyTarget(message)
  }
}

function cancelMessageSwipe() {
  clearTimeout(messagePressTimer)
  messageSwipe.value = null
}

function openMessageActions(event, message) {
  event.preventDefault()
  clearTimeout(messagePressTimer)
  activeMessageActionsId.value = message.id
}

function closeMessageActions() {
  activeMessageActionsId.value = null
}

function cancelReply() {
  replyTarget.value = null
}

function selectChat(index) {
  activeFriend.value = index
  replyTarget.value = null
  newMessage.value = ''
  activeMessageActionsId.value = null
  showChatOptions.value = false
}

function requestDeleteConversation() {
  showChatOptions.value = false
  showDeleteConfirm.value = true
}

function deleteConversation() {
  conversations.value[chatFriends[activeFriend.value].handle] = []
  replyTarget.value = null
  activeMessageActionsId.value = null
  newMessage.value = ''
  showDeleteConfirm.value = false
  notify('Conversation deleted')
}

function toggleReaction(messageId, emoji) {
  const message = messages.value.find((item) => item.id === messageId)
  if (!message) return

  const reactions = message.reactions || {}
  const users = reactions[emoji] || []

  if (users.includes('You')) {
    reactions[emoji] = users.filter((user) => user !== 'You')
    if (!reactions[emoji].length) delete reactions[emoji]
  } else {
    reactions[emoji] = [...users, 'You']
  }

  message.reactions = reactions
  closeMessageActions()
}

function unsendMessage(messageId) {
  const messageIndex = messages.value.findIndex((message) => message.id === messageId && message.from === 'You')
  if (messageIndex === -1) return

  messages.value.splice(messageIndex, 1)
  if (replyTarget.value?.id === messageId) replyTarget.value = null
  closeMessageActions()
  notify('Message unsent')
}

function shareCurrentSong() {
  if (!currentTrack.value) {
    notify('No track selected to share')
    return
  }

  messages.value.push({
    id: `msg-${Date.now()}`,
    from: 'You',
    text: 'Listening to this right now.',
    track: currentTrack.value,
    reactions: { '🎵': ['You'] },
    replyTo: null,
    timestamp: 'JUST NOW',
  })

  notify('Track shared to chat')
}

async function searchSpotify(query = search.value) {
  const value = query.trim()

  if (!value) {
    notify('Type a song name to search Spotify')
    return
  }

  spotifySearchQuery.value = value
  spotifySearchLoading.value = true
  spotifySearchError.value = ''
  spotifySearchResults.value = []
  selectedSpotifyTrack.value = null

  try {
    const result = await $fetch('/api/spotify/search', { query: { q: value } })
    spotifySearchResults.value = result.tracks
  } catch (error) {
    spotifySearchError.value = error.data?.statusMessage || 'Spotify search is unavailable. Check the Spotify API credentials and try again.'
  } finally {
    spotifySearchLoading.value = false
  }
}

function sendMessage() {
  const text = newMessage.value.trim()
  if (!text) return

  messages.value.push({
    id: `msg-${Date.now()}`,
    from: 'You',
    text,
    reactions: {},
    replyTo: replyTarget.value ? { ...replyTarget.value } : null,
    timestamp: 'JUST NOW',
  })

  newMessage.value = ''
  replyTarget.value = null
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/share/midnight-drive`)
    notify('Share link copied')
  } catch {
    notify('Your share card is ready to share')
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') isExpanded.value = false
}

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

function toggleVolume() {
  if (volume.value === 0) {
    volume.value = previousVolume.value || 50
    return
  }

  previousVolume.value = volume.value
  volume.value = 0
}

watch(volume, (value) => {
  if (playbackProvider.value === 'youtube' && youtubePlayerReady) youtubePlayer.setVolume(value)
  else if (audioElement.value) audioElement.value.volume = value / 100
})

onMounted(() => {
  if (audioElement.value) audioElement.value.volume = volume.value / 100
  loadAudioReport()
  loadYouTubeAPI().catch((error) => {
    youtubeApiStatus.value = 'error'
    if (import.meta.dev) console.warn('[Synx YouTube] IFrame API could not be loaded:', error)
  })
  try {
    const savedVideoIds = localStorage.getItem('synx-youtube-video-ids')
    const parsedVideoIds = savedVideoIds ? JSON.parse(savedVideoIds) : {}
    if (parsedVideoIds && typeof parsedVideoIds === 'object' && !Array.isArray(parsedVideoIds)) youtubeVideoIds.value = parsedVideoIds
  } catch {
    localStorage.removeItem('synx-youtube-video-ids')
  }
  const savedTheme = localStorage.getItem('synx-theme')
  if (savedTheme === 'dark' || savedTheme === 'light') theme.value = savedTheme

  try {
    const savedPreferences = localStorage.getItem('synx-discovery-preferences')
    if (savedPreferences) {
      const preferences = JSON.parse(savedPreferences)
      if (preferences && typeof preferences === 'object') {
        const moods = Array.isArray(preferences.moods) ? preferences.moods.filter((mood) => moodOptions.includes(mood)) : []
        if (typeof preferences.description === 'string') description.value = preferences.description
        selectedMoods.value = moods
        if (soundStyles.includes(preferences.style)) selectedStyle.value = preferences.style
        discoveryPreferences.value = {
          description: description.value.trim(),
          moods: [...moods],
          style: selectedStyle.value,
          submittedAt: typeof preferences.submittedAt === 'string' ? preferences.submittedAt : '',
        }
        generated.value = Boolean(preferences.submittedAt)
      }
    }
  } catch {
    localStorage.removeItem('synx-discovery-preferences')
  }

  accountRegistry.value = getStoredAccounts()

  const saved = localStorage.getItem('synx-state')
  if (!saved) return
  try {
    const state = JSON.parse(saved)
    if (Array.isArray(state.savedTracks)) savedTracks.value = state.savedTracks
    if (Array.isArray(state.libraries)) libraries.value = state.libraries.map((library) => {
      const starterTracks = starterArchiveTrackIds[library.id]
      const isStarterArchive = library.id <= 3 && ['Midnight drive', 'Soft focus', 'After hours'].includes(library.title)
      return {
        ...library,
        trackIds: Array.isArray(library.trackIds) ? library.trackIds : isStarterArchive ? [...starterTracks] : [],
      }
    })
  } catch {
    localStorage.removeItem('synx-state')
  }
})

onBeforeUnmount(() => {
  clearInterval(youtubeProgressTimer)
  youtubePlayer?.destroy?.()
  youtubePlayer = null
  youtubePlayerReady = false
  audioElement.value?.pause()
  if (audioElement.value) audioElement.value.removeAttribute('src')
})

watch([savedTracks, libraries], () => {
  if (import.meta.client) localStorage.setItem('synx-state', JSON.stringify({ savedTracks: savedTracks.value, libraries: libraries.value }))
}, { deep: true })

watch(theme, (value) => {
  if (import.meta.client) localStorage.setItem('synx-theme', value)
})
</script>

<template>
  <div class="app-shell" @keydown="handleKeydown">
    <audio ref="audioElement" preload="metadata" @loadedmetadata="onAudioMetadata" @durationchange="onAudioMetadata" @timeupdate="onAudioTimeUpdate" @waiting="playbackStatus = 'loading'" @canplay="playbackStatus = isPlaying ? 'playing' : 'paused'" @playing="onAudioPlaying" @pause="onAudioPaused" @ended="onTrackEnded" @error="onAudioError"></audio>
    <div v-show="playbackProvider === 'youtube'" class="youtube-player-window" aria-label="YouTube embedded player">
      <div ref="youtubeMount" class="youtube-player-mount"></div>
      <span class="youtube-player-caption">YOUTUBE EMBED · {{ currentTrack?.title }}</span>
    </div>
    <Iridescence
      :color="theme === 'dark' ? [0.46, 0.62, 0.76] : [0.95, 0.42, 0.24]"
      :speed="0.8"
      :amplitude="0.08"
      :mouse-react="true"
    />
    <section v-if="welcome" class="welcome-screen" :data-theme="theme">
      <div class="welcome-grain" aria-hidden="true"></div>
      <header class="welcome-topline">
        <a class="wordmark" href="#top" aria-label="SYNX home">SYNX<span class="wordmark-dot">.</span></a>
        <span class="micro-label">PERSONAL MUSIC IDENTITY ENGINE <i>//</i> EST. 2025</span>
        <button class="theme-toggle" :aria-label="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`" :title="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`" @click="toggleTheme"><span>{{ theme === 'light' ? '☾' : '☼' }}</span><small>{{ theme === 'light' ? 'DARK' : 'LIGHT' }}</small></button>
        <button class="text-button" @click="enterApp">ENTER AS GUEST <span>↗</span></button>
      </header>
      <div class="welcome-grid" id="top">
        <main class="welcome-copy">
          <div class="fuzzy-eyebrow">
            <span class="live-dot"></span>
            <FuzzyText class="fuzzy-tagline" :font-size="'clamp(0.7rem, 1vw, 1rem)'" :font-weight="700" :base-intensity="0.15" :hover-intensity="0.4" :fuzz-range="12" :color="theme === 'dark' ? '#f5f2e9' : '#171714'">YOUR FREQUENCY IS UNIQUE</FuzzyText>
          </div>
          <div class="fuzzy-headline">
            <FuzzyText class="fuzzy-title-line" :font-size="'clamp(3.5rem, 7vw, 8rem)'" :font-weight="900" :base-intensity="0.18" :hover-intensity="0.52" :fuzz-range="20" :color="theme === 'dark' ? '#f5f2e9' : '#171714'">YOUR SOUND.</FuzzyText>
            <FuzzyText class="fuzzy-title-line" :font-size="'clamp(3.5rem, 7vw, 8rem)'" :font-weight="900" :base-intensity="0.18" :hover-intensity="0.52" :fuzz-range="20" :color="theme === 'dark' ? '#f5f2e9' : '#171714'">YOUR IDENTITY<span class="orange-period">.</span></FuzzyText>
          </div>
          <p class="welcome-description">Don't search for your music.<br><strong>Describe yourself. Let sound find you.</strong></p>
          <div class="welcome-art" aria-label="A record spinning in a warm, atmospheric listening room">
            <img :src="imageUrl('photo-1519608487953-e999c86e7455', 1200)" alt="Twilight sky above a city, in the colors of a late-night drive" />
            <div class="art-stamp">SIDE A<br><span>001—SYNX</span></div>
            <div class="art-caption"><span>FIELD RECORDING 001</span><b>THE NIGHT, IN YOUR OWN WORDS.</b></div>
            <div class="record" aria-hidden="true"><div class="record-label">S<span>✳</span></div></div>
            <div class="art-equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          </div>
          <div class="welcome-footnote"><span>01 / 03</span><span>MOOD IS A MAP. MUSIC IS THE PLACE.</span><span>SCROLL TO FEEL</span></div>
        </main>
        <aside class="login-panel">
          <div class="panel-top"><span>SYNX SYSTEM // 01</span><span>● ONLINE</span></div>
          <div v-if="showCreateAccount" class="login-inner create-account-panel">
            <p class="eyebrow">NEW SIGNAL</p>
            <h2>BUILD<br>YOUR IDENTITY<span>.</span></h2>
            <p class="login-intro">Start your unique sound profile<br>and let the rest of the world find you.</p>
            <form @submit.prevent="submitCreateAccount">
              <label for="create-name">FULL NAME</label>
              <input id="create-name" v-model="createAccountName" type="text" placeholder="Your name" autocomplete="name" />
              <label for="create-email">EMAIL ADDRESS</label>
              <input id="create-email" v-model="createAccountEmail" type="email" placeholder="you@somewhere.com" autocomplete="email" />
              <label for="create-password">PASSWORD</label>
              <input id="create-password" v-model="createAccountPassword" type="password" placeholder="Create a password" autocomplete="new-password" />
              <button type="button" class="switch-button switch-light spotify-connect" @click="connectSpotify">
                <span class="spotify-mark">♪</span>
                {{ spotifyConnected ? 'VS CODE SPOTIFY CONNECTED' : 'CONNECT VS CODE SPOTIFY' }}
              </button>
              <button class="switch-button switch-orange" type="submit">CREATE ACCOUNT <span>↗</span></button>
            </form>
            <button class="create-account back-to-login" @click="showCreateAccount = false">BACK TO LOGIN <strong>↩</strong></button>
          </div>
          <div v-else class="login-inner">
            <p class="eyebrow">WELCOME TO YOUR FREQUENCY</p>
            <h2>COME ON<br>IN<span>.</span></h2>
            <p class="login-intro">A whole library, built around<br>the person you already are.</p>
            <form @submit.prevent="enterApp(true)">
              <label for="email">EMAIL ADDRESS</label>
              <input id="email" v-model="email" type="email" placeholder="you@somewhere.com" autocomplete="email" />
              <label for="password">PASSWORD <span class="optional">OPTIONAL FOR DEMO</span></label>
              <input id="password" v-model="password" type="password" placeholder="Anything works here" autocomplete="current-password" />
              <p v-if="loginError" class="login-error">{{ loginError }}</p>
              <button class="switch-button switch-orange" type="submit">LOG IN <span>↗</span></button>
            </form>
            <button class="switch-button switch-light" @click="enterApp"><span class="google-g">G</span> CONTINUE WITH GOOGLE</button>
            <button class="create-account" @click="openCreateAccount">NEW AROUND HERE? <strong>CREATE ACCOUNT ↗</strong></button>
            <button class="forgot" @click="notify('Demo mode: no password needed.')">FORGOT PASSWORD?</button>
          </div>
          <div class="panel-bottom"><span>{{ showCreateAccount ? 'YOUR SOUND STARTS HERE' : 'NO PASSWORD NEEDED FOR THE DEMO' }}</span><span>{{ showCreateAccount ? 'SIGNAL UNLOCKED' : '↑ PRESS PLAY ON YOU' }}</span></div>
        </aside>
      </div>
      <div class="welcome-marquee" aria-hidden="true"><span>DON'T SEARCH FOR YOUR MUSIC&nbsp; ✳ &nbsp;DESCRIBE YOURSELF&nbsp; ✳ &nbsp;SYNX FINDS YOUR SOUND&nbsp; ✳ &nbsp;</span><span>DON'T SEARCH FOR YOUR MUSIC&nbsp; ✳ &nbsp;DESCRIBE YOURSELF&nbsp; ✳ &nbsp;SYNX FINDS YOUR SOUND&nbsp; ✳ &nbsp;</span></div>
    </section>

    <div v-else class="dashboard" :data-theme="theme" :class="{ 'player-expanded': isExpanded }">
      <aside class="sidebar">
        <a class="wordmark sidebar-brand" href="#home" @click.prevent="activeView = 'home'">SYNX<span class="wordmark-dot">.</span></a>
        <div class="side-section-label">YOUR SPACE <span>01—06</span></div>
        <nav class="side-nav" aria-label="Main navigation">
          <button v-for="item in navigation" :key="item.id" :class="{ active: activeView === item.id }" @click="activeView = item.id">
            <span class="nav-icon">{{ item.icon }}</span><span>{{ item.label }}</span><span v-if="item.count" class="nav-count">{{ item.count }}</span>
          </button>
        </nav>
        <div class="side-library-heading"><span>YOUR ARCHIVES</span><button aria-label="Create a library" @click="showCreateLibrary = true">+</button></div>
        <button v-for="library in libraries" :key="library.id" class="side-library" @click="activeView = 'library'">
          <span class="side-library-mark" :style="{ backgroundColor: library.color }"></span>{{ library.title }}
        </button>
        <div class="sidebar-spacer"></div>
        <div class="sidebar-bottom">
          <div class="avatar avatar-small">{{ profileName.charAt(0).toUpperCase() || 'Z' }}</div><div class="sidebar-user"><strong>{{ profileName }}</strong><span>FREE FREQUENCY</span></div><div class="account-menu-anchor"><button class="more-button" aria-label="Account options" :aria-expanded="accountMenu === 'sidebar'" @click="toggleAccountMenu('sidebar')">···</button><div v-if="accountMenu === 'sidebar'" class="account-menu account-menu-popover-sidebar" role="menu"><button type="button" role="menuitem" @click="openProfile">MY PROFILE ↗</button><button type="button" role="menuitem" @click="logout">LOG OUT</button></div></div>
        </div>
      </aside>

      <header class="mobile-header"><a class="wordmark" href="#home" @click.prevent="activeView = 'home'">SYNX<span class="wordmark-dot">.</span></a><div class="account-menu-anchor"><button class="mobile-avatar" aria-label="Account options" :aria-expanded="accountMenu === 'mobile'" @click="toggleAccountMenu('mobile')">Z</button><div v-if="accountMenu === 'mobile'" class="account-menu account-menu-popover-top" role="menu"><button type="button" role="menuitem" @click="openProfile">MY PROFILE ↗</button><button type="button" role="menuitem" @click="logout">LOG OUT</button></div></div></header>
      <section class="mobile-player" aria-label="Music player">
        <button class="mobile-player-art" type="button" aria-label="Open expanded player" @click="isExpanded = true"><img :src="imageUrl(currentTrack?.cover || tracks[2].cover, 100)" :alt="currentTrack?.title" /></button>
        <button class="mobile-player-track" type="button" @click="isExpanded = true"><strong>{{ currentTrack?.title }}</strong><small>{{ currentTrack?.artist }}</small></button>
        <button type="button" class="mobile-player-control" aria-label="Previous track" @click="playPreviousTrack">|◀</button>
        <button type="button" class="mobile-player-control mobile-player-play" :aria-label="isPlaying ? 'Pause' : 'Play'" @click="togglePlayback">{{ isPlaying ? 'Ⅱ' : '▶' }}</button>
        <button type="button" class="mobile-player-control" aria-label="Next track" @click="playNextTrack">▶|</button>
        <span class="mobile-player-progress" :style="{ '--play-progress': `${progressPercent}%` }"></span>
      </section>

      <main class="main-content">
        <header class="topbar">
          <div class="breadcrumb"><span>YOUR SPACE</span><b>/</b><strong>{{ navigation.find(item => item.id === activeView)?.label.toUpperCase() }}</strong></div>
          <div class="search-box"><span>⌕</span><input v-model="search" placeholder="Search songs on Spotify..." aria-label="Search Spotify songs" @keydown.enter.prevent="searchSpotify()" /><button type="button" class="spotify-search-button" aria-label="Search songs on Spotify" @click="searchSpotify()">SEARCH</button></div>
          <button class="theme-toggle" :aria-label="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`" :title="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`" @click="toggleTheme"><span>{{ theme === 'light' ? '☾' : '☼' }}</span><small>{{ theme === 'light' ? 'DARK' : 'LIGHT' }}</small></button>
          <button class="notification-button" aria-label="Notifications" @click="notify('You are all caught up.')">♧<i></i></button>
          <div class="account-menu-anchor"><button class="top-avatar" aria-label="Account options" :aria-expanded="accountMenu === 'top'" @click="toggleAccountMenu('top')">Z</button><div v-if="accountMenu === 'top'" class="account-menu account-menu-popover-top" role="menu"><button type="button" role="menuitem" @click="openProfile">MY PROFILE ↗</button><button type="button" role="menuitem" @click="logout">LOG OUT</button></div></div>
        </header>

        <template v-if="spotifySearchQuery">
          <section class="spotify-results-section">
            <div class="page-heading spotify-results-heading"><span class="section-index">SPOTIFY / TRACK SEARCH</span><h1>SONGS FOR<br><em>“{{ spotifySearchQuery }}”.</em></h1><p>{{ spotifySearchLoading ? 'Searching Spotify...' : `${spotifySearchResults.length} tracks found` }}</p><button class="inline-link" type="button" @click="spotifySearchQuery = ''; selectedSpotifyTrack = null">← BACK TO SYNX</button></div>
            <p v-if="spotifySearchError" class="spotify-search-message">{{ spotifySearchError }}</p>
            <div v-else-if="spotifySearchLoading" class="spotify-search-message" role="status">Searching Spotify’s catalog...</div>
            <p v-else-if="!spotifySearchResults.length" class="spotify-search-message">No tracks found. Try another song or artist.</p>
            <div v-else class="spotify-results-list">
              <article v-for="(track, index) in spotifySearchResults" :key="track.id" class="spotify-result-row" :class="{ 'spotify-result-selected': selectedSpotifyTrack?.id === track.id }">
                <span class="spotify-result-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <img v-if="track.artwork" :src="track.artwork" :alt="`${track.album} cover`" />
                <div v-else class="spotify-result-art-fallback" aria-hidden="true">♫</div>
                <div class="spotify-result-info"><strong>{{ track.title }}</strong><span>{{ track.artist }}</span><small>{{ track.album }} · {{ track.releaseYear }} · {{ track.duration }}</small></div>
                <button type="button" class="spotify-result-play" :aria-label="`Play ${track.title} by ${track.artist} on Spotify`" @click="selectedSpotifyTrack = selectedSpotifyTrack?.id === track.id ? null : track"><span>{{ selectedSpotifyTrack?.id === track.id ? 'Ⅱ' : '▶' }}</span>{{ selectedSpotifyTrack?.id === track.id ? 'CLOSE PLAYER' : 'LISTEN HERE' }}</button>
                <section v-if="selectedSpotifyTrack?.id === track.id" class="spotify-embed-player" aria-label="Spotify embedded player">
                  <span class="spotify-embed-label"><i></i> SPOTIFY PLAYER</span>
                  <iframe :src="`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=${theme === 'dark' ? 0 : 1}`" :title="`Spotify player for ${track.title} by ${track.artist}`" width="100%" height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                </section>
              </article>
            </div>
          </section>
        </template>
        <template v-else-if="activeView === 'home'">
          <section class="home-hero">
            <div class="hero-copy">
              <div class="eyebrow"><span class="live-dot"></span> THURSDAY, OCTOBER 01 <span class="eyebrow-divider">/</span> YOUR FREQUENCY IS LIVE</div>
              <h1>TELL US<br><span>WHO YOU ARE.</span></h1>
              <p>Music is personal. Finding it should be too.</p>
            </div>
            <div class="hero-index">VOL. 01<br>ISSUE 026<br><span>YOUR EDITION</span></div>
          </section>

          <section class="describe-panel home-describe-panel">
            <div class="describe-head"><div><span class="section-index">01 / DESCRIBE</span><h2>Start with <em>you.</em></h2></div><span class="system-stamp">SYNX PERSONALITY ENGINE<br>READY TO LISTEN <i>●</i></span></div>
            <textarea v-model="description" aria-label="Describe yourself" placeholder="What does today sound like?"></textarea>
            <div class="mood-strip"><span class="mood-label">RIGHT NOW, I'M...</span><button v-for="mood in moodOptions" :key="mood" type="button" :aria-pressed="selectedMoods.includes(mood)" :disabled="isGenerating" :class="{ chosen: selectedMoods.includes(mood) }" @click="selectedMoods.includes(mood) ? selectedMoods = selectedMoods.filter(item => item !== mood) : selectedMoods.push(mood)">{{ mood }} <b>{{ selectedMoods.includes(mood) ? '×' : '+' }}</b></button></div>
            <p v-if="recommendationError" class="recommendation-feedback" role="alert">{{ recommendationError }}</p>
            <div class="describe-bottom"><span>NO GENRES. NO RULES. JUST YOUR WORDS.</span><button class="switch-button switch-orange generate-button" :disabled="isGenerating" @click="generateSound">{{ isGenerating ? 'BUILDING YOUR MIX…' : 'GENERATE MY SOUND' }} <span>{{ isGenerating ? '…' : '↗' }}</span></button></div>
          </section>

          <FlipCard class="identity-flipper home-identity-flipper" :border-glow="false" eyebrow="SYNX / YOUR IDENTITY" :title="profileName" subtitle="YOUR CURRENT SOUND" description="Atmospheric sounds, emotional melodies, and music that feels like a scene you don't want to end." aria-label="Flip your current sound identity">
          <section class="identity-result" :class="{ 'result-reveal': generated }">
            <div class="identity-heading"><div><span class="section-index">02 / THE READ</span><h2>YOUR CURRENT SOUND<span class="orange-period">.</span></h2></div><span class="match-note">{{ generated ? 'PROFILE UPDATED JUST NOW' : 'BASED ON YOUR LAST LISTEN' }}</span></div>
            <div class="identity-body">
              <div class="identity-name"><span>YOU'RE SOUNDING LIKE</span><h3>{{ generated ? 'THE MIDNIGHT\nDREAMER' : profileName }}</h3><p>Atmospheric sounds, emotional melodies, and music that feels like a scene you don't want to end.</p><button class="inline-link" @click="activeView = 'profile'">SEE YOUR FULL IDENTITY <span>↗</span></button></div>
              <div class="genre-cloud"><span class="genre-label">YOUR FREQUENCY MAP</span><div class="genre-tags"><span class="genre-chip chip-orange">ALTERNATIVE</span><span class="genre-chip chip-blue">DREAM POP</span><span class="genre-chip chip-green">LATE NIGHT</span><span class="genre-chip chip-pink">ATMOSPHERIC</span><span class="genre-chip chip-yellow">INDIE</span></div><div class="signal-bars" aria-label="Strong match"><i v-for="n in 20" :key="n" :class="{ lit: n < 16 }" :style="{ height: `${9 + (n * 17 % 32)}px` }"></i></div><span class="signal-caption">SIGNAL STRENGTH <b>84.6%</b></span></div>
            </div>
          </section>
          </FlipCard>

          <section class="content-section discover-preview">
            <div class="section-title-row"><div><span class="section-index">03 / THE FINDS</span><h2>Sounds like <em>you.</em></h2></div><button class="inline-link" @click="activeView = 'discover'">ALL RECOMMENDATIONS <span>↗</span></button></div>
            <div class="track-grid">
              <FlipCard v-for="(track, index) in recommendedTracks.slice(0, 3)" :key="track.id" class="track-flipper" :border-glow="false" :title="track.title" :subtitle="track.artist" :description="`${track.genre} · ${track.mood} · ${track.duration}`" :aria-label="`Flip ${track.title} track card`" :style="{ '--card-accent': track.color }">
                <article class="track-card">
                  <button class="cover-button" :aria-label="`Play ${track.title}`" @click="playTrack(track)"><img :src="imageUrl(track.cover)" :alt="`${track.mood} artwork for ${track.title}`" /><span class="cover-index">0{{ index + 1 }}</span><span class="cover-play">{{ currentTrack?.id === track.id && isPlaying ? 'Ⅱ' : '▶' }}</span></button>
                  <div class="track-card-meta"><div><h3><button class="track-title-button" @click="playTrack(track)">{{ track.title }}</button></h3><p>{{ track.artist }} <span>/</span> {{ track.genre }}</p></div><button class="save-track" :class="{ saved: savedTracks.includes(track.id) }" :aria-label="savedTracks.includes(track.id) ? 'Remove saved track' : 'Save track'" @click="toggleSaved(track)">{{ savedTracks.includes(track.id) ? '♥' : '♡' }}</button></div>
                  <div class="track-card-foot"><LocalAudioChip :status="localAudioStatus(track)" :path="trackAudioUrl(track)" /><button v-if="trackSourceConfigured(track)" class="spotify-link-button" type="button" @click.stop="searchSpotify(`${track.title} ${track.artist}`)">FIND ON SPOTIFY</button><button v-else class="source-config-button" type="button" @click.stop="openYouTubeConfig(track)">⚠ VIDEO NEEDED</button><span>{{ track.mood.toUpperCase() }}</span><span>{{ track.duration }}</span></div>
                </article>
              </FlipCard>
            </div>
          </section>

          <section class="content-section library-preview">
            <div class="section-title-row"><div><span class="section-index">04 / COLLECTED</span><h2>Your sound <em>archives.</em></h2></div><button class="inline-link" @click="activeView = 'library'">OPEN LIBRARY <span>↗</span></button></div>
            <div class="library-grid"><FlipCard v-for="(library, index) in libraries" :key="library.id" class="library-flipper" :border-glow="false" eyebrow="ARCHIVE / COLLECTED" :title="library.title" :subtitle="`${libraryTrackCount(library)} tracks`" :description="library.mood" :aria-label="`Flip ${library.title} archive card`" :style="{ '--library-accent': library.color }"><div class="library-card"><img :src="imageUrl(library.cover)" :alt="`${library.title} archive artwork`" /><span class="library-card-number">ARCHIVE 0{{ index + 1 }}</span><span class="library-card-info"><strong>{{ library.title }}</strong><small>{{ libraryTrackCount(library) }} TRACKS · {{ library.mood }}</small></span><span class="library-card-arrow">↗</span></div><template #back-details><button class="switch-button switch-orange" type="button" @click.stop="openArchive(library)">OPEN ARCHIVE <span>↗</span></button></template></FlipCard></div>
          </section>
        </template>

        <template v-else-if="activeView === 'discover'">
          <section class="page-heading"><span class="section-index">SYNX / 02</span><h1>DISCOVER<br><em>YOUR FREQUENCY.</em></h1><p>Tell us what's on your mind. We'll meet you there.</p></section>
          <section class="describe-panel discover-form">
            <div class="describe-head"><div><span class="section-index">01 / A LITTLE CONTEXT</span><h2>Describe your <em>today.</em></h2></div><span class="system-stamp">NO SEARCH TERMS<br>NEEDED <i>●</i></span></div>
            <textarea v-model="description" aria-label="Describe yourself" placeholder="I'm studying late, a little homesick, and need something that feels warm but keeps me focused..."></textarea>
            <div class="mood-strip"><span class="mood-label">PICK A FEW SIGNALS</span><button v-for="mood in moodOptions" :key="mood" type="button" :aria-pressed="selectedMoods.includes(mood)" :disabled="isGenerating" :class="{ chosen: selectedMoods.includes(mood) }" @click="selectedMoods.includes(mood) ? selectedMoods = selectedMoods.filter(item => item !== mood) : selectedMoods.push(mood)">{{ mood }} <b>{{ selectedMoods.includes(mood) ? '×' : '+' }}</b></button></div>
            <div class="discover-style-picker">
              <div class="discover-style-copy"><span class="section-index">SOUND PALETTE</span><strong>{{ selectedStyle }}</strong><p>Choose a texture to guide your mix.</p></div>
              <OptionWheel :items="soundStyles" :model-value="soundStyles.indexOf(selectedStyle)" :text-color="theme === 'dark' ? '#aaa79e' : '#77766f'" :active-color="theme === 'dark' ? '#f5f2e9' : '#171714'" side="left" :font-size="1.35" :spacing="1.45" :curve="1" :tilt="5" :blur="1.3" :fade="0.28" :min-opacity="0.08" :smoothing="200" :inset="48" @change="selectSoundStyle" />
            </div>
            <p v-if="recommendationError" class="recommendation-feedback" role="alert">{{ recommendationError }}</p>
            <div class="describe-bottom"><span>MOOD → MEANING → MUSIC</span><button class="switch-button switch-orange generate-button" :disabled="isGenerating" @click="generateSound">{{ isGenerating ? 'BUILDING YOUR MIX…' : 'READ MY FREQUENCY' }} <span>{{ isGenerating ? '…' : '↗' }}</span></button></div>
          </section>
          <section class="content-section">
            <div class="section-title-row"><div><span class="section-index">02 / SYNX THINKS YOU'LL LIKE</span><h2>Made from <em>your words.</em></h2></div><span class="match-note">{{ generated ? 'YOUR PROFILE · JUST NOW' : 'YOUR PERSONAL MIX' }}</span></div>
            <p v-if="generated" class="discovery-generated-from">FROM YOUR DESCRIPTION: “{{ discoveryPreferences.description || discoveryPreferences.moods.join(' · ') }}”</p>
            <div class="recommendation-tools">
              <label><span class="section-index">FILTER BY</span><select v-model="recommendationFilterType" aria-label="Filter recommendations by"><option>All</option><option>Genre</option><option>Mood</option></select></label>
              <label v-if="recommendationFilterType !== 'All'"><span class="section-index">{{ recommendationFilterType.toUpperCase() }}</span><select v-model="recommendationFilter" :aria-label="`Filter by ${recommendationFilterType.toLowerCase()}`"><option>All</option><option v-for="option in recommendationFilterType === 'Genre' ? recommendationGenreOptions : recommendationMoodOptions" :key="option">{{ option }}</option></select></label>
              <button class="inline-link" type="button" :disabled="isGenerating" @click="generateSound">{{ isGenerating ? 'REFRESHING…' : 'REFRESH MIX ↻' }}</button>
            </div>
            <p v-if="recommendationError" class="recommendation-feedback" role="alert">{{ recommendationError }}</p>
            <p v-if="isGenerating" class="recommendation-loading" role="status">Reading your preferences and matching the SYNX catalog…</p>
            <p v-else-if="!recommendationGroups.length" class="empty-state">No songs match this filter yet. Try another mood or genre.</p>
            <section v-for="(group, groupIndex) in recommendationGroups" :key="group.title" class="recommendation-group">
              <div class="section-title-row"><div><span class="section-index">02 / 0{{ groupIndex + 1 }} PERSONALIZED GROUP</span><h2>{{ group.title }}</h2></div><span class="match-note">{{ group.tracks.length }} MATCHES</span></div>
              <div class="track-grid discover-track-grid">
                <FlipCard v-for="(recommendation, index) in group.tracks" :key="`${group.title}-${recommendation.track.id}`" class="track-flipper" :border-glow="false" :title="recommendation.track.title" :subtitle="recommendation.track.artist" :description="`${recommendation.track.genre} · ${recommendation.track.mood} · ${recommendation.track.duration}`" :aria-label="`Flip ${recommendation.track.title} recommendation card`" :style="{ '--card-accent': recommendation.track.color }">
                  <article class="track-card"><button class="cover-button" :aria-label="`Play ${recommendation.track.title}`" @click="playTrack(recommendation.track)"><img :src="imageUrl(recommendation.track.cover)" :alt="`${recommendation.track.mood} artwork for ${recommendation.track.title}`" /><span class="cover-index">0{{ index + 1 }}</span><span class="cover-play">{{ currentTrack?.id === recommendation.track.id && isPlaying ? 'Ⅱ' : '▶' }}</span></button><div class="track-card-meta"><div><h3><button class="track-title-button" @click="playTrack(recommendation.track)">{{ recommendation.track.title }}</button></h3><p>{{ recommendation.track.artist }} <span>/</span> {{ recommendation.track.genre }}</p></div><button class="save-track" :class="{ saved: savedTracks.includes(recommendation.track.id) }" :aria-label="savedTracks.includes(recommendation.track.id) ? 'Remove saved track' : 'Save track to Library'" @click="toggleSaved(recommendation.track)">{{ savedTracks.includes(recommendation.track.id) ? '♥' : '♡' }}</button></div><p class="recommendation-reason">{{ recommendation.reason }}</p><div class="track-card-foot"><LocalAudioChip :status="localAudioStatus(recommendation.track)" :path="trackAudioUrl(recommendation.track)" /><button v-if="trackSourceConfigured(recommendation.track)" class="spotify-link-button" type="button" @click.stop="searchSpotify(`${recommendation.track.title} ${recommendation.track.artist}`)">FIND ON SPOTIFY</button><button v-else class="source-config-button" type="button" @click.stop="openYouTubeConfig(recommendation.track)">⚠ SOURCE NEEDED</button><span>{{ recommendation.track.mood.toUpperCase() }}</span><span>{{ recommendation.track.duration }}</span></div></article>
                </FlipCard>
              </div>
            </section>
            <section v-if="recommendedLibraries.length" class="content-section recommendation-archives"><div class="section-title-row"><div><span class="section-index">03 / FROM YOUR REAL ARCHIVES</span><h2>Collections that <em>fit.</em></h2></div></div><button v-for="item in recommendedLibraries" :key="item.library.id" class="recommendation-archive-row" type="button" @click="openArchive(item.library)"><img :src="imageUrl(item.library.cover, 120)" :alt="`${item.library.title} artwork`" /><span><strong>{{ item.library.title }}</strong><small>{{ item.members.length }} TRACKS · {{ item.matchingMembers.length }} MATCHING SONGS</small></span><b>OPEN ↗</b></button></section>
            <div class="artist-strip">
              <div class="artist-strip-title"><span class="section-index">ARTISTS IN YOUR ORBIT</span><h2>People you'd <em>get.</em></h2></div>
              <FlipCard v-for="artist in artistMatches" :key="artist.name" class="artist-flipper" :border-glow="false" :height="44" :title="artist.name" :subtitle="artist.genre" aria-label="Flip artist details">
                <div class="artist-row"><img :src="imageUrl(artist.cover, 180)" :alt="`${artist.name} artist artwork`" /><strong>{{ artist.name }}</strong><span>{{ artist.genre }}</span><b>↗</b></div>
                <template #back><div class="artist-flip-back"><span class="section-index">ARTIST MATCH</span><strong>{{ artist.name }}</strong><small>{{ artist.genre }} · IN YOUR ORBIT</small></div></template>
              </FlipCard>
            </div>
          </section>
        </template>

        <template v-else-if="activeView === 'library'">
          <section class="page-heading library-page-heading"><span class="section-index">SYNX / 03</span><h1>YOUR MUSIC<br><em>HAS A HOME.</em></h1><p>Collected feelings, filed by you.</p><button class="switch-button switch-orange" @click="showCreateLibrary = true">+ NEW ARCHIVE</button></section>
          <section class="content-section library-full-section">
            <div class="section-title-row"><div><span class="section-index">01 / PERSONAL ARCHIVE</span><h2>Libraries <em>({{ libraries.length }})</em></h2></div><div class="library-tabs"><button v-for="filter in ['All', 'Songs', 'Albums', 'Artists', 'Libraries', 'Offline']" :key="filter" :class="{ selected: libraryTab === filter }" @click="filter === 'Offline' ? activeView = 'offline' : libraryTab = filter">{{ filter.toUpperCase() }}</button></div></div>
            <div v-if="libraryTab === 'All' || libraryTab === 'Libraries'" class="library-grid library-full-grid">
              <FlipCard v-for="(library, index) in libraries" :key="library.id" class="library-flipper" eyebrow="ARCHIVE / COLLECTED" :title="library.title" :subtitle="`${libraryTrackCount(library)} tracks`" :description="library.mood" :aria-label="`Flip ${library.title} archive card`" :style="{ '--library-accent': library.color }">
                <article class="library-card library-card-static"><img :src="imageUrl(library.cover)" :alt="`${library.title} archive artwork`" /><span class="library-card-number">ARCHIVE 0{{ index + 1 }} <i>● PUBLIC</i></span><span class="library-card-info"><strong>{{ library.title }}</strong><small>{{ libraryTrackCount(library) }} TRACKS · {{ library.mood }}</small></span><span class="library-card-arrow">↗</span><div class="library-card-actions"><button @click.stop="playArchive(library)" :disabled="!libraryTrackCount(library)">▶ PLAY ALL</button><button @click.stop="openArchive(library)">OPEN ↗</button><button @click.stop="copyShareLink">SHARE ↗</button></div></article>
              </FlipCard>
            </div>
          </section>
          <section v-if="libraryTab === 'Archive' && selectedLibrary" class="content-section archive-detail">
            <div class="section-title-row"><div><span class="section-index">ARCHIVE / {{ selectedLibrary.title.toUpperCase() }}</span><h2>{{ selectedLibrary.title }} <em>({{ selectedLibraryTracks.length }} songs)</em></h2></div><button class="inline-link" @click="libraryTab = 'Libraries'">BACK TO ARCHIVES <span>↗</span></button></div>
            <p v-if="!selectedLibraryTracks.length" class="empty-state">This archive is empty. Add songs below to build its playlist.</p>
            <div v-else class="song-list"><div v-for="track in selectedLibraryTracks" :key="track.id" class="song-row"><button class="song-play" :aria-label="`Play ${track.title}`" @click="playTrack(track, selectedLibraryTracks)">{{ currentTrack?.id === track.id && isPlaying ? 'Ⅱ' : '▶' }}</button><img :src="imageUrl(track.cover, 100)" alt="" /><div class="song-name"><button class="song-title-button" @click="playTrack(track, selectedLibraryTracks)">{{ track.title }}</button><span>{{ track.artist }}</span><LocalAudioChip :status="localAudioStatus(track)" :path="trackAudioUrl(track)" /></div><span class="song-genre">{{ track.genre }}</span><span class="song-mood">{{ track.mood }}</span><span class="song-duration">{{ track.duration }}</span><button v-if="!trackSourceConfigured(track)" class="source-config-button" :aria-label="`Configure a YouTube video for ${track.title}`" @click="openYouTubeConfig(track)">⚠ VIDEO NEEDED</button><button class="archive-remove-track" :aria-label="`Remove ${track.title} from ${selectedLibrary.title}`" @click="setArchiveMembership(selectedLibrary, track, false)">REMOVE</button></div></div>
            <div class="archive-add-tracks"><span class="section-index">ADD SONGS FROM YOUR CATALOG</span><div v-for="track in tracks" :key="track.id" class="archive-add-row"><span><strong>{{ track.title }}</strong><small>{{ track.artist }} · {{ track.genre }}</small></span><button :disabled="isTrackInArchive(selectedLibrary, track)" @click="setArchiveMembership(selectedLibrary, track, true)">{{ isTrackInArchive(selectedLibrary, track) ? 'ADDED' : 'ADD +' }}</button></div></div>
            <button class="switch-button switch-orange archive-play-all" :disabled="!selectedLibraryTracks.length" @click="playArchive(selectedLibrary)">▶ PLAY ARCHIVE <span>({{ selectedLibraryTracks.length }})</span></button>
          </section>
          <section v-if="libraryTab === 'All' || libraryTab === 'Songs'" class="content-section archive-tracks"><div class="section-title-row"><div><span class="section-index">02 / PERSONAL ARCHIVE</span><h2>{{ libraryTab === 'Songs' ? 'Every song.' : 'Your saved sounds.' }}</h2></div><span class="match-note">{{ libraryTracks.length }} TRACKS IN YOUR ARCHIVE</span></div><div class="song-list"><div v-for="track in libraryTracks" :key="track.id" class="song-row"><button class="song-play" @click="playTrack(track)">{{ currentTrack?.id === track.id && isPlaying ? 'Ⅱ' : '▶' }}</button><img :src="imageUrl(track.cover, 100)" :alt="''" /><div class="song-name"><button class="song-title-button" @click="playTrack(track)">{{ track.title }}</button><span>{{ track.artist }}</span><LocalAudioChip :status="localAudioStatus(track)" :path="trackAudioUrl(track)" /></div><span class="song-genre">{{ track.genre }}</span><span class="song-mood">{{ track.mood }}</span><span class="song-duration">{{ track.duration }}</span><button v-if="!trackSourceConfigured(track)" class="source-config-button" :aria-label="`Configure a YouTube video for ${track.title}`" @click="openYouTubeConfig(track)">⚠ VIDEO NEEDED</button><button class="save-track" :class="{ saved: savedTracks.includes(track.id) }" :aria-label="savedTracks.includes(track.id) ? 'Remove from saved tracks' : 'Save track'" @click="toggleSaved(track)">{{ savedTracks.includes(track.id) ? '♥' : '♡' }}</button></div><p v-if="!libraryTracks.length" class="empty-state">Nothing here yet. Find a sound that feels like you.</p></div></section>
          <section v-if="libraryTab === 'Albums'" class="content-section"><div class="section-title-row"><div><span class="section-index">02 / ALBUM ARTWORK</span><h2>Cover stories <em>for your sound.</em></h2></div></div><div class="track-grid discover-track-grid"><FlipCard v-for="(track, index) in filteredTracks" :key="track.id" class="track-flipper" eyebrow="ALBUM / ARCHIVE" :title="track.title" :subtitle="track.artist" :description="`${track.genre} · ${track.duration}`" :aria-label="`Flip ${track.title} album card`"><article class="track-card"><button class="cover-button" @click="playTrack(track)"><img :src="imageUrl(track.cover)" :alt="`${track.title} cover artwork`" /><span class="cover-index">0{{ index + 1 }}</span><span class="cover-play">{{ currentTrack?.id === track.id && isPlaying ? 'Ⅱ' : '▶' }}</span></button><div class="track-card-meta"><div><h3><button class="track-title-button" @click="playTrack(track)">{{ track.title }}</button></h3><p>{{ track.artist }} <span>/</span> {{ track.genre }}</p></div></div></article></FlipCard></div></section>
          <section v-if="libraryTab === 'Artists'" class="content-section"><div class="section-title-row"><div><span class="section-index">02 / ARTISTS</span><h2>In your <em>orbit.</em></h2></div></div><FlipCard v-for="artist in artistMatches" :key="artist.name" class="artist-flipper library-artist-flipper" :height="44" :title="artist.name" :subtitle="artist.genre" aria-label="Flip artist details"><div class="artist-row"><img :src="imageUrl(artist.cover, 180)" :alt="`${artist.name} artist artwork`" /><strong>{{ artist.name }}</strong><span>{{ artist.genre }}</span><b>↗</b></div><template #back><div class="artist-flip-back"><span class="section-index">ARTIST MATCH</span><strong>{{ artist.name }}</strong><small>{{ artist.genre }} · IN YOUR ORBIT</small></div></template></FlipCard></section>
        </template>

        
        <template v-else-if="activeView === 'chat'">
          <section class="page-heading"><span class="section-index">SYNX / 04</span><h1>THE BEST SONGS<br><em>ARE SHARED.</em></h1><p>Send a track. Start a story.</p></section>
          <section class="chat-layout">
            <aside class="friends-panel">
              <div class="friends-heading"><span class="section-index">YOUR PEOPLE</span><button @click="notify('Invite link copied')">+</button></div>
              <button v-for="(friend, index) in chatFriends" :key="friend.handle" class="friend-row" :class="{ 'friend-active': activeFriend === index }" @click="selectChat(index)">
                <span class="avatar friend-avatar" :style="{ backgroundColor: friend.color }">{{ friend.avatar }}<i v-if="friend.active"></i></span>
                <span class="friend-info"><strong>{{ friend.name }}</strong><small>{{ friend.track }}</small><time class="friend-time">{{ latestMessageTime(friend.handle) }}</time></span>
                <i class="friend-presence" :class="{ online: friend.active }"></i>
              </button>
            </aside>
            <div class="chat-window">
              <div class="chat-window-head">
                <div class="avatar friend-avatar" :style="{ backgroundColor: chatFriends[activeFriend].color }">{{ chatFriends[activeFriend].avatar }}</div>
                <div>
                  <strong>{{ chatFriends[activeFriend].name }}</strong>
                  <span>{{ chatFriends[activeFriend].active ? 'ONLINE NOW' : 'OFFLINE' }}</span>
                </div>
                <div class="chat-options" @keydown.esc="showChatOptions = false">
                  <button class="more-button" type="button" aria-label="Conversation options" aria-haspopup="menu" :aria-expanded="showChatOptions" @click="showChatOptions = !showChatOptions">···</button>
                  <div v-if="showChatOptions" class="chat-options-menu" role="menu">
                    <button type="button" role="menuitem" @click="requestDeleteConversation">DELETE CONVERSATION</button>
                  </div>
                </div>
              </div>

              <div class="chat-messages">
                <p v-if="!messages.length" class="empty-state chat-empty-state">No messages in this conversation.</p>
                <div v-for="(message, index) in messages" :key="message.id || index" class="chat-message" :class="{ 'message-mine': message.from === 'You', 'message-swiping': messageSwipe?.id === message.id, 'message-actions-open': activeMessageActionsId === message.id, 'swipe-reply-ready': messageSwipe?.id === message.id && messageSwipe.offset >= 18 }" :style="messageSwipe?.id === message.id ? { '--swipe-offset': `${messageSwipe.offset}px` } : null" @pointerdown="startMessageSwipe($event, message)" @pointermove="moveMessageSwipe($event, message)" @pointerup="endMessageSwipe($event, message)" @pointercancel="cancelMessageSwipe" @contextmenu="openMessageActions($event, message)">
                  <div class="message-meta">
                    <span class="message-author">{{ message.from }}</span>
                    <div v-if="activeMessageActionsId === message.id" class="message-actions">
                      <button type="button" class="mini-action" @click="setReplyTarget(message)" aria-label="Reply">↩</button>
                      <button v-if="message.from === 'You'" type="button" class="mini-action unsend-button" @click="unsendMessage(message.id)" aria-label="Unsend message" title="Unsend message">↶</button>
                      <button v-for="emoji in reactionOptions" :key="emoji" type="button" class="mini-action" @click="toggleReaction(message.id, emoji)" :aria-label="`React with ${emoji}`">{{ emoji }}</button>
                    </div>
                  </div>

                  <p>{{ message.text }}</p>

                  <div v-if="message.replyTo" class="reply-preview">
                    <span>Replying to {{ message.replyTo.from }}</span>
                    <strong>{{ message.replyTo.text }}</strong>
                  </div>

                  <div v-if="message.track" class="shared-track">
                    <img :src="message.track.albumArtwork" :alt="`${message.track.album} album cover`" loading="lazy" />
                    <div>
                      <strong>{{ message.track.title }}</strong>
                      <span>{{ message.track.artist }}</span>
                      <small>{{ message.track.album }}</small>
                      <LocalAudioChip :status="localAudioStatus(message.track)" :path="trackAudioUrl(message.track)" />
                    </div>
                    <button v-if="trackSourceConfigured(message.track)" type="button" @click="playTrack(message.track)">▶</button>
                    <button v-else type="button" class="shared-track-config" @click="openYouTubeConfig(message.track)">SET ID</button>
                  </div>

                  <div class="message-footer">
                    <div v-if="message.reactions && Object.keys(message.reactions).length" class="reaction-row">
                      <button v-for="(users, emoji) in message.reactions" :key="emoji" type="button" class="reaction-pill" :class="{ 'reaction-selected': users.includes('You') }" @click="toggleReaction(message.id, emoji)">
                        <span>{{ emoji }}</span>
                        <strong>{{ users.length }}</strong>
                      </button>
                    </div>
                    <time>{{ message.timestamp }}</time>
                  </div>
                </div>
              </div>

              <form class="chat-composer" @submit.prevent="sendMessage">
                <div v-if="replyTarget" class="reply-preview composer-reply">
                  <span>Replying to {{ replyTarget.from }}</span>
                  <button type="button" class="cancel-reply" @click="cancelReply">×</button>
                </div>

                <div class="composer-row">
                  <input v-model="newMessage" placeholder="Send a thought, a track, a feeling..." aria-label="Message" />
                  <button type="button" class="share-button" aria-label="Share current track" @click="shareCurrentSong">↗</button>
                  <button type="submit" class="send-button">SEND</button>
                </div>

                <div v-if="chatTypingText" class="typing-indicator">{{ chatTypingText }}</div>
              </form>
            </div>
          </section>
        </template>

        <template v-else-if="activeView === 'groups'">
          <section class="page-heading"><span class="section-index">SYNX / 05</span><h1>LISTEN<br><em>IN GOOD COMPANY.</em></h1><p>One room. One queue. Everyone on the same wavelength.</p></section>
          <section class="room-layout">
            <div class="room-main">
              <div class="room-kicker"><span class="live-dot"></span> SYNX LISTENING ROOM <span>//</span> ROOM 0042</div>
              <FlipCard class="room-art-flipper" eyebrow="THE SHARED FREQUENCY" :title="currentTrack?.title || 'Space Song'" :subtitle="currentTrack?.artist || 'Beach House'" description="NOW PLAYING FOR THE ROOM" aria-label="Flip current listening-room artwork">
                <div class="room-art"><img :src="imageUrl(currentTrack?.cover || tracks[2].cover, 1000)" :alt="`Now playing ${currentTrack?.title}`" /><div class="room-art-overline">NOW PLAYING FOR THE ROOM</div><div class="room-art-title"><span>{{ currentTrack?.artist || 'Beach House' }}</span><h2>{{ currentTrack?.title || 'Space Song' }}</h2></div><div class="room-disc">S<span>✳</span></div></div>
              </FlipCard>
              <div class="room-track-info"><div><span class="section-index">THE SHARED FREQUENCY</span><h3>{{ currentTrack?.title }} <em>/ {{ currentTrack?.artist }}</em></h3></div><div class="room-reactions"><button v-for="reaction in ['🔥', '♡', '♫', '⚡', '✳']" :key="reaction" :class="{ reacted: roomReaction === reaction }" @click="roomReaction = reaction">{{ reaction }}</button></div></div>
              <div class="room-controls"><button aria-label="Previous track" @click="playPreviousTrack">|◀</button><button class="room-play" :aria-label="isPlaying ? 'Pause' : 'Play'" @click="togglePlayback">{{ isPlaying ? 'Ⅱ' : '▶' }}</button><button aria-label="Next track" @click="playNextTrack">▶|</button><input class="player-seek room-seek" type="range" min="0" :max="durationSeconds || 0" step="0.1" :value="currentTime" :disabled="!durationSeconds" aria-label="Seek through track" @input="seekTo(Number($event.target.value))" /><span>{{ formatTime(currentTime) }} / {{ formatTime(durationSeconds) }}</span></div>
            </div>
            <aside class="room-aside"><div class="room-side-title"><span class="section-index">THE MIDNIGHT CREW</span><strong>06 LISTENING <i class="live-dot"></i></strong></div><div class="room-listeners"><div v-for="(friend, index) in chatFriends" :key="friend.handle" class="listener-row"><span class="avatar friend-avatar" :style="{ backgroundColor: friend.color }">{{ friend.avatar }}</span><div><strong>{{ friend.name }}</strong><small>{{ index === 0 ? 'HOSTING THE ROOM' : 'ON THIS FREQUENCY' }}</small></div><span class="listener-wave">♫</span></div><div class="listener-placeholder">+ 3 MORE IN THE ROOM</div></div><div class="room-chat-label"><span class="section-index">ROOM CHAT</span><span>LIVE</span></div><div class="room-chat-message"><strong>mia.c</strong><p>this one feels like driving through a memory</p></div><div class="room-chat-message"><strong>jules</strong><p>exactly the right kind of ache ✳</p></div><button class="switch-button switch-orange room-join" @click="roomJoined = !roomJoined">{{ roomJoined ? '✓ YOU’RE IN THE ROOM' : 'JOIN THE LISTENING ROOM' }}</button></aside>
          </section>
        </template>

        <template v-else-if="activeView === 'profile'">
          <div class="profile-session-actions"><button type="button" class="profile-logout-button" @click="logout">LOG OUT ↗</button></div>
          <section class="profile-hero"><div class="profile-cover"><img :src="imageUrl('photo-1519608487953-e999c86e7455', 1300)" alt="Twilight sky above a distant city" /><span>PERSONAL FREQUENCY ID // 0001</span></div><div class="profile-details"><div class="profile-avatar">{{ profileName.charAt(0).toUpperCase() || 'Z' }}<span>✳</span></div><div class="profile-title"><span class="section-index">@{{ profileHandle }} <i class="live-dot"></i> FREQUENCY ACTIVE</span><h1>{{ profileName }}<span class="orange-period">.</span></h1><p>A collector of late-night feelings, long drives, and songs that stay after the credits.</p></div><button class="switch-button switch-dark" @click="notify('Identity card link copied')">↗ SHARE MY IDENTITY</button></div></section>
          <section class="profile-grid">
            <FlipCard class="profile-flipper" eyebrow="01 / MY SOUND" title="Frequencies I return to" subtitle="YOUR SOUND PROFILE" description="Alternative · Indie · Electronic · Lo-Fi · Dream pop"><div class="profile-module"><span class="section-index">01 / MY SOUND</span><h2>THE FREQUENCIES<br>I RETURN TO.</h2><div class="genre-tags profile-tags"><span class="genre-chip chip-orange">ALTERNATIVE</span><span class="genre-chip chip-blue">INDIE</span><span class="genre-chip chip-green">ELECTRONIC</span><span class="genre-chip chip-pink">LO-FI</span><span class="genre-chip chip-yellow">DREAM POP</span></div></div></FlipCard>
            <FlipCard class="profile-flipper" eyebrow="02 / PERSONALITY IN WAVES" title="Your inner equalizer" subtitle="EMOTION 91 · NOSTALGIA 96" description="Energy 72 · Experiment 68 · Dance 43"><div class="profile-module"><span class="section-index">02 / PERSONALITY IN WAVES</span><h2>YOUR INNER<br>EQUALIZER.</h2><div class="personality-bars"><div v-for="(stat, index) in [{ name: 'ENERGY', value: 72 }, { name: 'EMOTION', value: 91 }, { name: 'EXPERIMENT', value: 68 }, { name: 'NOSTALGIA', value: 96 }, { name: 'DANCE', value: 43 }]" :key="stat.name"><span>{{ stat.name }}</span><i><b :style="{ width: `${stat.value}%`, backgroundColor: ['#f36b3e', '#70b9c6', '#78ad80', '#e58e9d', '#e8bf53'][index] }"></b></i><strong>{{ stat.value }}</strong></div></div></div></FlipCard>
            <FlipCard class="profile-flipper" eyebrow="03 / SHARED WITH THE WORLD" title="Your open archives" subtitle="PUBLIC LIBRARIES" description="Saved collections from your personal library."><div class="profile-module profile-library-module"><span class="section-index">03 / SHARED WITH THE WORLD</span><h2>YOUR OPEN<br>ARCHIVES.</h2><div v-for="library in libraries.filter(item => item.saved).slice(0, 2)" :key="library.id" class="profile-library-row"><img :src="imageUrl(library.cover, 120)" alt="" /><div><strong>{{ library.title }}</strong><span>{{ libraryTrackCount(library) }} TRACKS · PUBLIC</span></div><b>↗</b></div></div></FlipCard>
            <FlipCard class="profile-flipper" eyebrow="04 / CURRENTLY FEELING" title="The mood is a place" subtitle="YOUR CURRENT SIGNALS" :description="selectedMoods.join(' · ')"><div class="profile-module profile-mood-module"><span class="section-index">04 / CURRENTLY FEELING</span><h2>THE MOOD<br>IS A PLACE.</h2><div class="profile-moods"><span>✳ NOSTALGIC</span><span>◷ LATE NIGHT</span><span>↗ RESTLESS</span><span>♫ SOFT FOCUS</span></div><button class="inline-link" @click="activeView = 'discover'">UPDATE YOUR SOUND <span>↗</span></button></div></FlipCard>
          </section>
        </template>

        <template v-else>
          <section class="page-heading"><span class="section-index">SYNX / 06</span><h1>SOUND THAT<br><em>TRAVELS WITH YOU.</em></h1><p>Your favorite frequencies, off the grid.</p></section><section class="offline-summary"><div class="offline-header"><div><span class="section-index">DEVICE MUSIC STORAGE</span><h2>OFFLINE<br>ARCHIVE<span>.</span></h2></div><span class="offline-status"><i></i> READY WHEN YOU ARE</span></div><div class="storage-meter"><div></div></div><div class="storage-numbers"><span>3.8 GB USED</span><span>10 GB AVAILABLE</span></div><div class="offline-library-list"><div v-for="library in libraries" :key="library.id" class="offline-row"><img :src="imageUrl(library.cover, 140)" alt="" /><div><strong>{{ library.title }}</strong><span>{{ libraryTrackCount(library) }} SONGS · DOWNLOADED</span></div><b>✓</b></div></div><p class="offline-note">OFFLINE MODE IS SIMULATED FOR THIS PREVIEW. YOUR ARCHIVES STAY ON THIS DEVICE.</p></section>
        </template>

        <footer class="page-footer"><span>SYNX © 2025 <i>//</i> YOUR SOUND, YOUR IDENTITY</span><span>MADE OF MOOD, NOT METADATA. <b>✳</b></span><button @click="activeView = 'offline'">OFFLINE ARCHIVE ↗</button><button type="button" class="logout-button" @click="logout">LOG OUT ↗</button></footer>
      </main>

      <aside class="right-rail">
        <div class="rail-title"><span>ON YOUR FREQUENCY</span><button aria-label="More activity" @click="notify('You are all caught up.')">···</button></div>
        <BorderGlow class="rail-card-glow" :enabled="!['home', 'discover', 'chat'].includes(activeView)">
          <section class="now-playing-card"><div class="rail-section-label"><span>NOW PLAYING</span><i class="live-dot"></i></div><button class="now-playing-art" @click="isExpanded = true"><img :src="imageUrl(currentTrack?.cover || tracks[2].cover)" :alt="currentTrack?.title" /><span class="expand-icon">⤢</span></button><div class="now-playing-meta"><div><strong>{{ currentTrack?.title || 'Space Song' }}</strong><span>{{ currentTrack?.artist || 'Beach House' }}</span></div><div class="now-playing-actions"><button class="save-track" :class="{ saved: savedTracks.includes(currentTrack?.id) }" @click="toggleSaved(currentTrack)">{{ savedTracks.includes(currentTrack?.id) ? '♥' : '♡' }}</button><button class="track-share-button" type="button" @click="shareCurrentSong">↗</button></div></div><input class="player-seek" type="range" min="0" :max="durationSeconds || 0" step="0.1" :value="currentTime" :disabled="!durationSeconds" aria-label="Seek through track" @input="seekTo(Number($event.target.value))" /><div class="player-times"><span>{{ formatTime(currentTime) }}</span><span>{{ formatTime(durationSeconds) }}</span></div><div v-if="playbackStatus === 'loading'" class="player-status">Loading audio…</div><div v-else-if="audioError" class="player-status" role="status">{{ audioError }}<button v-if="playbackProvider === 'youtube'" type="button" class="source-config-button" @click="openYouTubeConfig(currentTrack)">SET VIDEO ID</button></div><div v-else-if="playbackStatus === 'unavailable'" class="player-status">Local MP3 not available — add the file to public/music/.</div><div class="mini-controls"><button aria-label="Previous track" @click="playPreviousTrack">|◀</button><button class="mini-play" :aria-label="isPlaying ? 'Pause' : 'Play'" @click="togglePlayback">{{ isPlaying ? 'Ⅱ' : '▶' }}</button><button aria-label="Next track" @click="playNextTrack">▶|</button></div><div class="volume-control"><button class="volume-toggle" type="button" :aria-label="volume ? 'Mute volume' : 'Restore volume'" @click="toggleVolume">{{ volume ? '◖' : '◖̸' }}</button><WakeSlider :value="volume" :min="0" :max="100" :step="1" :bars="28" :height="42" :rest-height="9" :gap="3" fill-color="#f26a3d" :track-color="theme === 'dark' ? '#4b4c45' : '#cbc7bc'" crest-color="#f5aa8f" :sensitivity="1" :reach="6" :skew="0.6" :glide="0.3" :smoothing="100" show-value aria-label="Playback volume" @change="volume = $event" /></div><div class="rail-equalizer" :class="{ animating: isPlaying }"><i v-for="n in 28" :key="n"></i></div></section>
        </BorderGlow>
        <BorderGlow class="rail-card-glow" :enabled="!['home', 'discover', 'chat'].includes(activeView)">
          <section class="rail-friends"><div class="rail-subhead"><span>YOUR PEOPLE</span><button @click="activeView = 'chat'">ALL ↗</button></div><button v-for="friend in chatFriends.slice(0, 2)" :key="friend.handle" class="rail-friend" @click="activeView = 'chat'"><span class="avatar rail-avatar" :style="{ backgroundColor: friend.color }">{{ friend.avatar }}<i v-if="friend.active"></i></span><span><strong>{{ friend.name }}</strong><small>{{ friend.active ? 'LISTENING NOW' : 'OFFLINE' }}</small></span><b>♫</b></button></section>
        </BorderGlow>
        <BorderGlow class="rail-card-glow" :enabled="!['home', 'discover', 'chat'].includes(activeView)">
          <section class="rail-room"><span class="section-index">LISTENING TOGETHER</span><div class="rail-room-art"><img :src="imageUrl('photo-1470252649378-9c29740c9fa8', 300)" alt="Sun setting over an open landscape" /><span>6 FRIENDS<br>IN THE ROOM</span></div><strong>THE MIDNIGHT CREW</strong><button @click="activeView = 'groups'">JOIN THE ROOM <span>↗</span></button></section>
        </BorderGlow>
        <div class="rail-quote"><span>“</span><p>Some songs know you before you know yourself.</p><small>SYNX FIELD NOTE 001</small></div>
      </aside>

      <nav class="mobile-nav" aria-label="Mobile navigation"><button v-for="item in navigation.filter(item => ['home', 'discover', 'library', 'chat', 'profile'].includes(item.id))" :key="item.id" :class="{ active: activeView === item.id }" @click="activeView = item.id"><span>{{ item.icon }}</span><small>{{ item.label }}</small></button></nav>

      <div v-if="isExpanded" class="player-overlay" @click.self="isExpanded = false"><button class="close-expanded" aria-label="Close player" @click="isExpanded = false">×</button><div class="expanded-player"><span class="section-index">SYNX / NOW PLAYING</span><img :src="imageUrl(currentTrack?.cover || tracks[2].cover, 1000)" :alt="currentTrack?.title" /><div class="expanded-track-info"><div><h2>{{ currentTrack?.title }}</h2><p>{{ currentTrack?.artist }} · {{ currentTrack?.genre }}</p></div><button class="save-track" :class="{ saved: savedTracks.includes(currentTrack?.id) }" @click="toggleSaved(currentTrack)">{{ savedTracks.includes(currentTrack?.id) ? '♥' : '♡' }}</button></div><input class="player-seek" type="range" min="0" :max="durationSeconds || 0" step="0.1" :value="currentTime" :disabled="!durationSeconds" aria-label="Seek through track" @input="seekTo(Number($event.target.value))" /><div class="player-times"><span>{{ formatTime(currentTime) }}</span><span>{{ formatTime(durationSeconds) }}</span></div><div v-if="playbackStatus === 'loading'" class="player-status">Loading audio…</div><div v-else-if="audioError" class="player-status" role="status">{{ audioError }}<button v-if="playbackProvider === 'youtube'" type="button" class="source-config-button" @click="openYouTubeConfig(currentTrack)">SET VIDEO ID</button></div><div v-else-if="playbackStatus === 'unavailable'" class="player-status">Local MP3 not available — add the file to public/music/.</div><div class="mini-controls expanded-controls"><button aria-label="Previous track" @click="playPreviousTrack">|◀</button><button class="mini-play" :aria-label="isPlaying ? 'Pause' : 'Play'" @click="togglePlayback">{{ isPlaying ? 'Ⅱ' : '▶' }}</button><button aria-label="Next track" @click="playNextTrack">▶|</button></div><div class="expanded-actions"><button @click="toggleSaved(currentTrack)">♡ SAVE TO ARCHIVE</button><button @click="copyShareLink">↗ SHARE THIS SOUND</button></div></div></div>

      <div v-if="showCreateLibrary" class="modal-backdrop" @click.self="showCreateLibrary = false"><form class="create-modal" @submit.prevent="createLibrary"><button type="button" class="modal-close" aria-label="Close" @click="showCreateLibrary = false">×</button><span class="section-index">SYNX ARCHIVE SYSTEM // NEW</span><h2>GIVE IT A<br><em>FEELING.</em></h2><label for="library-name">ARCHIVE NAME</label><input id="library-name" v-model="libraryName" placeholder="e.g. Blue hour, no plans" maxlength="32" /><button class="switch-button switch-orange" type="submit">CREATE ARCHIVE <span>↗</span></button></form></div>
      <div v-if="showDeleteConfirm" class="modal-backdrop chat-delete-backdrop" @click.self="showDeleteConfirm = false"><section class="create-modal chat-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-chat-title"><button type="button" class="modal-close" aria-label="Close" @click="showDeleteConfirm = false">×</button><span class="section-index">SYNX / CONVERSATION OPTIONS</span><h2 id="delete-chat-title">DELETE THIS<br><em>CONVERSATION?</em></h2><p>This clears the messages with {{ chatFriends[activeFriend].name }}.</p><div class="chat-delete-actions"><button type="button" @click="showDeleteConfirm = false">CANCEL</button><button type="button" @click="deleteConversation">DELETE</button></div></section></div>
      <div v-if="showYouTubeConfig" class="modal-backdrop" @click.self="showYouTubeConfig = false">
        <form class="create-modal youtube-config-modal" @submit.prevent="saveYouTubeVideoId">
          <button type="button" class="modal-close" aria-label="Close video configuration" @click="showYouTubeConfig = false">×</button>
          <span class="section-index">SYNX / VIDEO SOURCE</span>
          <h2>CONFIGURE<br><em>{{ youtubeConfigTrack?.title || 'TRACK' }}</em></h2>
          <label for="youtube-video-id">YOUTUBE VIDEO ID</label>
          <input id="youtube-video-id" v-model="youtubeVideoIdInput" type="text" maxlength="11" autocomplete="off" placeholder="11-character video ID" />
          <p>Enter only the video ID. YouTube may still reject videos that are private or do not allow embedding.</p>
          <button class="switch-button switch-orange" type="submit">SAVE VIDEO ID <span>↗</span></button>
        </form>
      </div>
      <Transition name="toast"><div v-if="toast" class="toast-message"><span>✳</span>{{ toast }}</div></Transition>
      <Teleport v-if="!welcome && isExpanded" to=".expanded-player">
        <div class="player-extra-controls">
          <button type="button" :class="{ active: shuffleEnabled }" :aria-pressed="shuffleEnabled" aria-label="Toggle shuffle" @click="toggleShuffle">SHUFFLE</button>
          <button type="button" :class="{ active: repeatMode !== 'off' }" :aria-pressed="repeatMode !== 'off'" :aria-label="`Repeat ${repeatMode}`" @click="cycleRepeatMode">{{ repeatMode === 'one' ? 'REPEAT 1' : repeatMode === 'all' ? 'REPEAT ALL' : 'REPEAT OFF' }}</button>
          <button type="button" :class="{ active: showQueue }" :aria-expanded="showQueue" @click="showQueue = !showQueue">QUEUE {{ upcomingTracks.length }}</button>
          <button type="button" @click="enqueueTrack(currentTrack)">ADD CURRENT +</button>
          <button type="button" @click="openYouTubeConfig(currentTrack)">VIDEO ID</button>
          <button v-if="isDevMode" type="button" @click="loadAudioReport">RECHECK LOCAL AUDIO</button>
        </div>
        <div v-if="showQueue" class="playback-queue">
          <div class="queue-heading"><span class="section-index">UP NEXT</span><strong>{{ upcomingTracks.length }}</strong></div>
          <p v-if="!upcomingTracks.length" class="queue-empty">No upcoming tracks. Add a song below.</p>
          <div v-for="(track, index) in upcomingTracks" :key="`${track.id}-${index}`" class="queue-row">
            <button class="queue-track" type="button" @click="playQueuedTrack(track)"><strong>{{ track.title }}</strong><small>{{ track.artist }}</small></button>
            <button class="queue-remove" type="button" :aria-label="`Remove ${track.title} from queue`" @click="removeQueuedTrack(track.id)">×</button>
          </div>
          <div class="queue-catalog"><span class="section-index">ADD FROM YOUR CATALOG</span><div v-for="track in tracks" :key="track.id" class="queue-row"><span class="queue-track"><strong>{{ track.title }}</strong><small>{{ track.artist }}</small></span><button class="queue-add" type="button" :aria-label="`Add ${track.title} to queue`" @click="enqueueTrack(track)">+</button></div></div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap');

:root{--ink:#171714;--paper:#f1eee6;--paper-deep:#e8e4da;--orange:#f26a3d;--muted:#77766f;--line:#cbc7bc;--blue:#77b6c4;--green:#82a885;--pink:#d68e97;--yellow:#e4bf5b;--display:'Barlow Condensed',Impact,sans-serif;--ui:'DM Sans',Arial,sans-serif;--mono:'DM Mono',monospace;--sidebar-width:220px;--rail-width:280px}
*{box-sizing:border-box}html{background:var(--paper);scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--ui);font-size:13px;-webkit-font-smoothing:antialiased}button,input,textarea{font:inherit}button{color:inherit}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--orange);outline-offset:3px}button{cursor:pointer}.app-shell{position:relative;min-height:100vh;isolation:isolate}.wordmark{color:var(--paper);font-family:var(--display);font-size:43px;font-weight:900;letter-spacing:0;line-height:.8;text-decoration:none}.wordmark-dot,.orange-period{color:var(--orange)}.micro-label,.eyebrow,.section-index,.system-stamp,.match-note,.side-section-label,.rail-title,.rail-section-label,.rail-subhead,.panel-top,.panel-bottom,.welcome-footnote,.art-stamp,.art-caption,.side-library-heading,.sidebar-user span,.breadcrumb,.search-box kbd,.mood-label,.describe-bottom>span,.track-card-foot,.cover-index,.genre-label,.signal-caption,.library-card-number,.library-card-info small,.song-genre,.song-mood,.song-duration,.friend-info small,.friend-presence,.chat-window-head>div span,.message-author,.chat-message time,.room-kicker,.room-side-title,.room-side-title strong,.listener-row div small,.listener-placeholder,.room-chat-label,.profile-cover>span,.personality-bars>div>span,.personality-bars>div>strong,.profile-library-row div span,.profile-moods,.offline-status,.storage-numbers,.offline-row div span,.offline-row>b,.offline-note,.page-footer,.inline-link,.rail-friend small,.rail-room-art>span,.rail-room>button,.rail-quote small,.song-row .song-duration{font-family:var(--mono);font-size:9px;letter-spacing:0;text-transform:uppercase}.eyebrow{display:flex;align-items:center;gap:8px;color:#a6a29a}.live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--orange);box-shadow:0 0 10px #f26a3d80}.section-index{color:#89867e}.inline-link{padding:0;border:0;background:none;color:var(--ink);font-weight:500}.inline-link span{color:var(--orange);margin-left:5px}.switch-button{height:44px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 15px;border:2px solid var(--ink);border-radius:0;font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:0;text-align:left;transition:transform .16s,box-shadow .16s}.switch-button:hover{transform:translateY(-2px);box-shadow:3px 3px 0 var(--ink)}.switch-button:active{transform:translateY(1px);box-shadow:none}.switch-orange{background:var(--orange);color:var(--ink)}.switch-light{background:var(--paper);color:var(--ink)}.switch-dark{background:var(--ink);color:var(--paper)}

/* Welcome / login */
.welcome-screen{position:relative;min-height:100vh;overflow:hidden;background:rgba(25,26,24,0.68);backdrop-filter:blur(3px);color:var(--paper);padding:0 6.1vw;z-index:1}.welcome-grain{position:absolute;inset:0;pointer-events:none;opacity:.14;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.32'/%3E%3C/svg%3E")}.welcome-topline{height:85px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff25;position:relative;z-index:1}.micro-label{color:#87877f}.micro-label i{color:var(--orange);font-style:normal;margin:0 8px}.text-button{padding:9px 0;border:0;background:none;color:var(--paper);font-family:var(--mono);font-size:9px}.text-button span{color:var(--orange);margin-left:8px}.welcome-grid{max-width:1370px;margin:auto;min-height:calc(100vh - 150px);display:grid;grid-template-columns:minmax(0,1.48fr) minmax(310px,.76fr);gap:8.5%;align-items:center;padding:55px 0 47px;position:relative;z-index:1}.welcome-copy{padding:0 0 16px}.welcome-copy .eyebrow{margin:0 0 16px}.fuzzy-eyebrow{display:flex;align-items:center;gap:8px;white-space:nowrap;margin:0 0 16px}.fuzzy-tagline{display:block;max-width:100%}.fuzzy-headline{display:grid;gap:0.2em;margin:0}.fuzzy-title-line{display:block;max-width:100%;height:auto;overflow:visible}.welcome-copy h1{margin:0;font-family:var(--display);font-size:clamp(74px,10.7vw,154px);font-weight:900;line-height:.77;letter-spacing:0}.welcome-copy h1>span:first-child{color:var(--orange)}.welcome-copy h1 .orange-period{color:var(--orange)}.welcome-description{margin:22px 0 25px;color:#a7a49c;font-size:14px;line-height:1.7}.welcome-description strong{color:var(--paper);font-weight:500}.welcome-art{height:clamp(210px,26vw,330px);max-width:700px;position:relative;overflow:hidden;border:1px solid #ffffff48;background:#3a3530}.welcome-art>img{position:absolute;width:100%;height:100%;object-fit:cover;filter:saturate(.63) brightness(.68)}.welcome-art:after{position:absolute;content:'';inset:0;background:linear-gradient(90deg,#191a1830 25%,transparent 67%),linear-gradient(0deg,#131412ce,transparent 60%)}.art-stamp{position:absolute;top:17px;left:17px;z-index:1;color:var(--paper);line-height:1.6}.art-stamp span{color:var(--orange)}.art-caption{position:absolute;z-index:1;left:21px;bottom:20px;display:grid;gap:6px}.art-caption span{color:#d1bba6;font-size:8px}.art-caption b{font-family:var(--display);font-size:22px;letter-spacing:0}.record{position:absolute;z-index:1;width:clamp(175px,24vw,295px);aspect-ratio:1;border-radius:50%;right:clamp(8px,7vw,95px);top:50%;transform:translateY(-50%);background:repeating-radial-gradient(circle,#171716 0 2px,#292927 3px 4px,#191918 5px 7px);box-shadow:0 8px 28px #0808087a;animation:record-spin 13s linear infinite}.record-label{position:absolute;inset:36%;display:grid;place-content:center;border-radius:50%;background:var(--orange);font-family:var(--display);font-weight:900;font-size:24px;color:var(--ink);text-align:center}.record-label span{font-size:10px}.art-equalizer{position:absolute;z-index:1;right:15px;bottom:16px;display:flex;gap:3px;align-items:end;height:23px}.art-equalizer i{display:block;width:3px;background:var(--orange);animation:equalize .9s ease-in-out infinite alternate}.art-equalizer i:nth-child(3n){animation-delay:.25s}.art-equalizer i:nth-child(2n){animation-delay:.4s}.welcome-footnote{display:flex;justify-content:space-between;color:#77776e;font-size:8px;margin-top:12px}.welcome-footnote span:first-child{color:var(--orange)}.login-panel{align-self:center;border:1px solid #a39d8c80;background:#222320;box-shadow:8px 8px 0 #090a09;position:relative}.login-panel:before,.login-panel:after{content:'';position:absolute;width:6px;height:6px;border:1px solid #8b877e;border-radius:50%;left:12px;top:12px}.login-panel:after{left:auto;right:12px}.panel-top,.panel-bottom{display:flex;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #ffffff20;color:#85847b;font-size:8px}.panel-top span:last-child{color:var(--green)}.login-inner{padding:28px 30px}.login-inner>.eyebrow{font-size:8px}.login-inner h2{font-family:var(--display);font-size:61px;line-height:.8;margin:14px 0 12px}.login-inner h2 span{color:var(--orange)}.login-intro{color:#a09d94;font-size:12px;line-height:1.6;margin:0 0 24px}.login-inner form{display:grid}.login-inner label,.create-modal label{display:flex;justify-content:space-between;margin:0 0 7px;color:#9b998f;font-family:var(--mono);font-size:8px}.optional{color:#64645d}.login-inner input,.create-modal input{height:42px;padding:0 11px;margin:0 0 17px;border:1px solid #53534b;background:#191a18;color:var(--paper);font-family:var(--mono);font-size:10px}.login-inner input::placeholder,.create-modal input::placeholder{color:#67675f}.login-inner form .switch-button{margin-top:3px}.login-inner>.switch-button{width:100%;margin-top:10px}.google-g{color:#87b6e0;font-family:var(--ui);font-weight:700;font-size:13px}.create-account{width:100%;margin-top:23px;padding:0;background:none;border:0;color:#949188;font-family:var(--mono);font-size:8px;text-align:left}.create-account strong{color:var(--orange);font-weight:500;margin-left:5px}.forgot{display:block;margin:14px 0 0 auto;border:0;background:none;color:#77766f;font-family:var(--mono);font-size:8px}.panel-bottom{border-top:1px solid #ffffff20;border-bottom:0;font-size:7px;padding:12px 17px}.panel-bottom span:last-child{color:var(--orange)}.welcome-marquee{height:37px;display:flex;overflow:hidden;border-top:1px solid #ffffff20;align-items:center;color:var(--orange);font-family:var(--display);font-size:18px;font-weight:700;white-space:nowrap;position:relative;z-index:1}.welcome-marquee span{flex-shrink:0;min-width:100%;animation:marquee 25s linear infinite}

/* Main application frame */
.dashboard{position:relative;z-index:1;min-height:100vh;padding-left:var(--sidebar-width);padding-right:var(--rail-width);padding-bottom:34px;background-color:rgba(241,238,230,0.82);backdrop-filter:blur(2px);background-image:radial-gradient(#8f897b20 .65px,transparent .65px);background-size:6px 6px}.sidebar{position:fixed;z-index:5;left:0;top:0;bottom:0;width:var(--sidebar-width);padding:25px 19px 17px;background:#1b1c19;color:var(--paper);display:flex;flex-direction:column}.sidebar-brand{font-size:39px;margin:3px 0 50px 5px}.side-section-label,.side-library-heading{display:flex;justify-content:space-between;color:#827f76;font-size:8px}.side-section-label span{color:#595951}.side-nav{display:grid;gap:3px;margin:12px 0 33px}.side-nav button{height:39px;display:flex;align-items:center;gap:12px;padding:0 9px;background:transparent;border:0;color:#a9a79e;text-align:left;font-size:11px}.side-nav button.active{background:#2b2c27;color:var(--paper);border-left:2px solid var(--orange)}.nav-icon{width:18px;color:#85847c;font-size:15px;text-align:center}.side-nav button.active .nav-icon{color:var(--orange)}.nav-count{margin-left:auto;color:var(--orange);font-family:var(--mono);font-size:9px}.side-library-heading{align-items:center;margin:0 2px 13px}.side-library-heading button{width:20px;height:20px;border:1px solid #56564f;background:transparent;color:var(--paper);font-size:15px}.side-library{height:34px;display:flex;align-items:center;gap:9px;padding:0 4px;border:0;background:none;color:#b9b6ad;text-align:left;font-size:10px}.side-library-mark{width:8px;height:8px;border:1px solid #ffffff75}.sidebar-spacer{flex:1}.sidebar-bottom{display:flex;align-items:center;gap:9px;padding-top:13px;border-top:1px solid #ffffff22}.avatar{display:grid;place-items:center;width:33px;height:33px;color:var(--ink);font-family:var(--display);font-size:15px;font-weight:800}.avatar-small{width:30px;height:30px;background:var(--orange)}.sidebar-user{display:grid;gap:4px}.sidebar-user strong{font-size:11px}.sidebar-user span{color:#77766f;font-size:7px}.more-button{margin-left:auto;padding:3px 7px;border:0;background:none;color:#aaa79f;font-size:20px}.mobile-header{display:none}.main-content{max-width:1020px;min-height:100vh;margin:0 auto;padding:0 34px 25px}.topbar{height:68px;display:flex;align-items:center;gap:18px;border-bottom:1px solid var(--line)}.breadcrumb{display:flex;align-items:center;gap:10px;color:#807e76;font-size:8px;white-space:nowrap}.breadcrumb b{color:var(--orange)}.breadcrumb strong{color:var(--ink);font-weight:500}.search-box{width:min(280px,32%);height:32px;display:flex;align-items:center;gap:8px;margin-left:auto;padding:0 9px;border:1px solid #c6c2b7;background:#eeebe3;color:#7d7a72}.search-box>span{font-size:18px}.search-box input{width:100%;min-width:0;border:0;outline:none;background:transparent;color:var(--ink);font-family:var(--mono);font-size:9px}.search-box input::placeholder{color:#8b8880}.search-box kbd{padding:3px 5px;border:1px solid #ccc8bc;color:#7e7c74;font-size:8px;white-space:nowrap}.notification-button,.top-avatar{position:relative;width:30px;height:30px;display:grid;place-items:center;border:0;background:none;font-size:17px}.notification-button i{position:absolute;top:5px;right:6px;width:5px;height:5px;background:var(--orange);border-radius:50%}.top-avatar,.mobile-avatar{background:#d7a078;color:var(--ink);font-family:var(--display);font-size:16px;font-weight:800}.home-hero{display:flex;justify-content:space-between;align-items:end;padding:48px 0 30px;border-bottom:1px solid var(--line)}.home-hero .eyebrow{font-size:8px}.eyebrow-divider{margin:0 4px;color:var(--orange)}.home-hero h1,.page-heading h1{margin:21px 0 11px;font-family:var(--display);font-size:clamp(57px,7vw,91px);font-weight:900;line-height:.79;letter-spacing:0}.home-hero h1 span,.page-heading h1 em{color:var(--orange);font-style:normal}.home-hero p,.page-heading p{margin:15px 0 0;color:#77766f;font-size:12px}.hero-index{padding:0 1px 4px;color:#76736b;font-family:var(--mono);font-size:8px;line-height:1.9;text-align:right}.hero-index span{color:var(--orange)}.describe-panel{margin-top:24px;padding:20px 21px 0;background:#e8e5dc;border:1px solid #c6c2b6;box-shadow:4px 4px 0 #d3cfc3;position:relative}.describe-panel:after{content:'✳';position:absolute;right:14px;top:53px;color:#d4cec1;font-size:40px;pointer-events:none}.describe-head{display:flex;align-items:center;justify-content:space-between}.describe-head h2,.section-title-row h2,.artist-strip-title h2{margin:7px 0 0;font-family:var(--display);font-size:32px;font-weight:800;line-height:1}.describe-head h2 em,.section-title-row h2 em,.artist-strip-title h2 em,.profile-module h2 em{color:var(--orange);font-style:normal}.system-stamp{padding-right:6px;color:#87847c;text-align:right;font-size:8px;line-height:1.65}.system-stamp i{color:var(--green);font-style:normal}.describe-panel textarea{position:relative;z-index:1;display:block;width:100%;min-height:82px;resize:vertical;margin:16px 0 11px;padding:12px;border:1px solid #c4c0b5;background:#f1eee6;color:#45433e;font-size:12px;line-height:1.7}.describe-panel textarea:focus{outline:1px solid var(--orange);outline-offset:0}.mood-strip{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:0 0 13px}.mood-label{margin-right:5px;color:#88857d;font-size:8px}.mood-strip>button{padding:6px 7px;border:1px solid #c4c0b5;background:transparent;color:#58564f;font-size:9px}.mood-strip>button.chosen{border-color:var(--ink);background:var(--ink);color:var(--paper)}.mood-strip>button b{margin-left:6px;color:var(--orange);font-size:12px}.describe-bottom{display:flex;align-items:center;justify-content:space-between;margin:0 -21px;padding:11px 20px;border-top:1px solid #c6c2b6}.describe-bottom>span{color:#85827a;font-size:8px}.generate-button{min-width:174px;height:37px;font-size:9px}.identity-result{margin-top:29px;padding:0 0 22px;border-bottom:1px solid var(--line)}.identity-heading,.section-title-row{display:flex;align-items:end;justify-content:space-between}.identity-heading h2{margin:6px 0 0;font-family:var(--display);font-size:36px;line-height:.9}.match-note{color:#838077;font-size:8px}.identity-body{display:grid;grid-template-columns:1fr 1.08fr;gap:26px;margin-top:19px;padding:17px 19px;background:#20211e;color:var(--paper);position:relative;overflow:hidden}.identity-body:after{content:'S';position:absolute;right:6px;top:-40px;color:#ffffff07;font-family:var(--display);font-size:230px;font-weight:900;line-height:1;pointer-events:none}.identity-name,.genre-cloud{position:relative;z-index:1}.identity-name>span,.genre-label{color:#9c998f;font-family:var(--mono);font-size:8px}.identity-name h3{white-space:pre-line;margin:8px 0;font-family:var(--display);font-size:44px;line-height:.78;color:var(--orange)}.identity-name p{max-width:275px;color:#b9b5ab;font-size:10px;line-height:1.65}.identity-name .inline-link{margin-top:6px;color:#e0ddd4;font-size:8px}.genre-cloud{padding:8px 0}.genre-tags{display:flex;gap:6px;flex-wrap:wrap}.identity-body .genre-tags{margin:16px 0 22px}.genre-chip{padding:7px 9px;border:1px solid currentColor;font-family:var(--mono);font-size:8px;white-space:nowrap}.chip-orange{color:#ed835e;background:#f26a3d14}.chip-blue{color:#77b6c4;background:#77b6c414}.chip-green{color:#82a885;background:#82a88514}.chip-pink{color:#d68e97;background:#d68e9714}.chip-yellow{color:#dabb5e;background:#e4bf5314}.signal-bars{height:39px;display:flex;align-items:end;gap:3px}.signal-bars i{width:4px;background:#53544c}.signal-bars i.lit{background:var(--orange)}.signal-caption{display:flex;justify-content:space-between;margin-top:5px;color:#86847b;font-size:7px}.signal-caption b{color:var(--orange);font-weight:500}.content-section{margin-top:29px}.section-title-row h2{font-size:32px}.section-title-row>.inline-link{padding-bottom:3px;font-size:8px}.track-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:16px}.track-card{min-width:0}.cover-button{width:100%;aspect-ratio:1.18;position:relative;display:block;overflow:hidden;padding:0;border:0;background:#333}.cover-button:after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,#1313115c,transparent 60%)}.cover-button img{width:100%;height:100%;object-fit:cover;filter:saturate(.8);transition:transform .4s,filter .4s}.cover-button:hover img{transform:scale(1.045);filter:saturate(1.1)}.cover-index{position:absolute;z-index:1;top:9px;left:10px;color:white;font-size:8px}.cover-play{position:absolute;z-index:1;right:10px;bottom:9px;display:grid;place-items:center;width:34px;height:34px;background:var(--orange);color:var(--ink);font-size:12px}.track-card-meta{display:flex;align-items:start;justify-content:space-between;padding-top:9px}.track-card-meta h3{margin:0;font-size:12px;font-weight:600}.track-card-meta p{margin:4px 0 0;color:#77766f;font-size:9px}.track-card-meta p span{color:var(--orange);padding:0 3px}.save-track{padding:0;border:0;background:none;color:#89867d;font-size:16px}.save-track.saved{color:var(--orange)}.track-card-foot{display:flex;justify-content:space-between;margin-top:10px;padding-top:7px;border-top:1px solid var(--line);color:#88857d;font-size:7px}.library-preview{padding-bottom:19px}.library-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.library-card{aspect-ratio:1.1;position:relative;display:block;overflow:hidden;padding:0;border:1px solid #242521;background:#252622;text-align:left;color:var(--paper)}.library-card>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.65) saturate(.7);transition:transform .35s}.library-card:hover>img{transform:scale(1.04)}.library-card:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#16171525,transparent 30%,#151613d9)}.library-card-number,.library-card-info,.library-card-arrow{position:absolute;z-index:1}.library-card-number{top:10px;left:10px;color:#e4dfd3;font-size:7px}.library-card-info{left:12px;right:30px;bottom:12px;display:grid;gap:5px}.library-card-info strong{font-family:var(--display);font-size:23px;line-height:.95}.library-card-info small{color:#c1beb4;font-size:7px}.library-card-arrow{right:11px;bottom:13px;color:var(--orange);font-size:14px}.page-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:36px;padding-top:12px;border-top:1px solid var(--line);color:#8b887f;font-size:7px}.page-footer i,.page-footer b{color:var(--orange);font-style:normal}.page-footer button{padding:0;border:0;background:none;color:#858178;font-family:var(--mono);font-size:7px}

/* Right listening rail */
.right-rail{position:fixed;z-index:4;right:0;top:0;bottom:0;width:var(--rail-width);padding:0 18px 20px;border-left:1px solid var(--line);background:#e9e6de;overflow:auto}.rail-title{height:68px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);color:#817e76;font-size:8px}.rail-title button,.rail-subhead button{border:0;background:none;color:var(--orange);font-family:var(--mono);font-size:9px}.now-playing-card{padding:17px 0 14px;border-bottom:1px solid var(--line)}.rail-section-label{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;color:#7e7b73;font-size:8px}.rail-section-label .live-dot{width:5px;height:5px}.now-playing-art{position:relative;width:100%;aspect-ratio:1.38;display:block;overflow:hidden;padding:0;border:0;background:#333}.now-playing-art img{width:100%;height:100%;object-fit:cover;filter:brightness(.76)}.expand-icon{position:absolute;right:8px;top:8px;color:#fff;font-size:15px}.now-playing-meta{display:flex;align-items:center;justify-content:space-between;margin:11px 0 10px}.now-playing-meta>div{display:grid;gap:4px}.now-playing-meta strong{font-size:12px}.now-playing-meta span{color:#77756d;font-size:10px}.mini-progress{height:2px;background:#c6c1b6}.mini-progress span{display:block;width:44%;height:100%;background:var(--orange)}.player-times{display:flex;justify-content:space-between;margin-top:5px;color:#89867f;font-family:var(--mono);font-size:7px}.mini-controls{display:flex;align-items:center;justify-content:center;gap:21px;margin:12px 0}.mini-controls button{padding:5px;border:0;background:none;color:#5f5d56;font-size:12px}.mini-controls .mini-play{display:grid;place-items:center;width:32px;height:32px;background:var(--orange);color:var(--ink);font-size:12px}.rail-equalizer{height:20px;display:flex;align-items:end;justify-content:space-between;gap:2px;overflow:hidden}.rail-equalizer i{flex:1;height:4px;background:#bbb7ac}.rail-equalizer i:nth-child(4n),.rail-equalizer i:nth-child(5n){height:12px;background:#e59073}.rail-equalizer.animating i{animation:equalize .45s ease-in-out infinite alternate}.rail-equalizer.animating i:nth-child(3n){animation-delay:.25s}.rail-equalizer.animating i:nth-child(2n){animation-delay:.12s}.rail-friends{padding:16px 0;border-bottom:1px solid var(--line)}.rail-subhead{display:flex;justify-content:space-between;margin-bottom:12px;color:#817e76;font-size:8px}.rail-friend{width:100%;display:flex;align-items:center;gap:9px;padding:6px 0;border:0;background:none;text-align:left}.rail-avatar{width:30px;height:30px;font-size:12px;position:relative}.rail-avatar i,.friend-avatar i{position:absolute;right:-1px;bottom:0;width:8px;height:8px;border:1px solid var(--paper);border-radius:50%;background:var(--green)}.rail-friend>span:nth-child(2){display:grid;gap:4px}.rail-friend strong{font-size:10px;font-weight:600}.rail-friend small{color:#87847c;font-size:7px}.rail-friend>b{margin-left:auto;color:var(--orange)}.rail-room{padding:15px 0;border-bottom:1px solid var(--line)}.rail-room>.section-index{font-size:8px}.rail-room-art{height:83px;position:relative;overflow:hidden;margin:10px 0}.rail-room-art img{width:100%;height:100%;object-fit:cover;filter:brightness(.6)}.rail-room-art>span{position:absolute;left:10px;bottom:8px;color:#fff;font-size:8px;line-height:1.6}.rail-room>strong{font-family:var(--display);font-size:19px}.rail-room>button{display:block;width:100%;margin-top:10px;padding:9px;border:1px solid #a9a498;background:transparent;text-align:left;font-size:8px}.rail-room>button span{float:right;color:var(--orange)}.rail-quote{position:relative;margin-top:17px;padding:0 3px}.rail-quote>span{color:var(--orange);font-family:var(--display);font-size:35px;line-height:1}.rail-quote p{margin:0;color:#6f6c65;font-family:var(--display);font-size:22px;line-height:.98}.rail-quote small{display:block;margin-top:9px;color:#96928a;font-size:7px}

/* Discover, library, chat, room, identity */
.page-heading{padding:40px 0 25px;border-bottom:1px solid var(--line)}.page-heading h1{font-size:clamp(56px,7vw,88px);margin:17px 0 11px}.page-heading h1 em{display:inline-block}.page-heading p{margin-top:14px}.discover-form{margin-top:21px}.discover-genre-tags{margin:17px 0}.discover-track-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}.discover-track-grid .cover-button{aspect-ratio:.94}.artist-strip{display:grid;grid-template-columns:1.05fr 1fr;align-items:center;margin-top:30px;padding:15px 0;border-top:1px solid var(--line)}.artist-strip-title{grid-row:span 3}.artist-strip-title h2{font-size:30px}.artist-row{display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:1px solid var(--line)}.artist-row img{width:31px;height:31px;object-fit:cover}.artist-row strong{font-size:10px}.artist-row span{margin-left:auto;color:#88857d;font-family:var(--mono);font-size:7px}.artist-row b{color:var(--orange);font-weight:500}.library-page-heading{position:relative}.library-page-heading>.switch-button{position:absolute;right:0;bottom:26px;height:36px}.library-full-section{margin-top:24px}.library-tabs{display:flex;gap:13px}.library-tabs button{padding:0 0 5px;border:0;border-bottom:1px solid transparent;background:none;color:#88857d;font-family:var(--mono);font-size:8px}.library-tabs button.selected{border-color:var(--orange);color:var(--ink)}.library-full-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.library-card-static{aspect-ratio:.91}.library-card-number{right:10px;display:flex;justify-content:space-between}.library-card-number i{color:var(--green);font-style:normal}.library-card-actions{position:absolute;z-index:2;left:11px;right:11px;bottom:54px;display:flex;gap:7px;opacity:0;transform:translateY(5px);transition:.2s}.library-card-static:hover .library-card-actions{opacity:1;transform:translateY(0)}.library-card-actions button{flex:1;padding:7px 4px;border:1px solid #ffffff8a;background:#2227;color:white;font-family:var(--mono);font-size:7px}.archive-tracks{margin-top:32px}.song-list{margin-top:12px}.song-row{min-height:55px;display:grid;grid-template-columns:24px 37px minmax(120px,1.6fr) 1fr 1fr 38px 20px;align-items:center;gap:10px;border-top:1px solid var(--line)}.song-row>img{width:34px;height:34px;object-fit:cover}.song-play{width:23px;height:23px;border:1px solid #c0bbaf;background:none;color:#69665f;font-size:9px}.song-name{display:grid;gap:4px}.song-name strong{font-size:10px}.song-name span{color:#817e76;font-size:9px}.song-genre,.song-mood,.song-duration{color:#79766e;font-size:8px}.song-row .save-track{font-size:13px}.empty-state{padding:17px;border:1px dashed var(--line);color:#77766f;font-size:11px}.chat-layout{display:grid;grid-template-columns:205px 1fr;min-height:490px;margin-top:21px;border:1px solid #c6c2b6;background:#eae7df}.friends-panel{padding:14px 11px;border-right:1px solid #cbc7bc}.friends-heading{display:flex;justify-content:space-between;align-items:center;padding:0 2px 10px}.friends-heading button{width:21px;height:21px;border:1px solid #c6c2b6;background:transparent;color:var(--orange)}.friend-row{width:100%;display:flex;align-items:center;gap:8px;padding:9px 5px;border:0;background:transparent;text-align:left}.friend-row.friend-active{background:#dedbd2}.friend-avatar{position:relative;width:32px;height:32px;flex-shrink:0;font-size:13px}.friend-info{min-width:0;display:grid;gap:5px}.friend-info strong{font-size:10px}.friend-info small{overflow:hidden;color:#7d7a72;font-size:7px;text-overflow:ellipsis;white-space:nowrap}.friend-presence{width:6px;height:6px;margin-left:auto;border-radius:50%;background:#a7a49c}.friend-presence.online{background:var(--green)}.chat-window{min-width:0;display:flex;flex-direction:column}.chat-window-head{height:59px;display:flex;align-items:center;gap:9px;padding:0 13px;border-bottom:1px solid #cbc7bc}.chat-window-head>div:nth-child(2){display:grid;gap:4px}.chat-window-head>div strong{font-size:11px}.chat-window-head>div span{color:#818078;font-size:7px}.chat-messages{flex:1;display:flex;flex-direction:column;align-items:start;gap:15px;padding:17px;overflow:auto}.chat-message{max-width:84%;padding:10px 11px;background:#dedbd2}.chat-message.message-mine{align-self:end;background:#f4c1a8}.message-author{color:#77736b;font-size:7px}.chat-message p{margin:5px 0;color:#393832;font-size:10px;line-height:1.55}.chat-message time{display:block;margin-top:7px;color:#89867e;font-size:7px;text-align:right}.shared-track{display:flex;align-items:center;gap:8px;padding:5px;background:#f0ede5}.shared-track img{width:35px;height:35px;object-fit:cover}.shared-track>div{display:grid;gap:4px}.shared-track strong{font-size:9px}.shared-track span{color:#7b7870;font-size:8px}.shared-track button{margin-left:auto;border:0;background:var(--orange);width:25px;height:25px}.chat-composer{display:flex;gap:7px;padding:9px;border-top:1px solid #cbc7bc}.chat-composer input{flex:1;min-width:0;height:35px;padding:0 8px;border:1px solid #c5c1b6;background:#f2efe7;font-size:9px}.chat-composer>button{width:33px;border:1px solid #c5c1b6;background:none}.chat-composer .send-button{border-color:var(--orange);background:var(--orange)}.room-layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(205px,.73fr);margin-top:21px;border:1px solid #292a26;background:#20211e;color:var(--paper)}.room-main{min-width:0;padding:15px}.room-kicker{display:flex;gap:8px;align-items:center;color:#aaa79f;font-size:8px}.room-kicker>span:nth-child(2){color:var(--orange)}.room-art{height:clamp(230px,29vw,350px);position:relative;overflow:hidden;margin-top:13px}.room-art>img{width:100%;height:100%;object-fit:cover;filter:brightness(.7) saturate(.85)}.room-art:after{position:absolute;content:'';inset:0;background:linear-gradient(0deg,#131411d9,transparent 65%)}.room-art-overline,.room-art-title,.room-disc{position:absolute;z-index:1}.room-art-overline{top:13px;left:14px;color:#f0ece0;font-family:var(--mono);font-size:8px}.room-art-title{left:17px;bottom:17px}.room-art-title>span{font-family:var(--mono);font-size:9px}.room-art-title h2{margin:4px 0 0;font-family:var(--display);font-size:49px;line-height:.9}.room-disc{right:23px;top:50%;display:grid;place-content:center;width:94px;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,#111 0 1px,#282825 2px 3px);color:var(--orange);font-family:var(--display);font-size:22px;text-align:center;transform:translateY(-50%)}.room-disc span{font-size:9px}.room-track-info{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:14px 0 8px}.room-track-info h3{margin:6px 0 0;font-size:12px}.room-track-info h3 em{color:#a6a299;font-style:normal;font-weight:400}.room-reactions{display:flex;gap:3px}.room-reactions button{width:27px;height:27px;border:1px solid #55564e;background:transparent;color:#dedbd2}.room-reactions button.reacted{border-color:var(--orange);background:#f26a3d33}.room-controls{display:flex;align-items:center;gap:11px;padding-top:8px;border-top:1px solid #4b4c45;color:#aaa79e;font-family:var(--mono);font-size:7px}.room-controls button{border:0;background:none;color:#d5d1c8;font-size:10px}.room-controls .room-play{width:29px;height:29px;background:var(--orange);color:var(--ink)}.room-progress{height:2px;flex:1;background:#4c4d46}.room-progress span{display:block;width:41%;height:100%;background:var(--orange)}.room-aside{padding:15px 12px;border-left:1px solid #44453f}.room-side-title{display:grid;gap:8px}.room-side-title>span{color:#9b988f}.room-side-title strong{color:var(--paper);font-size:8px;font-weight:500}.room-side-title i{margin-left:5px}.room-listeners{padding:10px 0 14px;border-bottom:1px solid #484942}.listener-row{display:flex;align-items:center;gap:7px;padding:6px 0}.listener-row .avatar{width:29px;height:29px;font-size:11px}.listener-row>div{display:grid;gap:4px}.listener-row div strong{font-size:9px}.listener-row div small{color:#87847b;font-size:6px}.listener-wave{margin-left:auto;color:var(--orange);font-size:13px}.listener-placeholder{padding:9px 0 0;color:#8c8980;font-size:7px}.room-chat-label{display:flex;justify-content:space-between;margin:13px 0;color:#a19e95;font-size:8px}.room-chat-label span:last-child{color:var(--green)}.room-chat-message{margin:7px 0;padding:8px;background:#292a26}.room-chat-message strong{color:#e69d7f;font-family:var(--mono);font-size:8px}.room-chat-message p{margin:4px 0 0;color:#d0ccc2;font-size:9px;line-height:1.5}.room-join{width:100%;height:37px;justify-content:center;margin-top:13px;padding:0 7px;font-size:7px}.profile-hero{margin:0 -34px}.profile-cover{height:185px;position:relative;overflow:hidden;background:#38352f}.profile-cover img{width:100%;height:100%;object-fit:cover;filter:brightness(.57) saturate(.67)}.profile-cover:after{position:absolute;content:'';inset:0;background:linear-gradient(0deg,#161714b5,transparent 80%)}.profile-cover>span{position:absolute;z-index:1;top:13px;left:34px;color:#e5e0d5;font-size:8px}.profile-details{position:relative;display:flex;align-items:end;gap:16px;padding:0 0 17px;border-bottom:1px solid var(--line)}.profile-avatar{position:relative;display:grid;place-items:center;width:76px;height:76px;margin-top:-24px;background:var(--orange);border:4px solid var(--paper);font-family:var(--display);font-size:42px;font-weight:900}.profile-avatar span{position:absolute;right:-6px;top:-4px;color:var(--ink);font-size:15px}.profile-title{flex:1}.profile-title .section-index{font-size:8px}.profile-title .live-dot{margin-left:5px}.profile-title h1{margin:7px 0 3px;font-family:var(--display);font-size:42px;line-height:.88}.profile-title p{max-width:500px;margin:6px 0 0;color:#77746d;font-size:10px}.profile-details>.switch-button{height:34px;margin-bottom:3px;font-size:8px}.profile-grid{display:grid;grid-template-columns:1fr 1fr;margin-top:21px;border-top:1px solid var(--line);border-left:1px solid var(--line)}.profile-module{min-height:176px;padding:14px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.profile-module h2{margin:8px 0 13px;font-family:var(--display);font-size:24px;line-height:.9}.profile-tags{gap:5px}.profile-tags .genre-chip{font-size:7px;padding:6px}.personality-bars{display:grid;gap:8px}.personality-bars>div{display:grid;grid-template-columns:80px 1fr 24px;align-items:center;gap:7px}.personality-bars>div>span,.personality-bars>div>strong{font-size:7px;color:#79766f}.personality-bars>div>i{height:5px;background:#d8d4ca}.personality-bars>div>i b{display:block;height:100%}.personality-bars>div>strong{text-align:right}.profile-library-row{display:flex;align-items:center;gap:8px;margin:6px 0}.profile-library-row img{width:34px;height:34px;object-fit:cover}.profile-library-row div{display:grid;gap:4px}.profile-library-row div strong{font-size:9px}.profile-library-row div span{color:#838078;font-size:7px}.profile-library-row>b{margin-left:auto;color:var(--orange)}.profile-moods{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0;color:#64625b;font-size:7px}.profile-moods span{padding:6px;border:1px solid #c8c4b9}.profile-mood-module>.inline-link{font-size:7px}.offline-summary{margin-top:23px;padding:18px;border:1px solid #c7c3b7;background:#e8e5dc;box-shadow:4px 4px 0 #d3cfc3}.offline-header{display:flex;align-items:start;justify-content:space-between}.offline-header h2{margin:8px 0 0;font-family:var(--display);font-size:41px;line-height:.78}.offline-header h2 span{color:var(--orange)}.offline-status{display:flex;align-items:center;gap:7px;color:#77756e;font-size:7px}.offline-status i{width:6px;height:6px;border-radius:50%;background:var(--green)}.storage-meter{height:8px;margin-top:20px;background:#d1cdc2}.storage-meter div{height:100%;width:38%;background:var(--orange)}.storage-numbers{display:flex;justify-content:space-between;margin-top:6px;color:#817e76;font-size:7px}.offline-library-list{margin-top:18px;border-top:1px solid #c7c3b7}.offline-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #c7c3b7}.offline-row img{width:37px;height:37px;object-fit:cover}.offline-row div{display:grid;gap:5px}.offline-row div strong{font-size:10px}.offline-row div span{color:#77746d;font-size:7px}.offline-row>b{margin-left:auto;color:#628969;font-size:13px}.offline-note{margin:14px 0 0;color:#85827b;font-size:7px}.result-reveal .identity-body{animation:reveal .5s ease both}

/* Overlays and mobile navigation */
.toast-message{position:fixed;z-index:20;right:calc(var(--rail-width) + 26px);bottom:25px;display:flex;align-items:center;gap:9px;padding:12px 16px;border:1px solid #2c2d28;background:#20211e;color:var(--paper);font-size:11px;box-shadow:4px 4px 0 #f26a3d}.toast-message span{color:var(--orange)}.toast-enter-active,.toast-leave-active{transition:opacity .18s,transform .18s}.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(8px)}.modal-backdrop,.player-overlay{position:fixed;z-index:15;inset:0;display:grid;place-items:center;padding:20px;background:#151613c9;backdrop-filter:blur(5px)}.create-modal{width:min(430px,100%);position:relative;padding:28px;border:1px solid #aaa596;background:var(--paper);box-shadow:8px 8px 0 var(--orange)}.modal-close,.close-expanded{position:absolute;right:13px;top:10px;border:0;background:none;font-size:24px}.create-modal h2{margin:13px 0 23px;font-family:var(--display);font-size:54px;line-height:.8}.create-modal h2 em{color:var(--orange);font-style:normal}.create-modal label{color:#747169}.create-modal input{width:100%;border-color:#c2beb3;background:#e9e6de;color:var(--ink)}.create-modal .switch-button{width:100%}.player-overlay{z-index:14}.expanded-player{width:min(420px,100%);padding:23px;border:1px solid #5d5d53;background:var(--paper);box-shadow:8px 8px 0 var(--orange)}.expanded-player>img{display:block;width:100%;max-height:45vh;aspect-ratio:1;object-fit:cover;margin:14px 0}.expanded-track-info{display:flex;align-items:center;justify-content:space-between}.expanded-track-info h2{margin:0;font-family:var(--display);font-size:34px}.expanded-track-info p{margin:4px 0 10px;color:#77746d;font-size:10px}.expanded-controls{justify-content:space-around;margin:16px 0}.expanded-controls button{font-size:15px}.expanded-controls .mini-play{width:43px;height:43px}.expanded-actions{display:flex;gap:8px}.expanded-actions button{flex:1;padding:9px 3px;border:1px solid #c1bdb2;background:none;font-family:var(--mono);font-size:8px}.close-expanded{position:fixed;right:calc(50% - 230px);top:calc(50% - 330px);color:white;font-size:30px}.mobile-nav{display:none}

.theme-toggle{height:30px;display:flex;align-items:center;gap:6px;padding:0 8px;border:1px solid #c6c2b7;background:transparent;color:var(--ink)}.theme-toggle>span{font-size:15px}.theme-toggle small{font-family:var(--mono);font-size:8px}
.welcome-screen[data-theme="light"]{background:var(--paper);color:var(--ink)}.welcome-screen[data-theme="light"] .wordmark{color:var(--ink)}.welcome-screen[data-theme="light"] .welcome-topline,.welcome-screen[data-theme="light"] .welcome-marquee{border-color:var(--line)}.welcome-screen[data-theme="light"] .micro-label,.welcome-screen[data-theme="light"] .welcome-footnote{color:#77766f}.welcome-screen[data-theme="light"] .text-button{color:var(--ink)}.welcome-screen[data-theme="light"] .welcome-description{color:#77766f}.welcome-screen[data-theme="light"] .welcome-description strong{color:var(--ink)}.welcome-screen[data-theme="light"] .login-panel{border-color:#aaa69b;background:#e8e5dc;box-shadow:8px 8px 0 #d3cfc3;color:var(--ink)}.welcome-screen[data-theme="light"] .panel-top,.welcome-screen[data-theme="light"] .panel-bottom{border-color:#cbc7bc;color:#77766f}.welcome-screen[data-theme="light"] .login-intro{color:#77766f}.welcome-screen[data-theme="light"] .login-inner label{color:#77766f}.welcome-screen[data-theme="light"] .login-inner input{border-color:#c4c0b5;background:#f1eee6;color:var(--ink)}.welcome-screen[data-theme="light"] .login-inner input::placeholder{color:#858178}.welcome-screen[data-theme="light"] .create-account{color:#77766f}.welcome-screen[data-theme="light"] .forgot{color:#77766f}.login-error{margin:0 0 12px;color:#f26a3d;font-family:var(--mono);font-size:8px;letter-spacing:.08em;text-transform:uppercase}.welcome-screen[data-theme="light"] .login-error{color:#d75a2c}.create-account-panel .login-intro{margin-bottom:16px}.create-account-panel form{gap:10px}.create-account-panel .switch-button{margin-top:2px}.create-account-panel .create-account{margin-top:14px}.spotify-connect{letter-spacing:.08em}.spotify-mark{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#1db954;color:#0b0f0d;font-size:12px;font-weight:700;line-height:1}.back-to-login{margin-top:14px}.welcome-screen[data-theme="dark"] .theme-toggle{border-color:#5a5b53;color:var(--paper)}
.dashboard[data-theme="dark"]{--ink:#f1eee6;--line:#46473f;background-color:#1c1d1a;background-image:radial-gradient(#ded5be12 .65px,transparent .65px);color:var(--ink)}
.dashboard[data-theme="dark"] .topbar,.dashboard[data-theme="dark"] .page-footer,.dashboard[data-theme="dark"] .identity-result,.dashboard[data-theme="dark"] .track-card-foot,.dashboard[data-theme="dark"] .song-row{border-color:var(--line)}
.dashboard[data-theme="dark"] .home-hero p,.dashboard[data-theme="dark"] .page-heading p,.dashboard[data-theme="dark"] .section-index,.dashboard[data-theme="dark"] .match-note,.dashboard[data-theme="dark"] .system-stamp,.dashboard[data-theme="dark"] .mood-label,.dashboard[data-theme="dark"] .describe-bottom>span,.dashboard[data-theme="dark"] .track-card-meta p,.dashboard[data-theme="dark"] .track-card-foot,.dashboard[data-theme="dark"] .song-name span,.dashboard[data-theme="dark"] .song-genre,.dashboard[data-theme="dark"] .song-mood,.dashboard[data-theme="dark"] .song-duration,.dashboard[data-theme="dark"] .breadcrumb,.dashboard[data-theme="dark"] .rail-title,.dashboard[data-theme="dark"] .rail-section-label,.dashboard[data-theme="dark"] .rail-subhead,.dashboard[data-theme="dark"] .rail-friend small,.dashboard[data-theme="dark"] .now-playing-meta span,.dashboard[data-theme="dark"] .player-times,.dashboard[data-theme="dark"] .rail-quote p,.dashboard[data-theme="dark"] .rail-quote small,.dashboard[data-theme="dark"] .identity-name p,.dashboard[data-theme="dark"] .genre-label,.dashboard[data-theme="dark"] .signal-caption,.dashboard[data-theme="dark"] .profile-title p,.dashboard[data-theme="dark"] .personality-bars>div>span,.dashboard[data-theme="dark"] .personality-bars>div>strong,.dashboard[data-theme="dark"] .profile-library-row div span,.dashboard[data-theme="dark"] .offline-status,.dashboard[data-theme="dark"] .storage-numbers,.dashboard[data-theme="dark"] .offline-row div span,.dashboard[data-theme="dark"] .offline-note,.dashboard[data-theme="dark"] .expanded-track-info p{color:#aaa79e}
.dashboard[data-theme="dark"] .search-box,.dashboard[data-theme="dark"] .describe-panel,.dashboard[data-theme="dark"] .offline-summary{border-color:var(--line);background:#282923;color:var(--ink);box-shadow:4px 4px 0 #11120f}
.dashboard[data-theme="dark"] .search-box{box-shadow:none}.dashboard[data-theme="dark"] .search-box input{color:var(--ink)}.dashboard[data-theme="dark"] .search-box input::placeholder{color:#99968d}.dashboard[data-theme="dark"] .search-box kbd{border-color:#515249;color:#aaa79e}
.dashboard[data-theme="dark"] .describe-panel textarea,.dashboard[data-theme="dark"] .chat-composer input,.dashboard[data-theme="dark"] .create-modal input{border-color:#4c4d45;background:#1e1f1b;color:var(--ink)}.dashboard[data-theme="dark"] .describe-panel textarea::placeholder,.dashboard[data-theme="dark"] .chat-composer input::placeholder{color:#96938a}.dashboard[data-theme="dark"] .mood-strip>button{border-color:#505149;color:#d2cec3}.dashboard[data-theme="dark"] .mood-strip>button.chosen{border-color:var(--orange);background:#f26a3d;color:#171714}.dashboard[data-theme="dark"] .describe-bottom,.dashboard[data-theme="dark"] .offline-library-list,.dashboard[data-theme="dark"] .offline-row{border-color:var(--line)}
.dashboard[data-theme="dark"] .right-rail{border-color:var(--line);background:#242520;color:var(--ink)}.dashboard[data-theme="dark"] .mini-progress{background:#4c4d45}.dashboard[data-theme="dark"] .rail-equalizer i{background:#4e4f47}.dashboard[data-theme="dark"] .rail-equalizer i:nth-child(4n),.dashboard[data-theme="dark"] .rail-equalizer i:nth-child(5n){background:#e59073}.dashboard[data-theme="dark"] .rail-friends,.dashboard[data-theme="dark"] .rail-room,.dashboard[data-theme="dark"] .now-playing-card{border-color:var(--line)}
.dashboard[data-theme="dark"] .library-tabs button{border-color:transparent;color:#aaa79e}.dashboard[data-theme="dark"] .library-tabs button.selected{border-color:var(--orange);color:var(--ink)}.dashboard[data-theme="dark"] .chat-layout{border-color:var(--line);background:#242520}.dashboard[data-theme="dark"] .friends-panel,.dashboard[data-theme="dark"] .chat-window-head,.dashboard[data-theme="dark"] .chat-composer{border-color:var(--line)}.dashboard[data-theme="dark"] .friend-row.friend-active,.dashboard[data-theme="dark"] .chat-composer input{background:#30312b}.dashboard[data-theme="dark"] .chat-message{background:#34352f}.dashboard[data-theme="dark"] .chat-message.message-mine{background:#633b2d}.dashboard[data-theme="dark"] .chat-message p,.dashboard[data-theme="dark"] .shared-track strong{color:#f1eee6}.dashboard[data-theme="dark"] .shared-track{background:#242520}.dashboard[data-theme="dark"] .shared-track span{color:#aaa79e}.dashboard[data-theme="dark"] .chat-composer>button{border-color:#55564e;color:var(--ink)}.dashboard[data-theme="dark"] .chat-composer .send-button{border-color:var(--orange);background:var(--orange);color:#171714}
.dashboard[data-theme="dark"] .profile-grid{border-color:var(--line)}.dashboard[data-theme="dark"] .profile-module{border-color:var(--line)}.dashboard[data-theme="dark"] .personality-bars>div>i{background:#42433c}.dashboard[data-theme="dark"] .profile-moods span{border-color:var(--line);color:#d2cec3}.dashboard[data-theme="dark"] .create-modal,.dashboard[data-theme="dark"] .expanded-player{border-color:#55564e;background:#242520;color:var(--ink)}.dashboard[data-theme="dark"] .create-modal label{color:#aaa79e}.dashboard[data-theme="dark"] .expanded-actions button{border-color:#55564e;color:var(--ink)}.dashboard[data-theme="dark"] .empty-state{border-color:var(--line);color:#aaa79e}



/* Chat interaction detail */
.chat-layout{display:grid;grid-template-columns:205px 1fr;min-height:490px;margin-top:21px;border:1px solid #c6c2b6;background:#f4f1ea;box-shadow:4px 4px 0 rgba(0,0,0,.04)}.friends-panel{display:flex;flex-direction:column;border-right:1px solid var(--line);background:rgba(255,255,255,.16)}.friends-heading{display:flex;align-items:center;justify-content:space-between;padding:12px 12px 10px;border-bottom:1px solid var(--line)}.friends-heading button{width:20px;height:20px;border:1px solid #c6c2b6;background:transparent;color:var(--orange)}.friend-row{width:100%;display:flex;align-items:center;gap:8px;padding:10px 12px;border:0;border-bottom:1px solid var(--line);background:transparent;text-align:left}.friend-row.friend-active{background:#efe9df}.friend-avatar{position:relative}.friend-avatar i{position:absolute;right:-1px;bottom:-1px;width:7px;height:7px;border-radius:50%;background:var(--green);border:2px solid var(--paper)}.friend-info{display:grid;gap:3px;min-width:0}.friend-info strong{font-size:10px}.friend-info small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#77766f}.friend-presence{margin-left:auto;width:8px;height:8px;border-radius:50%;background:#808173;box-shadow:0 0 0 2px rgba(0,0,0,.08)}.friend-presence.online{background:var(--green)}.chat-window{display:flex;flex-direction:column;min-height:0}.chat-window-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.chat-window-head>div:nth-child(2){display:grid;gap:3px;flex:1}.chat-window-head>div span{color:#77766f}.chat-window-head .more-button{margin-left:auto}.chat-messages{display:flex;flex:1;flex-direction:column;gap:12px;padding:16px 18px 10px;overflow:auto}.chat-message{display:flex;flex-direction:column;align-self:flex-start;max-width:78%;padding:12px 12px 10px;border:1px solid var(--line);background:#f7f3ea;border-radius:14px 14px 14px 4px}.chat-message.message-mine{align-self:flex-end;border-radius:14px 14px 4px 14px;background:#f2e3d9}.message-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}.message-author{font-family:var(--mono);font-size:8px;color:#7d7a73;text-transform:uppercase}.message-actions{display:flex;align-items:center;gap:4px}.mini-action{padding:2px 4px;border:1px solid var(--line);background:transparent;color:var(--ink);font-size:10px}.chat-message p{margin:10px 0 0;line-height:1.5;color:#1f1f1d}.message-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}.chat-message time{font-family:var(--mono);font-size:7px;color:#7d7a73;text-transform:uppercase}.reaction-row{display:flex;flex-wrap:wrap;gap:6px}.reaction-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border:1px solid var(--line);background:rgba(255,255,255,.35);font-family:var(--mono);font-size:7px}.reaction-pill.reaction-selected{border-color:var(--orange);color:var(--orange)}.reply-preview{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding:7px 8px;border:1px dashed var(--line);background:rgba(255,255,255,.18);font-family:var(--mono);font-size:7px;text-transform:uppercase;color:#5e5b53}.reply-preview strong{font-size:8px;font-weight:600;color:var(--ink)}.composer-reply{margin:0 0 8px}.cancel-reply{border:0;background:none;padding:0;color:var(--orange);font-size:15px;line-height:1}.chat-composer{display:flex;flex-direction:column;padding:10px 14px 14px;border-top:1px solid var(--line);background:rgba(255,255,255,.1)}.composer-row{display:flex;align-items:center;gap:8px}.chat-composer input{flex:1;height:38px;padding:0 12px;border:1px solid #c6c2b6;background:#f1eee6;color:var(--ink)}.share-button,.send-button{height:38px;border:1px solid #c6c2b6;background:transparent;font-family:var(--mono);font-size:8px;text-transform:uppercase}.share-button{width:38px}.send-button{padding:0 14px;border-color:var(--orange);background:var(--orange);color:#171714}.typing-indicator{margin-top:8px;color:#767267;font-family:var(--mono);font-size:8px}.shared-track{display:flex;align-items:center;gap:10px;margin-top:10px;padding:7px;border:1px solid var(--line);background:rgba(255,255,255,.35)}.shared-track img{width:46px;height:46px;object-fit:cover}.shared-track div{display:grid;gap:2px;flex:1}.shared-track strong{font-size:10px}.shared-track span{color:#77766f;font-size:9px}.shared-track button{width:32px;height:32px;border:1px solid var(--line);background:transparent}.dashboard[data-theme="dark"] .chat-layout{border-color:var(--line);background:#242520}.dashboard[data-theme="dark"] .friends-panel,.dashboard[data-theme="dark"] .chat-window-head,.dashboard[data-theme="dark"] .chat-composer,.dashboard[data-theme="dark"] .chat-message,.dashboard[data-theme="dark"] .shared-track,.dashboard[data-theme="dark"] .reply-preview{border-color:var(--line)}.dashboard[data-theme="dark"] .friend-row.friend-active{background:#30312b}.dashboard[data-theme="dark"] .friend-info small,.dashboard[data-theme="dark"] .message-author,.dashboard[data-theme="dark"] .message-footer time,.dashboard[data-theme="dark"] .reply-preview,.dashboard[data-theme="dark"] .typing-indicator{color:#aaa79e}.dashboard[data-theme="dark"] .chat-composer input{background:#1e1f1b}.dashboard[data-theme="dark"] .share-button,.dashboard[data-theme="dark"] .send-button,.dashboard[data-theme="dark"] .mini-action{border-color:#55564e;color:var(--ink)}.dashboard[data-theme="dark"] .chat-message{background:#34352f}.dashboard[data-theme="dark"] .chat-message.message-mine{background:#633b2d}.dashboard[data-theme="dark"] .chat-message p,.dashboard[data-theme="dark"] .shared-track strong{color:#f1eee6}.dashboard[data-theme="dark"] .shared-track{background:#242520}.dashboard[data-theme="dark"] .shared-track span{color:#aaa79e}.dashboard[data-theme="dark"] .reaction-pill{background:#1f201d}


/* Chat interaction detail */
.chat-layout{display:grid;grid-template-columns:205px 1fr;min-height:490px;margin-top:21px;border:1px solid #c6c2b6;background:#f4f1ea;box-shadow:4px 4px 0 rgba(0,0,0,.04)}.friends-panel{display:flex;flex-direction:column;border-right:1px solid var(--line);background:rgba(255,255,255,.16)}.friends-heading{display:flex;align-items:center;justify-content:space-between;padding:12px 12px 10px;border-bottom:1px solid var(--line)}.friends-heading button{width:20px;height:20px;border:1px solid #c6c2b6;background:transparent;color:var(--orange)}.friend-row{width:100%;display:flex;align-items:center;gap:8px;padding:10px 12px;border:0;border-bottom:1px solid var(--line);background:transparent;text-align:left}.friend-row.friend-active{background:#efe9df}.friend-avatar{position:relative}.friend-avatar i{position:absolute;right:-1px;bottom:-1px;width:7px;height:7px;border-radius:50%;background:var(--green);border:2px solid var(--paper)}.friend-info{display:grid;gap:3px;min-width:0}.friend-info strong{font-size:10px}.friend-info small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#77766f}.friend-presence{margin-left:auto;width:8px;height:8px;border-radius:50%;background:#808173;box-shadow:0 0 0 2px rgba(0,0,0,.08)}.friend-presence.online{background:var(--green)}.chat-window{display:flex;flex-direction:column;min-height:0}.chat-window-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.chat-window-head>div:nth-child(2){display:grid;gap:3px;flex:1}.chat-window-head>div span{color:#77766f}.chat-window-head .more-button{margin-left:auto}.chat-messages{display:flex;flex:1;flex-direction:column;gap:12px;padding:16px 18px 10px;overflow:auto}.chat-message{display:flex;flex-direction:column;align-self:flex-start;max-width:78%;padding:12px 12px 10px;border:1px solid var(--line);background:#f7f3ea;border-radius:14px 14px 14px 4px}.chat-message.message-mine{align-self:flex-end;border-radius:14px 14px 4px 14px;background:#f2e3d9}.message-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}.message-author{font-family:var(--mono);font-size:8px;color:#7d7a73;text-transform:uppercase}.message-actions{display:flex;align-items:center;gap:4px}.mini-action{padding:2px 4px;border:1px solid var(--line);background:transparent;color:var(--ink);font-size:10px}.chat-message p{margin:10px 0 0;line-height:1.5;color:#1f1f1d}.message-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}.chat-message time{font-family:var(--mono);font-size:7px;color:#7d7a73;text-transform:uppercase}.reaction-row{display:flex;flex-wrap:wrap;gap:6px}.reaction-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border:1px solid var(--line);background:rgba(255,255,255,.35);font-family:var(--mono);font-size:7px}.reaction-pill.reaction-selected{border-color:var(--orange);color:var(--orange)}.reply-preview{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding:7px 8px;border:1px dashed var(--line);background:rgba(255,255,255,.18);font-family:var(--mono);font-size:7px;text-transform:uppercase;color:#5e5b53}.reply-preview strong{font-size:8px;font-weight:600;color:var(--ink)}.composer-reply{margin:0 0 8px}.cancel-reply{border:0;background:none;padding:0;color:var(--orange);font-size:15px;line-height:1}.chat-composer{display:flex;flex-direction:column;padding:10px 14px 14px;border-top:1px solid var(--line);background:rgba(255,255,255,.1)}.composer-row{display:flex;align-items:center;gap:8px}.chat-composer input{flex:1;height:38px;padding:0 12px;border:1px solid #c6c2b6;background:#f1eee6;color:var(--ink)}.share-button,.send-button{height:38px;border:1px solid #c6c2b6;background:transparent;font-family:var(--mono);font-size:8px;text-transform:uppercase}.share-button{width:38px}.send-button{padding:0 14px;border-color:var(--orange);background:var(--orange);color:#171714}.typing-indicator{margin-top:8px;color:#767267;font-family:var(--mono);font-size:8px}.shared-track{display:flex;align-items:center;gap:10px;margin-top:10px;padding:7px;border:1px solid var(--line);background:rgba(255,255,255,.35)}.shared-track img{width:46px;height:46px;object-fit:cover}.shared-track div{display:grid;gap:2px;flex:1}.shared-track strong{font-size:10px}.shared-track span{color:#77766f;font-size:9px}.shared-track button{width:32px;height:32px;border:1px solid var(--line);background:transparent}.dashboard[data-theme="dark"] .chat-layout{border-color:var(--line);background:#242520}.dashboard[data-theme="dark"] .friends-panel,.dashboard[data-theme="dark"] .chat-window-head,.dashboard[data-theme="dark"] .chat-composer,.dashboard[data-theme="dark"] .chat-message,.dashboard[data-theme="dark"] .shared-track,.dashboard[data-theme="dark"] .reply-preview{border-color:var(--line)}.dashboard[data-theme="dark"] .friend-row.friend-active{background:#30312b}.dashboard[data-theme="dark"] .friend-info small,.dashboard[data-theme="dark"] .message-author,.dashboard[data-theme="dark"] .message-footer time,.dashboard[data-theme="dark"] .reply-preview,.dashboard[data-theme="dark"] .typing-indicator{color:#aaa79e}.dashboard[data-theme="dark"] .chat-composer input{background:#1e1f1b}.dashboard[data-theme="dark"] .share-button,.dashboard[data-theme="dark"] .send-button,.dashboard[data-theme="dark"] .mini-action{border-color:#55564e;color:var(--ink)}.dashboard[data-theme="dark"] .chat-message{background:#34352f}.dashboard[data-theme="dark"] .chat-message.message-mine{background:#633b2d}.dashboard[data-theme="dark"] .chat-message p,.dashboard[data-theme="dark"] .shared-track strong{color:#f1eee6}.dashboard[data-theme="dark"] .shared-track{background:#242520}.dashboard[data-theme="dark"] .shared-track span{color:#aaa79e}.dashboard[data-theme="dark"] .reaction-pill{background:#1f201d}
.shared-track img{display:block;width:50px;height:50px;aspect-ratio:1;flex:0 0 50px;object-fit:cover}.shared-track small{overflow:hidden;color:#77766f;font-family:var(--mono);font-size:7px;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}.dashboard[data-theme="dark"] .shared-track small{color:#aaa79e}.now-playing-art:has(img[src*="mzstatic.com"]){aspect-ratio:1}.unsend-button{padding:3px 5px;border:1px solid var(--line);background:transparent;color:#a64f3d;font-family:var(--mono);font-size:7px}.dashboard[data-theme="dark"] .unsend-button{color:#efaa91}
.chat-layout{grid-template-columns:minmax(125px,205px) minmax(0,1fr)}.friends-panel,.chat-window,.chat-messages{min-width:0}.chat-message{width:fit-content;max-width:94%;min-width:0}.message-meta,.message-footer{width:100%;min-width:0;flex-wrap:wrap;align-items:flex-start}.message-actions{display:flex;flex:1 1 100%;flex-wrap:wrap;justify-content:flex-end;gap:3px;min-width:0;max-width:100%;margin-left:auto}.mini-action{display:grid;width:24px;height:24px;min-width:24px;flex:0 0 24px;place-items:center;padding:0}.unsend-button{flex:0 0 auto;white-space:nowrap}.mini-action.unsend-button{width:24px;height:24px;min-width:24px;flex:0 0 24px;padding:0;color:#a64f3d}.dashboard[data-theme="dark"] .mini-action.unsend-button{color:#efaa91}.reaction-row{min-width:0;flex-wrap:wrap}.reaction-pill{min-width:36px;justify-content:center}.shared-track,.shared-track>div{min-width:0}
@media(max-width:1150px){.chat-layout{grid-template-columns:minmax(125px,165px) minmax(0,1fr)}.chat-messages{padding-right:10px;padding-left:10px}.chat-message{max-width:98%}}
.mini-action.unsend-button{font-size:15px;line-height:1}
.page-footer .logout-button{padding:0;border:0;background:transparent;color:var(--orange);font-family:var(--mono);font-size:9px;text-transform:uppercase;white-space:nowrap}.page-footer .logout-button:hover{color:var(--ink)}
.profile-session-actions{display:flex;justify-content:flex-end;margin:0 0 10px}.profile-logout-button{padding:8px 10px;border:1px solid var(--line);background:transparent;color:#a64f3d;font-family:var(--mono);font-size:8px}.dashboard[data-theme="dark"] .profile-logout-button{color:#efaa91}
.account-menu-anchor{position:relative;display:flex;align-items:center}.account-menu{position:absolute;z-index:12;display:grid;gap:2px;min-width:140px;padding:4px;border:1px solid var(--line);background:var(--paper);box-shadow:3px 3px 0 rgba(0,0,0,.15)}.account-menu-popover-sidebar{right:0;bottom:calc(100% + 7px)}.account-menu-popover-top{top:calc(100% + 7px);right:0}.account-menu button{width:100%;padding:9px 10px;border:0;background:transparent;color:var(--ink);text-align:left;font-family:var(--mono);font-size:8px;white-space:nowrap}.account-menu button:hover{background:#e8e4da}.dashboard[data-theme="dark"] .account-menu{background:#242520}.dashboard[data-theme="dark"] .account-menu button:hover{background:#30312b}
.sidebar-bottom .account-menu-anchor>.more-button{display:grid;width:28px;height:28px;place-items:center;margin-left:auto}.account-menu-popover-sidebar{position:fixed;left:calc(var(--sidebar-width) - 158px);right:auto;bottom:60px;z-index:20}
.chat-options{position:relative;margin-left:auto}.chat-options-menu{position:absolute;z-index:10;top:calc(100% + 6px);right:0;min-width:165px;padding:4px;border:1px solid var(--line);background:var(--paper);box-shadow:3px 3px 0 rgba(0,0,0,.12)}.chat-options-menu button{width:100%;padding:9px 10px;border:0;background:transparent;color:#a64f3d;text-align:left;font-family:var(--mono);font-size:8px;white-space:nowrap}.chat-options-menu button:hover{background:#f2e3d9}.dashboard[data-theme="dark"] .chat-options-menu{background:#242520}.chat-delete-modal{width:min(380px,100%)}.chat-delete-modal>p{margin:0 0 20px;color:#77766f;font-size:11px;line-height:1.5}.dashboard[data-theme="dark"] .chat-delete-modal>p{color:#aaa79e}.chat-delete-actions{display:flex;justify-content:flex-end;gap:8px}.chat-delete-actions button{padding:9px 11px;border:1px solid var(--line);background:transparent;font-family:var(--mono);font-size:8px}.chat-delete-actions button:last-child{border-color:var(--orange);background:var(--orange);color:#171714}.chat-empty-state{align-self:center;margin:auto;text-align:center}
.chat-message{position:relative;touch-action:pan-y;transition:transform .14s ease-out,box-shadow .14s ease-out}.chat-message.message-swiping{transition:none;transform:translateX(var(--swipe-offset,0px))}.chat-message.swipe-reply-ready{border-color:var(--orange);box-shadow:0 0 0 1px var(--orange)}
.friend-info .friend-time{display:block;color:#89867e;font-family:var(--mono);font-size:7px;line-height:1;text-transform:uppercase}.dashboard[data-theme="dark"] .friend-info .friend-time{color:#aaa79e}
.message-actions{position:absolute;z-index:6;right:0;bottom:calc(100% + 6px);display:flex;flex:0 1 auto;flex-wrap:wrap;justify-content:flex-end;gap:3px;width:max-content;max-width:min(240px,calc(100vw - 32px));min-width:0;margin:0;padding:4px;border:1px solid var(--line);background:var(--paper);box-shadow:3px 3px 0 rgba(0,0,0,.12);animation:message-actions-pop .12s ease-out}.dashboard[data-theme="dark"] .message-actions{background:#242520}
.chat-message.message-actions-open{z-index:6;transform:scale(1.025);transform-origin:center;box-shadow:0 2px 8px rgba(23,23,20,.16)}.chat-message .message-actions{position:static;z-index:auto;display:flex;flex:1 1 100%;flex-wrap:wrap;justify-content:flex-end;gap:3px;width:100%;max-width:100%;min-width:0;margin:4px 0;padding:0;border:0;background:transparent;box-shadow:none}
@keyframes message-actions-pop{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
@keyframes record-spin{to{transform:translateY(-50%) rotate(360deg)}}@keyframes equalize{from{height:4px}to{height:20px}}@keyframes marquee{to{transform:translateX(-100%)}}@keyframes reveal{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

@media(min-width:1500px){:root{--sidebar-width:245px;--rail-width:310px}.main-content{max-width:1400px;padding-left:45px;padding-right:45px}.right-rail{padding-left:22px;padding-right:22px}.cover-button{aspect-ratio:1.32}}
@media(max-width:1150px){:root{--sidebar-width:195px;--rail-width:245px}.sidebar{padding-left:15px;padding-right:15px}.main-content{padding-left:25px;padding-right:25px}.right-rail{padding-left:14px;padding-right:14px}.welcome-screen{padding:0 4vw}.welcome-grid{gap:5%;}.welcome-copy h1{font-size:clamp(68px,10vw,120px)}.song-row{grid-template-columns:22px 34px minmax(110px,1.5fr) .8fr .8fr 32px 18px;gap:7px}}
@media(max-width:900px){:root{--sidebar-width:178px;--rail-width:0px}.right-rail{display:none}.dashboard{padding-right:0}.main-content{max-width:850px;padding-left:32px;padding-right:32px}.welcome-grid{grid-template-columns:minmax(0,1.25fr) minmax(280px,.8fr);gap:4%}.welcome-copy h1{font-size:clamp(66px,9.5vw,110px)}.login-inner{padding:25px 24px}.track-grid{gap:11px}.track-card-meta h3{font-size:11px}.toast-message{right:24px}.room-layout{grid-template-columns:minmax(0,1.35fr) minmax(195px,.75fr)}}
@media(max-width:680px){:root{--sidebar-width:0px}.welcome-screen{padding:0 19px 54px}.welcome-topline{height:65px}.welcome-topline .wordmark{font-size:35px}.welcome-topline .theme-toggle{padding:0 6px}.welcome-topline .theme-toggle small{display:none}.micro-label{display:none}.text-button{font-size:8px}.welcome-grid{display:flex;flex-direction:column;align-items:stretch;gap:28px;padding:45px 0 34px}.welcome-copy h1{font-size:clamp(73px,18vw,116px)}.welcome-copy .eyebrow{font-size:7px}.welcome-description{font-size:12px;margin:18px 0}.welcome-art{height:225px}.record{width:190px;right:26px}.art-caption b{font-size:18px}.login-panel{width:100%;max-width:440px;align-self:center}.login-inner{padding:23px 25px}.login-inner h2{font-size:53px}.welcome-footnote{font-size:7px}.welcome-footnote span:nth-child(2){display:none}.welcome-marquee{position:absolute;left:0;right:0;bottom:0;height:35px}.dashboard{padding:0 0 74px}.sidebar{display:none}.mobile-header{height:53px;position:sticky;z-index:7;top:0;display:flex;align-items:center;justify-content:space-between;padding:0 17px;border-bottom:1px solid #3a3a34;background:#1b1c19}.mobile-header .wordmark{font-size:32px}.mobile-avatar{width:29px;height:29px;border:0}.main-content{padding:0 17px 20px}.topbar{height:47px;gap:11px}.breadcrumb{font-size:7px}.breadcrumb>span,.breadcrumb>b{display:none}.search-box{width:auto;flex:1;height:29px}.search-box kbd{display:none}.theme-toggle{width:31px;height:29px;justify-content:center;padding:0}.theme-toggle small{display:none}.notification-button{width:24px}.top-avatar{display:none}.home-hero{padding:34px 0 21px}.home-hero h1,.page-heading h1{font-size:clamp(57px,14vw,86px)}.home-hero .eyebrow{font-size:7px;gap:6px}.hero-index{font-size:7px}.home-hero p,.page-heading p{font-size:10px}.describe-panel{margin-top:17px;padding:15px 13px 0}.describe-panel:after{right:8px;top:48px;font-size:32px}.describe-head h2{font-size:28px}.system-stamp{font-size:7px}.describe-panel textarea{min-height:90px;padding:9px;font-size:11px}.mood-strip{gap:5px}.mood-label{width:100%;margin-bottom:1px}.mood-strip>button{font-size:8px;padding:6px}.describe-bottom{margin:0 -13px;padding:9px 12px}.describe-bottom>span{max-width:100px;font-size:7px;line-height:1.4}.generate-button{min-width:158px;height:36px;font-size:8px}.identity-result{margin-top:25px;padding-bottom:17px}.identity-heading h2{font-size:29px}.match-note{max-width:120px;font-size:7px;text-align:right}.identity-body{grid-template-columns:1fr;gap:11px;margin-top:13px;padding:15px}.identity-name h3{font-size:39px}.identity-name p{max-width:100%}.genre-cloud{padding-top:1px}.identity-body .genre-tags{margin:11px 0 14px}.signal-bars{height:31px}.signal-bars i{width:3px}.content-section{margin-top:24px}.section-title-row h2{font-size:28px}.section-title-row>.inline-link{font-size:7px}.track-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 10px;margin-top:13px}.cover-button{aspect-ratio:1.1}.track-card-meta h3{font-size:10px}.track-card-meta p{font-size:8px}.track-card-foot{font-size:7px}.library-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.library-card{aspect-ratio:.95}.library-card-info strong{font-size:20px}.library-card-info small{font-size:6px}.library-card:nth-child(3){display:none}.page-footer{flex-wrap:wrap;margin-top:25px;font-size:6px}.page-footer span:nth-child(2){display:none}.mobile-nav{position:fixed;z-index:8;left:0;right:0;bottom:0;height:61px;display:flex;justify-content:space-around;align-items:center;padding-bottom:env(safe-area-inset-bottom);border-top:1px solid #47473f;background:#1b1c19}.mobile-nav button{flex:1;height:100%;display:grid;align-content:center;justify-items:center;gap:4px;border:0;background:none;color:#98968d}.mobile-nav button>span{font-size:16px}.mobile-nav button small{font-family:var(--mono);font-size:7px}.mobile-nav button.active{color:var(--orange)}.page-heading{padding:28px 0 19px}.page-heading h1{margin:15px 0 8px}.discover-form{margin-top:15px}.discover-track-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.discover-track-grid .cover-button{aspect-ratio:1.08}.discover-genre-tags{gap:4px}.discover-genre-tags .genre-chip{padding:6px;font-size:7px}.artist-strip{grid-template-columns:1fr;margin-top:23px}.artist-strip-title{grid-row:auto;margin-bottom:8px}.artist-row{gap:8px}.artist-row span{font-size:6px}.library-page-heading>.switch-button{right:0;bottom:19px;width:125px;height:31px;padding:0 8px;font-size:7px}.library-full-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.library-card-static{aspect-ratio:.88}.library-tabs{gap:8px}.library-tabs button{font-size:7px}.song-row{grid-template-columns:23px 33px minmax(0,1fr) 23px;gap:7px;padding:6px 0}.song-row .song-genre,.song-row .song-mood,.song-row .song-duration{display:none}.song-name strong{font-size:9px}.song-name span{font-size:8px}.chat-layout{grid-template-columns:1fr;min-height:0}.friends-panel{display:flex;overflow:auto;gap:4px;padding:8px;border-right:0;border-bottom:1px solid #cbc7bc}.friends-heading{min-width:75px;align-items:center}.friends-heading .section-index{font-size:7px}.friend-row{width:auto;min-width:35px;padding:4px}.friend-info,.friend-presence{display:none}.chat-window{min-height:365px}.chat-messages{max-height:340px}.chat-window-head{height:50px}.room-layout{grid-template-columns:1fr}.room-main{padding:10px}.room-art{height:255px}.room-art-title h2{font-size:42px}.room-disc{width:65px;right:15px}.room-track-info h3{font-size:10px}.room-reactions{gap:1px}.room-reactions button{width:24px;height:25px;font-size:11px}.room-aside{border-top:1px solid #44453f;border-left:0;padding:13px}.listener-row{display:inline-flex;width:32%;vertical-align:top}.listener-row>div,.listener-wave{display:none}.listener-placeholder{padding-top:3px}.room-chat-message{display:inline-block;width:48%;vertical-align:top}.room-join{margin-top:7px}.profile-hero{margin:0 -17px}.profile-cover{height:140px}.profile-cover>span{left:17px;font-size:7px}.profile-details{flex-wrap:wrap;align-items:center;gap:9px;padding:0 0 12px}.profile-avatar{width:58px;height:58px;font-size:33px}.profile-title{min-width:calc(100% - 75px)}.profile-title h1{font-size:33px}.profile-title p{font-size:9px}.profile-title .section-index{font-size:7px}.profile-details>.switch-button{margin-left:67px;margin-top:-5px}.profile-grid{grid-template-columns:1fr;margin-top:16px}.profile-module{min-height:0;padding:13px}.profile-module h2{font-size:22px}.profile-tags .genre-chip{font-size:7px}.personality-bars{max-width:390px}.profile-library-row{max-width:350px}.offline-summary{margin-top:16px;padding:14px}.offline-header h2{font-size:36px}.offline-status{font-size:6px}.storage-numbers{font-size:6px}.offline-note{font-size:6px}.toast-message{right:12px;bottom:76px;left:12px;justify-content:center}.player-overlay{padding:16px}.expanded-player{padding:15px}.expanded-player>img{max-height:39vh}.expanded-track-info h2{font-size:28px}.close-expanded{right:14px;top:10px}.modal-backdrop{padding:14px}.create-modal{padding:22px}.create-modal h2{font-size:46px}}
.spotify-search-button{padding:6px 8px;border:1px solid rgba(29,185,84,.6);background:rgba(29,185,84,.1);color:var(--ink);font-family:var(--mono);font-size:7px;letter-spacing:.09em;white-space:nowrap}.spotify-search-button:hover{background:rgba(29,185,84,.18)}.spotify-link-button{padding:5px 7px;border:1px solid rgba(29,185,84,.6);background:rgba(29,185,84,.08);color:var(--ink);font-family:var(--mono);font-size:7px;letter-spacing:.07em;text-transform:uppercase}.spotify-link-button:hover{background:rgba(29,185,84,.16)}
.spotify-results-section{padding-bottom:36px}.spotify-results-heading{position:relative;padding-right:120px}.spotify-results-heading .inline-link{position:absolute;right:0;bottom:30px}.spotify-results-list{display:grid;gap:11px;margin-top:22px}.spotify-result-row{display:grid;grid-template-columns:30px 72px minmax(0,1fr) 116px;align-items:center;gap:14px;min-height:106px;padding:13px;border:1px solid var(--line);background:rgba(241,238,230,.72);box-shadow:3px 3px 0 rgba(23,23,20,.06);transition:border-color .16s,background .16s}.spotify-result-row:hover,.spotify-result-row.spotify-result-selected{border-color:#1db954;background:rgba(29,185,84,.06)}.spotify-result-index{color:var(--muted);font-family:var(--mono);font-size:9px}.spotify-result-row>img,.spotify-result-art-fallback{width:72px;height:72px;object-fit:cover}.spotify-result-art-fallback{display:grid;place-items:center;background:#1db954;color:#101510;font-size:23px}.spotify-result-info{display:grid;gap:5px;min-width:0}.spotify-result-info strong,.spotify-result-info span,.spotify-result-info small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.spotify-result-info strong{font-size:15px}.spotify-result-info span{color:var(--muted);font-size:12px}.spotify-result-info small{color:var(--muted);font-family:var(--mono);font-size:8px;text-transform:uppercase}.spotify-result-play{display:flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:0 8px;border:1px solid #1db954;background:rgba(29,185,84,.12);color:var(--ink);font-family:var(--mono);font-size:8px;white-space:nowrap}.spotify-result-play:hover{background:#1db954;color:#101510}.spotify-result-play>span{font-size:12px}.spotify-search-message{margin:24px 0;padding:24px;border:1px solid var(--line);color:var(--muted);font-size:12px;line-height:1.6}.spotify-embed-player{grid-column:1/-1;display:grid;gap:8px;padding:12px;border-top:1px solid rgba(29,185,84,.45)}.spotify-embed-label{display:flex;align-items:center;gap:7px;color:var(--muted);font-family:var(--mono);font-size:8px}.spotify-embed-label i{width:8px;height:8px;border-radius:50%;background:#1db954}.spotify-embed-player iframe{display:block;border:0;border-radius:8px}.dashboard[data-theme="dark"] .spotify-result-row{background:rgba(40,41,35,.72)}.dashboard[data-theme="dark"] .spotify-result-row:hover,.dashboard[data-theme="dark"] .spotify-result-row.spotify-result-selected{background:rgba(29,185,84,.08)}
@media(max-width:680px){.spotify-results-heading{padding-right:0;padding-bottom:48px}.spotify-results-heading .inline-link{right:auto;left:0;bottom:14px}.spotify-result-row{grid-template-columns:20px 58px minmax(0,1fr) 36px;gap:9px;padding:9px}.spotify-result-row>img,.spotify-result-art-fallback{width:58px;height:58px}.spotify-result-info strong{font-size:12px}.spotify-result-info span{font-size:10px}.spotify-result-info small{font-size:7px}.spotify-result-play{width:34px;min-width:34px;padding:0;font-size:0}.spotify-result-play>span{font-size:13px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
.welcome-screen[data-theme="light"]{background:rgba(241,238,230,.55);backdrop-filter:blur(1px)}
.welcome-screen[data-theme="dark"]{background:rgba(25,26,24,.56);backdrop-filter:blur(1px)}
.dashboard{background-color:rgba(241,238,230,.58);backdrop-filter:blur(1px)}
.dashboard[data-theme="dark"]{background-color:rgba(28,29,26,.56);backdrop-filter:blur(1px)}
.chat-layout{background:rgba(244,241,234,.48)}
.dashboard[data-theme="dark"] .chat-layout{background:rgba(36,37,32,.52)}
.volume-control{display:flex;align-items:center;gap:7px;margin:12px 0 10px}.volume-toggle{display:grid;width:21px;height:24px;flex:0 0 21px;place-items:center;padding:0;border:0;background:transparent;color:var(--muted);font-size:15px}.volume-toggle:hover{color:var(--orange)}
.artist-flip-back{display:flex;height:100%;flex-direction:column;justify-content:center;gap:3px;padding:7px 10px}.artist-flip-back strong{font-family:var(--display);font-size:16px;line-height:1}.artist-flip-back small{color:var(--muted);font-family:var(--mono);font-size:7px;text-transform:uppercase}.library-artist-flipper{max-width:420px;margin-bottom:6px}
.home-describe-panel{margin-top:24px;padding:22px 24px 0}.home-describe-panel textarea{min-height:112px;padding:16px}.home-identity-flipper{margin-top:28px}.home-identity-flipper .identity-result{padding:20px 0}
@media(max-width:680px){.home-describe-panel{margin-top:20px;padding:18px 14px 0}.home-describe-panel textarea{min-height:100px;padding:13px}.home-identity-flipper{margin-top:22px}.home-identity-flipper .identity-result{padding:17px 0}}
.discover-style-picker{display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,.65fr);align-items:center;gap:18px;margin:16px 0 13px;padding:13px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.discover-style-copy{display:grid;gap:5px}.discover-style-copy strong{font-family:var(--display);font-size:26px;line-height:1}.discover-style-copy p{margin:0;color:var(--muted);font-size:10px}.discover-style-picker .option-wheel{max-width:260px;justify-self:end}
@media(max-width:680px){.discover-style-picker{grid-template-columns:1fr;gap:2px;margin:12px 0 10px;padding:11px 0}.discover-style-copy strong{font-size:22px}.discover-style-picker .option-wheel{max-width:none}}
</style>

<style>
.player-seek{width:100%;height:12px;margin:8px 0 2px;accent-color:var(--orange);cursor:pointer}
.player-seek:disabled{opacity:.45;cursor:not-allowed}
.player-status{margin:3px 0;color:var(--muted);font-family:var(--mono);font-size:8px;line-height:1.5}
.source-config-button{margin-left:6px;padding:3px 7px;border:1px solid var(--orange);background:transparent;color:var(--orange);font-family:var(--mono);font-size:7px;letter-spacing:.06em}
.source-config-button:hover{background:var(--orange);color:var(--ink)}
.shared-track-config{flex:0 0 auto;padding:7px 9px;border:1px solid var(--orange);background:transparent;color:var(--orange);font-family:var(--mono);font-size:8px}
.shared-track-config:hover{background:var(--orange);color:var(--ink)}
.room-seek{min-width:80px;flex:1;margin:0}
.track-title-button,.song-title-button{padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.track-title-button:hover,.song-title-button:hover{color:var(--orange)}
.archive-detail{margin-top:20px}
.archive-add-tracks{display:grid;gap:0;margin-top:22px;border-top:1px solid var(--line)}
.archive-add-tracks>.section-index{padding:12px 0;border-bottom:1px solid var(--line)}
.archive-add-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.archive-add-row>span{display:grid;gap:4px;min-width:0}
.archive-add-row strong{font-size:11px}
.archive-add-row small{color:var(--muted);font-family:var(--mono);font-size:8px}
.archive-add-row button,.archive-remove-track{flex:0 0 auto;padding:7px 9px;border:1px solid var(--orange);background:transparent;color:var(--ink);font-family:var(--mono);font-size:8px}
.archive-add-row button:disabled,.library-card-actions button:disabled,.archive-play-all:disabled{opacity:.5;cursor:not-allowed}
.archive-play-all{margin-top:18px}
@media(max-width:680px){.archive-add-row{gap:8px}.archive-remove-track{padding:6px;font-size:7px}.archive-detail .section-title-row{align-items:flex-start}}
.player-extra-controls{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.player-extra-controls button{padding:6px 7px;border:1px solid var(--line);background:transparent;color:var(--muted);font-family:var(--mono);font-size:7px}
.player-extra-controls button.active,.player-extra-controls button:hover{border-color:var(--orange);color:var(--orange)}
.playback-queue{max-height:260px;margin-top:9px;overflow:auto;border-top:1px solid var(--line)}
.queue-heading{display:flex;justify-content:space-between;padding:9px 0;color:var(--muted);font-family:var(--mono);font-size:8px}
.queue-empty{margin:7px 0;color:var(--muted);font-size:10px}
.queue-row{display:flex;align-items:center;gap:6px;min-width:0;border-top:1px solid var(--line)}
.queue-track{display:grid;flex:1;gap:3px;min-width:0;padding:7px 0;border:0;background:transparent;color:var(--ink);text-align:left}
.queue-track strong,.queue-track small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.queue-track strong{font-size:9px}.queue-track small{color:var(--muted);font-size:8px}
.queue-add,.queue-remove{width:25px;height:25px;flex:0 0 25px;border:1px solid var(--line);background:transparent;color:var(--orange);font-size:14px}
.queue-catalog{margin-top:10px;padding-top:7px;border-top:1px solid var(--line)}
.queue-catalog>.section-index{display:block;padding:4px 0 7px}
.expanded-player .playback-queue{max-height:180px}
.youtube-player-window{position:fixed;right:calc(var(--rail-width) + 16px);bottom:16px;z-index:13;width:min(356px,calc(100vw - var(--rail-width) - 24px));padding:5px;border:1px solid var(--line);background:var(--paper);box-shadow:4px 4px 0 rgba(23,23,20,.16)}
.youtube-player-mount{width:100%;min-height:200px;aspect-ratio:356/200;background:#171714}
.youtube-player-mount iframe{display:block;width:100%;height:200px;max-width:100%}
.youtube-player-caption{display:block;padding:5px 3px 2px;color:var(--muted);font-family:var(--mono);font-size:7px;text-transform:uppercase}
@media(max-width:900px){.youtube-player-window{right:12px;bottom:125px;width:min(356px,calc(100vw - 24px))}}
.mobile-player{display:none}
@media(max-width:900px){.mobile-player{position:fixed;z-index:9;right:0;bottom:61px;left:0;display:flex;align-items:center;gap:9px;height:56px;padding:6px 12px;border-top:1px solid var(--line);background:var(--paper);box-shadow:0 -3px 12px rgba(20,20,18,.08)}.mobile-player-art{width:40px;height:40px;flex:0 0 40px;padding:0;border:0;background:transparent}.mobile-player-art img{width:100%;height:100%;object-fit:cover}.mobile-player-track{display:grid;flex:1;gap:3px;min-width:0;padding:0;border:0;background:transparent;color:var(--ink);text-align:left}.mobile-player-track strong,.mobile-player-track small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mobile-player-track strong{font-size:10px}.mobile-player-track small{color:var(--muted);font-size:8px}.mobile-player-control{width:27px;height:32px;flex:0 0 27px;padding:0;border:0;background:transparent;color:var(--ink);font-size:12px}.mobile-player-play{color:var(--orange)}.mobile-player-progress{position:absolute;right:0;bottom:0;left:0;height:2px;background:linear-gradient(to right,var(--orange) 0 var(--play-progress),transparent var(--play-progress) 100%)}.dashboard[data-theme="dark"] .mobile-player{background:#242520}}

/* Local audio status chips */
.local-audio-chip{display:inline-block;padding:3px 7px;border:1px solid var(--line);color:var(--muted);font-family:var(--mono);font-size:7px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.local-audio-chip.local-audio-ok{border-color:var(--green);color:var(--green)}
.local-audio-chip.local-audio-warn{border-color:var(--orange);color:var(--orange)}
.local-audio-chip.local-audio-pending{border-style:dashed}
.track-card-foot{flex-wrap:wrap;row-gap:4px}
.song-name .local-audio-chip{justify-self:start;margin-top:1px}
.shared-track .local-audio-chip{display:inline-block;margin-top:5px}
</style>
