/**
 * SYNX local-audio manifest — single source of truth for the
 * song-id → expected-filename mapping used by both the app and the server.
 *
 * A filename in this manifest is the EXPECTED location for an authorized
 * local MP3. It is NOT proof that the file exists or is valid. Real
 * availability is verified server-side (existence, non-empty size, MP3 file
 * signature) and exposed through `GET /api/music/report`.
 *
 * Nuxt serves files in `public/` from the site root:
 *   physical file : public/music/the-night-we-met.mp3
 *   browser URL   : /music/the-night-we-met.mp3
 */

export type SongAudioStatus = 'available' | 'missing' | 'invalid' | 'unconfigured'

export interface SongAudioManifestEntry {
  /** Existing SYNX song record id (catalog ids are numbers, chat songs use string ids). */
  songId: number | string
  title: string
  artist: string
  /** Expected filename inside public/music (no directories, .mp3 only). */
  expectedFile: string
}

/** Only plain .mp3 filenames are accepted under /music: no separators, no traversal. */
export const MP3_FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.mp3$/

export const MUSIC_PUBLIC_PATH = '/music'

/**
 * Explicit mapping between every existing SYNX song record and the local MP3
 * that should back it. Add a row here when you add an authorized file.
 */
export const SONG_AUDIO_MANIFEST: readonly SongAudioManifestEntry[] = [
  // Featured catalog (numeric ids from `tracks` in app/app.vue)
  { songId: 1, title: 'The Night We Met', artist: 'Lord Huron', expectedFile: 'the-night-we-met.mp3' },
  { songId: 2, title: 'Genesis', artist: 'Grimes', expectedFile: 'genesis.mp3' },
  { songId: 3, title: 'Space Song', artist: 'Beach House', expectedFile: 'space-song.mp3' },
  { songId: 4, title: 'After Dark', artist: 'Mr.Kitty', expectedFile: 'after-dark.mp3' },
  { songId: 5, title: 'Sweet Disposition', artist: 'The Temper Trap', expectedFile: 'sweet-disposition.mp3' },
  { songId: 6, title: 'Show Me How', artist: 'Men I Trust', expectedFile: 'show-me-how.mp3' },
  { songId: 7, title: 'Sunset Lover', artist: 'Petit Biscuit', expectedFile: 'sunset-lover.mp3' },
  { songId: 8, title: '505', artist: 'Arctic Monkeys', expectedFile: '505.mp3' },
  // Chat-shared songs (string ids from `chatSongs` in app/app.vue)
  { songId: 'chat-lany-ilysb', title: 'ILYSB', artist: 'LANY', expectedFile: 'ilysb.mp3' },
  { songId: 'chat-brent-clouded', title: 'Clouded', artist: 'Brent Faiyaz', expectedFile: 'clouded.mp3' },
  { songId: 'chat-drake-passionfruit', title: 'Passionfruit', artist: 'Drake', expectedFile: 'passionfruit.mp3' },
  { songId: 'chat-bruno-thats-what-i-like', title: "That's What I Like", artist: 'Bruno Mars', expectedFile: 'thats-what-i-like.mp3' },
  { songId: 'chat-pnd-come-and-see-me', title: 'Come and See Me', artist: 'PARTYNEXTDOOR', expectedFile: 'come-and-see-me.mp3' },
  { songId: 'chat-lany-malibu-nights', title: 'Malibu Nights', artist: 'LANY', expectedFile: 'malibu-nights.mp3' },
  { songId: 'chat-brent-all-mine', title: 'ALL MINE', artist: 'Brent Faiyaz', expectedFile: 'all-mine.mp3' },
  { songId: 'chat-pnd-recognize', title: 'Recognize', artist: 'PARTYNEXTDOOR', expectedFile: 'recognize.mp3' },
  { songId: 'chat-bruno-treasure', title: 'Treasure', artist: 'Bruno Mars', expectedFile: 'treasure.mp3' },
]

const manifestBySongId = new Map<string, SongAudioManifestEntry>(
  SONG_AUDIO_MANIFEST.map((entry) => [String(entry.songId), entry]),
)

/** Normalize an expected filename. Returns null for anything unsafe or non-mp3. */
export function normalizeMp3Filename(filename: unknown): string | null {
  if (typeof filename !== 'string') return null
  const trimmed = filename.trim()
  if (!trimmed || trimmed.length > 128) return null
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) return null
  if (!MP3_FILENAME_PATTERN.test(trimmed)) return null
  return trimmed
}

/**
 * Validate a configured local audio source and return the safe public path.
 * Accepts only same-site `/music/<file>.mp3` paths. Rejects external URLs,
 * protocol-relative URLs, traversal, nested directories, and other extensions.
 */
export function normalizeLocalMusicPath(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const value = input.trim()
  if (!value) return null
  // Reject absolute/external and protocol-relative URLs (http:, https:, //host/...).
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) || value.startsWith('//')) return null
  if (!value.startsWith(`${MUSIC_PUBLIC_PATH}/`)) return null
  let encodedName = value.slice(MUSIC_PUBLIC_PATH.length + 1)
  let decodedName: string
  try {
    decodedName = decodeURIComponent(encodedName)
  } catch {
    return null
  }
  if (decodedName.includes('/')) return null
  const filename = normalizeMp3Filename(decodedName)
  return filename ? `${MUSIC_PUBLIC_PATH}/${filename}` : null
}

export function localAudioEntryForSong(songId: number | string | null | undefined): SongAudioManifestEntry | null {
  if (songId === null || songId === undefined) return null
  return manifestBySongId.get(String(songId)) || null
}

/** Expected filename for a song id, or null when no mapping is configured. */
export function localAudioFileForSong(songId: number | string | null | undefined): string | null {
  return localAudioEntryForSong(songId)?.expectedFile || null
}

/** Expected public path (`/music/<file>.mp3`) for a song id, or null. */
export function expectedLocalAudioPath(songId: number | string | null | undefined): string | null {
  const filename = localAudioFileForSong(songId)
  return filename ? `${MUSIC_PUBLIC_PATH}/${filename}` : null
}
