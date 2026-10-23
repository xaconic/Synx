// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  }
})
