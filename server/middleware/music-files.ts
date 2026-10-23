import type { H3Event } from 'h3'
import { normalizeMp3Filename } from '#shared/song-audio'
import { resolveMusicFilePath, validateMusicFile } from '../utils/music-files'

/**
 * Guards requests under /music/ so that:
 *  - only plain `/music/<name>.mp3` files are served (no traversal, no nested
 *    paths, no unexpected extensions),
 *  - the file exists, is non-empty, and really contains MP3 audio before any
 *    bytes are served (verified once per file version, then cached),
 *  - valid requests fall through to Nuxt's static file serving (which handles
 *    ranges/seek) with the correct audio/mpeg content type,
 *  - missing or invalid files return a generic JSON error with no filesystem
 *    details.
 *
 * Requests outside /music/ are never touched, so other public assets and
 * HTML routes keep working exactly as before.
 */
export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname
  if (!pathname.startsWith('/music/')) return

  let encodedName: string
  try {
    encodedName = decodeURIComponent(pathname.slice('/music/'.length))
  } catch {
    return musicNotFound(event, pathname)
  }

  const filename = normalizeMp3Filename(encodedName)
  if (!filename || filename !== encodedName.trim()) return musicNotFound(event, pathname)

  const filePath = resolveMusicFilePath(filename)
  if (!filePath) return musicNotFound(event, pathname)

  const validation = validateMusicFile(filename)
  if (validation.status === 'missing') return musicNotFound(event, pathname)
  if (validation.status === 'invalid') {
    setResponseStatus(event, 415)
    setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
    return { statusCode: 415, error: 'Unsupported audio file', path: pathname }
  }

  // Verified MP3: let Nitro's static handler stream the real bytes (with range
  // support for seeking) but pin the correct audio content type.
  setResponseHeader(event, 'Content-Type', 'audio/mpeg')
})

function musicNotFound(event: H3Event, pathname: string) {
  setResponseStatus(event, 404)
  setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  return { statusCode: 404, error: 'Audio file not found', path: pathname }
}
