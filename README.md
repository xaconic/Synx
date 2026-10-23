# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

<<<<<<< HEAD
=======
## Group Listening Room prototype

The listening room uses Nuxt server endpoints and in-memory state to demonstrate room creation and joining, queue and chat updates, presence polling, playback controls, and host/moderator actions. Room changes are shared between browsers connected to the same running server and are polled every few seconds. Rooms and their state are lost when the server restarts.

Playback controls synchronize simulated track and timeline state only; the app does not stream or synchronize audio. Spotify credentials enable catalog search, not playback. The browser-generated demo listener ID is not authentication, so room roles and permissions are for prototyping and are not safe for production.

Visitors can enter as guests to explore, join rooms, and chat. Creating rooms, host/moderator tools, saving music, and sharing a persistent profile prompt for a demo account. The demo account registry is stored in browser local storage; it is not a secure authentication system.

For production multiplayer, connect persistent storage, authenticated identities, and a realtime transport, then integrate an audio provider with playback synchronization support.

>>>>>>> 6f1a87c94fc18e050bde7a9d48453537672428c6
Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
