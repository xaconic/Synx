import { buildMusicReport } from '../utils/music-files'

/**
 * Dev-only startup audit: prints a local-audio table so it is obvious which
 * songs have a verified MP3 under public/music and which still need a file
 * added manually. Runs once when the Nitro server starts.
 */
export default defineNitroPlugin(() => {
  if (!import.meta.dev) return

  try {
    const report = buildMusicReport()
    const { summary } = report

    console.info('[Synx music] Local audio audit')
    console.info(
      `[Synx music] ${summary.available}/${summary.total} songs have a verified MP3 · ${summary.missing} missing · ${summary.invalid} invalid`,
    )

    for (const song of report.songs) {
      const line = song.status === 'available'
        ? `  ✓ ${song.title} — ${song.publicPath} (${song.sizeBytes} bytes)`
        : song.status === 'missing'
          ? `  ✗ ${song.title} — add authorized file to public/music/${song.expectedFile}`
          : `  ! ${song.title} — public/music/${song.expectedFile}: ${song.reason}`
      console.info(line)
    }

    for (const file of report.unmappedFiles) {
      console.info(`  ? public/music/${file} exists but is not mapped to any song id`)
    }

    if (!summary.available) {
      console.info('[Synx music] No local MP3s found. Songs keep playing through their YouTube embeds; drop authorized files into public/music/ and restart to verify them.')
    }
  } catch (error) {
    console.warn('[Synx music] Local audio audit failed:', error instanceof Error ? error.message : error)
  }
})
