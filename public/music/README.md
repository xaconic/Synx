# Local audio sources

This directory is where SYNX looks for locally hosted MP3 files. Nuxt serves
files in `public/` from the site root:

- physical file: `public/music/the-night-we-met.mp3`
- browser URL: `/music/the-night-we-met.mp3`

**Files placed here are optional.** A song without a verified local MP3 keeps
playing through its existing YouTube embed (see below). A song never reports
"playable locally" until its actual file has been verified.

## Song → filename mapping

The explicit mapping between every existing song record (in `app/app.vue`) and
its expected filename lives in **`shared/song-audio.ts`**. One entry per song:

| Song | Song id | Expected file |
| --- | --- | --- |
| The Night We Met | `1` | `the-night-we-met.mp3` |
| Genesis | `2` | `genesis.mp3` |
| Space Song | `3` | `space-song.mp3` |
| After Dark | `4` | `after-dark.mp3` |
| Sweet Disposition | `5` | `sweet-disposition.mp3` |
| Show Me How | `6` | `show-me-how.mp3` |
| Sunset Lover | `7` | `sunset-lover.mp3` |
| 505 | `8` | `505.mp3` |
| ILYSB | `chat-lany-ilysb` | `ilysb.mp3` |
| Clouded | `chat-brent-clouded` | `clouded.mp3` |
| Passionfruit | `chat-drake-passionfruit` | `passionfruit.mp3` |
| That's What I Like | `chat-bruno-thats-what-i-like` | `thats-what-i-like.mp3` |
| Come and See Me | `chat-pnd-come-and-see-me` | `come-and-see-me.mp3` |
| Malibu Nights | `chat-lany-malibu-nights` | `malibu-nights.mp3` |
| ALL MINE | `chat-brent-all-mine` | `all-mine.mp3` |
| Recognize | `chat-pnd-recognize` | `recognize.mp3` |
| Treasure | `chat-bruno-treasure` | `treasure.mp3` |

(Older notes in this repo suggested `ilybs.mp3` for ILYSB — that was a typo.
The correct expected filename is `ilysb.mp3`.)

## How to add your authorized MP3s

1. Copy your legally obtained file into this directory using the exact
   filename from the table above (lowercase `.mp3`).
2. Restart the dev server (or rebuild). The startup audit logs each song's
   status, and `GET /api/music/report` returns the full report.
3. In the app, the song card chip changes from **NO LOCAL FILE** to
   **♪ LOCAL MP3**, and playback switches to the shared HTML audio player
   automatically (local file first, YouTube embed as fallback).

No other configuration is needed: `audioUrl` values on the song records are
derived from `shared/song-audio.ts`. To map a *new* song id, add one manifest
entry there.

## Validation rules (server/middleware/music-files.ts)

Only plain `/music/<name>.mp3` requests are allowed under `/music/`:

- external URLs, protocol-relative URLs, path traversal, nested directories,
  and unexpected extensions are rejected (404),
- the file must exist, be non-empty, and actually contain MP3 audio — an
  `ID3` tag or an MPEG frame-sync signature is checked in the file header; a
  `.mp3` extension alone is not trusted. Files that fail this check return
  415 and are never served,
- verified files are served by Nuxt's static handler as `audio/mpeg` with
  range-request support (seeking works),
- error responses are generic JSON and never expose filesystem paths,
- requests outside `/music/` (other public assets, HTML routes) are untouched.

## Diagnostic report

- `GET /api/music/report` — per-song status (`available` / `missing` /
  `invalid`), expected filename, public path, byte size, and reason. Also
  lists MP3s in this directory that no song maps to.
- In dev mode the server prints the same audit at startup, and the player's
  extra controls include a **RECHECK LOCAL AUDIO** button.

Song cards, library rows, and chat-shared tracks show a status chip:
**♪ LOCAL MP3** (verified), **NO LOCAL FILE** (add it here), or
**BAD LOCAL FILE** (replace it with real MP3 audio).

## YouTube embedded playback (fallback)

When a song has no verified local MP3, playback falls back to the song's
official YouTube IFrame embed. All 17 catalog and chat songs are prefilled
with verified, embeddable video IDs (checked against YouTube's oEmbed endpoint
on 2026-10-23). Every ID points to an official upload: the artist's own
channel, a VEVO channel, or YouTube's label-provided "- Topic" full-song audio
channel.

| Song | Video ID | Source channel |
| --- | --- | --- |
| The Night We Met | `KtlgYxa6BMU` | Lord Huron (Official Audio) |
| Genesis | `1FH-q0I1fJY` | Grimes |
| Space Song | `m_npTC0Rvgg` | Beach House - Topic |
| After Dark | `sVx1mJDeUjY` | Mr.Kitty Official |
| Sweet Disposition | `vN7HQrgakZU` | The Temper Trap (Official Video) |
| Show Me How | `cpU7Yrl-AwM` | Men I Trust (garage session, full track) |
| Sunset Lover | `4fQeaM62mOY` | Petit Biscuit (Music Video) |
| 505 | `KfEEm4Zx-EU` | Arctic Monkeys - Topic (studio version) |
| ILYSB | `SSTp0rknOgA` | LANYVEVO (Official Video) |
| Clouded | `FFu_lJ3EvAA` | Brent Faiyaz (Official Audio) |
| Passionfruit | `LDN_CuuUl2I` | Drake - Topic |
| That's What I Like | `PMivT7MJ41M` | Bruno Mars (Official Music Video) |
| Come and See Me | `Ockhq8E2FrA` | PARTYNEXTDOOR (Official Music Video) |
| Malibu Nights | `KdcPzDNHX74` | LANY (Official Audio) |
| ALL MINE | `CHtfJ-UZJM4` | Brent Faiyaz (Official Video) |
| Recognize | `WsPfSXJaelk` | PARTYNEXTDOOR (Official Music Video) |
| Treasure | `nPvuNsRccVw` | Bruno Mars (Official Music Video) |

If YouTube later rejects a video (private, region-restricted, removed, or
embedding disabled), the song card shows a **⚠ VIDEO NEEDED** chip and the
player shows the error with a **SET VIDEO ID** button.

### Changing or adding a video ID

- Per browser: select the song, open the shared player's **VIDEO ID** control,
  and enter only the 11-character ID (not a watch-page URL). It is saved in
  this browser's `synx-youtube-video-ids` local-storage entry; existing
  accounts, chats, saved songs, and archives are unchanged.
- For all visitors: set `youtubeVideoId: 'YOUR_VERIFIED_ID'` on that song's
  existing record in `app/app.vue`.

Saving an ID does not prove the video is playable. Try Play to let the
embedded player check it. Do not enter a YouTube watch-page URL or an
unverified/random ID. Embeds play with the standard YouTube player UI
(branding and controls stay visible, as YouTube requires).

## Library, queue, and chat notes

- Use the Library view to open an archive and add/remove catalog songs. Its
  `trackIds` membership is stored in the existing `synx-state` local-storage
  record; archive counts come from those actual memberships.
- The shared player queue offers shuffle, repeat, play/remove upcoming tracks,
  and add-to-queue actions. Queued songs play through the same shared player
  (local MP3 or YouTube embed), never competing audio elements.
