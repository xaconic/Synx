type SpotifyTrack = {
    id: string
    name: string
    artists: Array<{ name: string }>
    album: {
        name: string
        release_date: string
        images: Array<{ url: string }>
    }
    duration_ms: number
}

let cachedAccessToken = ''
let tokenExpiresAt = 0

export default defineEventHandler(async (event) => {
    const query = getQuery(event).q
    const searchTerm = typeof query === 'string' ? query.trim() : ''

    if (!searchTerm) {
        throw createError({ statusCode: 400, statusMessage: 'Enter a song or artist to search.' })
    }

    if (searchTerm.length > 120) {
        throw createError({ statusCode: 400, statusMessage: 'Search must be 120 characters or fewer.' })
    }

    const config = useRuntimeConfig(event)
    if (!config.spotifyClientId || !config.spotifyClientSecret) {
        throw createError({
            statusCode: 503,
            statusMessage: 'Spotify search needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in the server environment.',
        })
    }

    try {
        if (!cachedAccessToken || Date.now() >= tokenExpiresAt) {
            const credentials = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString('base64')
            const token = await $fetch<{ access_token: string; expires_in: number }>('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
            })

            cachedAccessToken = token.access_token
            tokenExpiresAt = Date.now() + Math.max(token.expires_in - 60, 60) * 1000
        }

        const params = new URLSearchParams({ q: searchTerm, type: 'track', limit: '50', market: 'US' })
        const result = await $fetch<{ tracks: { items: SpotifyTrack[] } }>(`https://api.spotify.com/v1/search?${params}`, {
            headers: { Authorization: `Bearer ${cachedAccessToken}` },
        })

        return {
            tracks: result.tracks.items.map((track) => ({
                id: track.id,
                title: track.name,
                artist: track.artists.map((artist) => artist.name).join(', '),
                album: track.album.name,
                artwork: track.album.images[0]?.url || '',
                releaseYear: track.album.release_date?.slice(0, 4) || '',
                duration: `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}`,
            })),
        }
    } catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) throw error
        throw createError({ statusCode: 502, statusMessage: 'Could not retrieve tracks from Spotify. Try again shortly.' })
    }
})
