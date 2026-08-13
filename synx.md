Synx — Music & Social Listening Platform

Overview

Synx is a frontend-only social music application that helps users discover music based on personality, interests, and mood. Users build personal libraries, discover matches from natural-language descriptions, and listen socially with friends.

Vision

Connect people through music discovery and shared listening experiences driven by expressive, human descriptions rather than keyword search.

Target users

- Music fans who want personalized discovery
- Small friend groups who want to listen together
- Creators who curate and share themed libraries

Core goals

- Provide meaningful music recommendations from user descriptions
- Let users create, organize, and share multiple libraries/playlists
- Enable synchronous group listening and lightweight social features
- Keep the app fully frontend so it runs from a static deploy

Key features (grouped)

- Discovery
	- Describe yourself (mood, hobbies, artists) → recommendations
	- Personalized home feed and recent plays

- Libraries & Sharing
	- Multiple libraries (Study, Workout, Relax, Party)
	- Create / edit / reorder / delete songs
	- Public libraries, follow, like collections

- Social & Real-time
	- One-on-one Duo Mode: shared library editing
	- Group listening rooms with host controls
	- Chat to share and discuss tracks

- Player & UX
	- Music player with play/pause, shuffle, repeat
	- Recently played, saved songs, notifications
	- Responsive UI for mobile and laptop

- Persistence & Limits
	- localStorage for user state and saved libraries
	- No backend, no real authentication, no payment processing

Screens (minimum 5)

- `Login` — entry, fake/login state management
- `Home` — personalized recommendations and recent plays
- `Discover` — describe yourself and view generated results
- `Libraries` — manage personal playlists and collections
- `Profile` — view public libraries and user info
- `Chat` — message other users and share links
- `Group Listening` — listening room controls and queue
- `Duo Mode` — shared library editor between two users
- `Player` — compact player and now-playing view

Data model (high level)

- `User` (id, displayName, username, avatar, libraries[])
- `Library` (id, title, ownerId, tracks[], isPublic)
- `Track` (id, title, artist, sourceUrl, thumbnail)
- `Room` (id, hostId, queue[], participants[])

Technology & constraints

- Frontend framework: Nuxt (SPA / static export)
- Language: JavaScript
- Styling: CSS + Tailwind CSS
- Persistence: localStorage + JS data files
- Repo & tooling: GitHub, VS Code, npm build/dev tooling
- AI tools: ChatGPT / OpenCode / others for ideation and prompts

Project constraints

- Frontend-only: no server-side code, no databases, no external writeable APIs
- If using Nuxt/Next, export as static/SPA (`npm run generate` / `next export`)

Roadmap & milestones

1. Pitch (due Aug 8): define screens, features, stack, and repo setup
2. Data model & static screens: wireframes + seed data
3. Core features: discovery flow, libraries, player
4. Social features: chat, follow, duo mode, group listening
5. Persistence & polish: localStorage, validation, transitions
6. Final demo: feature freeze, prepare deployment artifacts

Development & collaboration rules

- Each team member must commit with their own GitHub account
- Split code by feature files/components to reduce merge conflicts
- Pull before pushing and write clear commit messages
- Use AI for assistance but only ship code you can explain

Checklist (for pitch day)

- Four members confirmed and GitHub usernames recorded
- Repository created and three collaborators invited
- Four commits from four different accounts in README
- Presentation covering: team, one-sentence app, screens, features, stack, scope justification, look & feel, ownership

Next steps

If you want, I can extract this into a one-page `README_PROJECT.md`, a machine-readable requirements checklist, or break the roadmap into GitHub issues.