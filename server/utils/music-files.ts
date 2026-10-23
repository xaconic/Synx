import { existsSync, openSync, readSync, closeSync, readdirSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { normalizeMp3Filename, SONG_AUDIO_MANIFEST } from '#shared/song-audio'

export type MusicFileStatus = 'available' | 'missing' | 'invalid'

export interface MusicFileValidation {
  status: MusicFileStatus
  reason: string
  sizeBytes: number
}

export interface SongAudioReportEntry {
  songId: number | string
  title: string
  artist: string
  expectedFile: string
  publicPath: string
  status: MusicFileStatus
  reason: string
  sizeBytes: number
}

export interface MusicReport {
  generatedAt: string
  summary: {
    total: number
    available: number
    missing: number
    invalid: number
  }
  songs: SongAudioReportEntry[]
  /** MP3 files present under public/music that no song record maps to. */
  unmappedFiles: string[]
}

/** Cache keyed by filename; invalidated when size or mtime changes. */
const validationCache = new Map<string, { mtimeMs: number; size: number; result: MusicFileValidation }>()

/** Project-relative location where the user places authorized MP3s (never an absolute path). */
export const MUSIC_DIR_LABEL = 'public/music'

export function musicDirectory(): string {
  return resolve(process.cwd(), 'public', 'music')
}

/**
 * Resolve an expected filename to a filesystem path confined to public/music.
 * Returns null for unsafe names or traversal attempts. Never trusts input paths.
 */
export function resolveMusicFilePath(filename: unknown): string | null {
  const normalized = normalizeMp3Filename(filename)
  if (!normalized) return null
  const directory = musicDirectory()
  const resolved = resolve(directory, normalized)
  if (!resolved.startsWith(`${directory}${sep}`)) return null
  return resolved
}

/**
 * Detect whether raw bytes look like real MP3 audio: an ID3v2 tag ("ID3") or an
 * MPEG frame sync (0xFF, 0xE0-masked). A `.mp3` extension alone is not trusted.
 */
export function looksLikeMp3(head: Buffer): boolean {
  if (head.length >= 3 && head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) return true // "ID3"
  const limit = Math.max(0, head.length - 1)
  for (let index = 0; index < limit; index += 1) {
    if (head[index] === 0xff && (head[index + 1] & 0xe0) === 0xe0) return true // MPEG frame sync
  }
  return false
}

function readHead(path: string, bytes = 16384): Buffer | null {
  let fd: number | null = null
  try {
    fd = openSync(path, 'r')
    const buffer = Buffer.alloc(bytes)
    const read = readSync(fd, buffer, 0, bytes, 0)
    return buffer.subarray(0, read)
  } catch {
    return null
  } finally {
    if (fd !== null) {
      try { closeSync(fd) } catch { /* ignore */ }
    }
  }
}

/**
 * Verify that an expected music file exists under public/music, is non-empty,
 * and actually contains MP3 audio. Results are cached per file version.
 */
export function validateMusicFile(filename: unknown): MusicFileValidation {
  const normalized = normalizeMp3Filename(filename)
  if (!normalized) {
    return { status: 'invalid', reason: 'Filename is not an allowed /music/*.mp3 name.', sizeBytes: 0 }
  }

  const path = resolveMusicFilePath(normalized)
  if (!path) {
    return { status: 'invalid', reason: 'Requested path escapes the music directory.', sizeBytes: 0 }
  }

  if (!existsSync(path)) {
    return { status: 'missing', reason: `Expected file ${MUSIC_DIR_LABEL}/${normalized} is not present.`, sizeBytes: 0 }
  }

  let stats
  try {
    stats = statSync(path)
  } catch {
    return { status: 'missing', reason: `Expected file ${MUSIC_DIR_LABEL}/${normalized} is not present.`, sizeBytes: 0 }
  }

  if (!stats.isFile()) {
    return { status: 'invalid', reason: `${MUSIC_DIR_LABEL}/${normalized} is not a regular file.`, sizeBytes: 0 }
  }

  if (stats.size === 0) {
    return { status: 'invalid', reason: `${MUSIC_DIR_LABEL}/${normalized} exists but is empty (0 bytes).`, sizeBytes: 0 }
  }

  const cached = validationCache.get(normalized)
  if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) return cached.result

  const head = readHead(path)
  if (!head || head.length < 2) {
    return { status: 'invalid', reason: `${MUSIC_DIR_LABEL}/${normalized} could not be read for audio validation.`, sizeBytes: stats.size }
  }

  const result: MusicFileValidation = looksLikeMp3(head)
    ? { status: 'available', reason: 'Verified MP3 (ID3 tag or MPEG frame signature found).', sizeBytes: stats.size }
    : { status: 'invalid', reason: `${MUSIC_DIR_LABEL}/${normalized} is not valid MP3 audio (no ID3 tag or MPEG frame sync in its header).`, sizeBytes: stats.size }

  validationCache.set(normalized, { mtimeMs: stats.mtimeMs, size: stats.size, result })
  return result
}

/** MP3 filenames currently present in public/music (unsorted). */
export function listMusicDirectoryFiles(): string[] {
  try {
    return readdirSync(musicDirectory()).filter((name) => name.toLowerCase().endsWith('.mp3'))
  } catch {
    return []
  }
}

/**
 * Build the full per-song audio report from the shared manifest. Only public
 * URLs are exposed — never absolute filesystem paths.
 */
export function buildMusicReport(): MusicReport {
  const songs: SongAudioReportEntry[] = SONG_AUDIO_MANIFEST.map((entry) => {
    const validation = validateMusicFile(entry.expectedFile)
    return {
      songId: entry.songId,
      title: entry.title,
      artist: entry.artist,
      expectedFile: entry.expectedFile,
      publicPath: `/music/${entry.expectedFile}`,
      status: validation.status,
      reason: validation.reason,
      sizeBytes: validation.sizeBytes,
    }
  })

  const mappedFiles = new Set(SONG_AUDIO_MANIFEST.map((entry) => entry.expectedFile.toLowerCase()))
  const unmappedFiles = listMusicDirectoryFiles()
    .filter((name) => !mappedFiles.has(name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b))

  const summary = {
    total: songs.length,
    available: songs.filter((song) => song.status === 'available').length,
    missing: songs.filter((song) => song.status === 'missing').length,
    invalid: songs.filter((song) => song.status === 'invalid').length,
  }

  return { generatedAt: new Date().toISOString(), summary, songs, unmappedFiles }
}
