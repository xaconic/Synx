import { buildMusicReport } from '../../utils/music-files'

/**
 * GET /api/music/report
 *
 * Development/diagnostic report: per-song local-audio status derived from the
 * shared song manifest plus real filesystem verification (existence, non-empty
 * size, MP3 signature). Only public URLs are exposed — never absolute
 * filesystem paths.
 */
export default defineEventHandler((event) => {
  const report = buildMusicReport()
  setResponseHeader(event, 'cache-control', 'no-store')
  return report
})
