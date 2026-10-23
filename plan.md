Semester Project
# Semester Project

## Overview

Teams of four build a single frontend application over the semester. Work is kept in one shared GitHub repository; AI tools are allowed but you must be able to explain any code you submit.

**First deliverable:** a pitch presentation due Saturday, August 8.

## Requirements (quick reference)

- **Team size:** exactly four members.
- **GitHub:** every member must have a GitHub account and be a collaborator on the repo.
- **Repository:** one repo per team; all four members added as collaborators.
- **Contributions:** every member must have their own commits under their GitHub account.
- **Scope:** project must be semester-sized (see "Size criteria").
- **Stack:** frontend only (HTML/CSS/JS or a JS framework). No backend, databases, or server routes.
- **AI use:** allowed, but submit only code you can explain.

## Team Setup (before the pitch)

1. All four members create GitHub accounts (use an email you'll still have in December).
2. Record each member's GitHub username for the pitch slide.
3. One member creates the repository and adds the other three as collaborators.
4. Each collaborator accepts the invitation.
5. Each member clones the repo and makes one independent commit (add your name to README.md). This proves push access.

Example commands:

```bash
git clone https://github.com/USERNAME/REPO-NAME.git
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git pull
```

## Size criteria — What counts as "big enough"

Your project must take the semester even with AI help. Minimum expectations:

- At least **five distinct screens or views** (not five sections of one page).
- At least **three stateful features** (e.g., cart, score, saved list, filters).
- **Data-driven rendering** (content comes from JS data structures, not static HTML).
- **Responsive design** (works on phone and laptop).
- **Polish:** empty states, validation, confirmations, loading states, transitions, consistent visual design.

If an AI could implement your whole app from a single prompt in one evening, it's too small. Add depth and more screens/features.

## Frontend-only rules (allowed / not allowed)

Allowed:

- HTML, CSS, vanilla JS
- JavaScript frameworks (React, Vue, Nuxt, Next, Svelte, etc.) — declare at pitch
- npm packages, build steps, dev servers
- localStorage for persistence
- Hardcoded JSON/JS data files
- Google Fonts, icon libraries, CSS frameworks

Not allowed:

- Backend servers, server routes, API routes
- Real databases (MySQL, PostgreSQL, MongoDB, Firebase)
- Payment processing or real user accounts with passwords
- Any language that isn't JavaScript or TypeScript

## Choosing a stack

- Vanilla JS is the default and fully acceptable.
- If you pick a framework, someone on the team must already know it and teach others.
- If using Nuxt/Next: must be static or SPA only (no SSR with live data, no server routes). The build should produce a deployable folder (e.g., `npm run generate` or `next export`).
- Add `node_modules/` to `.gitignore` before the first push.
- Ensure the app runs from a clean clone: include `npm install` and the single start/build command in `README.md`.

## Pitch presentation (due Sat, Aug 8)

Length: 5–8 minutes per team. All four members speak.

Must cover:

- **Team:** four names and GitHub usernames (one slide).
- **One-sentence app description:** "A _____ for _____ that lets them _____." Fill this in.
- **Who it's for:** specific target user and what problem it solves.
- **Screens:** list every screen/view (minimum five) and one line describing what a user does on each.
- **Features:** split into must-haves and later additions (4–6 must-haves recommended).
- **Stack:** declare vanilla or the chosen framework and who knows it.
- **Why semester-sized:** explain which parts require polish, depth, or are uncertain.
- **Look & feel:** references, wireframes, palette, or sketches.
- **Who does what:** ownership by feature, not by role label.
- **Repository evidence:** show repo, collaborators, and four commits from four accounts.

Pitch grading (100 points):

- Clarity of idea: 20
- Scope & justification: 20
- Screens & features specificity: 20
- Repository set up & contributions: 20
- All four present & answer: 10
- Look & feel: 10

Teams missing commits from all four accounts lose points immediately.

## Contribution workflow & requirements

- Commit under your own account (configure `git` with your GitHub email).
- Pull before you push (`git pull` → work → commit → push).
- Split work by files/components to reduce conflicts; give owners for areas (cart.js, menu.js, etc.).
- Everyone must write and commit JavaScript — slides-only contributors do not pass.

## Using AI

- AI tools are encouraged but you must understand and be able to explain submitted code.
- Best practices:
	- Ask for a plan before requesting code.
	- Build one feature per prompt.
	- Review diffs before committing.
	- Write your own commit messages.

## After the pitch

Once pitch is approved, work continues through checkpoints: data model & static screens → core features → localStorage saving → polish & edge cases → feature freeze → final demo.

## Checklist (for pitch day)

- Four members confirmed
- Four GitHub accounts created
- One repository created and shared
- Three collaborator invitations accepted
- Four commits from four different accounts
- Presentation covering required points
- All four members ready to speak

---

If you'd like, I can further split the "Requirements" section into a machine-readable checklist or create a `README_REQUIREMENTS.md` extracted from this file.

---

## Synx Project Plan

Purpose: convert the Synx concept into a timeboxed plan with milestones, owners, deliverables, and acceptance criteria so the team can execute and track progress.

1) Objectives

- Deliver a frontend-only social music app supporting discovery from natural-language descriptions, multiple libraries, and synchronous group listening.
- Demonstrate each team member's contribution through commits and code ownership.

## Music App Features (user-provided)

The following features are the product requirements; they map directly to milestones and sprint tasks below.

1. Login & Home Feed
	- Users log in (demo/fake auth) and see a personalized home feed with recommendations.

2. Describe Yourself Instead of Searching
	- Users enter a short free-text description (hobbies, favorite artists, mood).
	- Client-side recommendation engine maps descriptions to candidate tracks/libraries.

3. Multiple Music Libraries
	- Create multiple libraries/playlists for different contexts (Study, Workout, Relax, Party).
	- Manage ordering, add/remove tracks, export/import JSON.

4. Profile Page
	- Each user has a profile showing their public libraries; other users can view and like collections.

5. Chat Feature
	- In-app chat for users to discuss music and share recommendations; messages persisted locally.

6. Group Listening
	- Listening rooms with host-controlled playback; participants follow host actions (simulated sync).

7. Shared Library (Duo Mode)
	- Two users manage a shared library collaboratively with optimistic local sync and merge rules.

8. Offline Listening
	- Allow users to download/cached tracks or playlists for offline playback using the Cache API / Service Worker.
	- Implement as an optional feature during the polish phase; no server-side storage required.

2) High-level milestones (phases)

- Phase 0 — Repo & Pitch (week 0)
	- Tasks: repo creation, collaborators invited, README with team, pitch slides
	- Deliverable: repo with 4 commits, pitch slides
	- Owner: Team (assign individuals)

- Phase 1 — Data model & static screens (weeks 1–2)
	- Tasks: define data structures, create seed JSON, implement static routes/pages and wireframes
	- Deliverable: static app skeleton with placeholder data
	- Acceptance: 5+ screens render from JS data

- Phase 2 — Core features (weeks 3–6)
	- Tasks: discovery flow (describe → recommendations), libraries CRUD, music player, recently played
	- Deliverable: working discovery flow, libraries, and player
	- Acceptance: discovery yields results, libraries persist to localStorage, player can play mock tracks

- Phase 3 — Social features (weeks 7–9)
	- Tasks: follow/like, basic chat, Duo Mode (shared library), Group Listening room (host controls)
	- Deliverable: chat + shared editing + room playback coordination
	- Acceptance: two users can edit a shared library (Duo) and join a room that syncs a queue (simulated without backend)

- Phase 4 — Persistence, polish & edge cases (weeks 10–11)
	- Tasks: input validation, empty states, loading states, transitions, accessibility checks, responsive fixes
	- Deliverable: polished UI and documented edge-case behavior
	- Acceptance: passes checklist for polish items and responsive checks

- Phase 5 — Final demo & handoff (week 12)
	- Tasks: feature freeze, demo script, prepare static export, final README and deployment artifacts
	- Deliverable: deployable static site and final demo
	- Acceptance: app runs from clean clone with documented commands

3) Owners & roles (templates — replace placeholders with actual names)

- `@member1` — Discovery & recommendation engine
- `@member2` — Libraries, player, persistence
- `@member3` — Social features: chat, follows, Duo
- `@member4` — UI, responsive design, accessibility, QA

4) Sprint tasks (example for Phase 2, week 3)

- Day 1: Implement `Describe Yourself` form and parsing logic
- Day 2: Wire recommendations UI, connect to seed data
- Day 3: Add library `create` and `add track` flows
- Day 4: Implement player controls and recently played
- Day 5: Integration testing & commit changes

5) Acceptance criteria (team-wide)

- App runs locally after `npm install` and the documented start command
- At least five distinct screens implemented and navigable
- Three or more stateful features persist to localStorage
- Each team member has contributed code (verified by GitHub commits)

6) Risks & mitigation

- Risk: Over-reliance on AI-generated framework code → Mitigation: require one team member to explain each committed file and prefer smaller, reviewed prompts.
- Risk: Merge conflicts with four contributors → Mitigation: split by files/components and pull frequently; assign ownership.
- Risk: Time pressure near the end → Mitigation: define MVP clearly and schedule integration early

7) Backlog (non-blocking / nice-to-have)

- Search & filter across libraries
- Export/Import library JSON
- Theming & user-customizable palettes
- Animations and micro-interactions

8) Repo setup & developer commands (add to README)

```bash
git clone https://github.com/ORG/REPO.git
npm install
npm run dev    # or `npm run start` as documented
npm run build && npm run generate   # static export for deployment (Nuxt)
```

9) Project tracking suggestions

- Create GitHub issues for each Phase milestone and tag with owner
- Use PR templates that require a brief explanation of the change and which teammate reviewed the AI output
- Keep a short `PROJECT_STATUS.md` with weekly bullets (what's done, blockers, next week)

---

If you want, I can now:
- generate `README_PROJECT.md` from this plan,
- open a GitHub-issue-style task list and write it to `tasks.md`, or
- split Phase 2 into detailed GitHub issues (one per day).

Marking the plan write step complete.

---

## Detailed Step-by-Step Plan (12-week semester)

This section expands the high-level milestones into a week-by-week and day-by-day execution plan. Assign owners from the template in section 3 and update the `OWNERS` column in your issue tracker.

Week 0 — Repo & Pitch (Day 0–7)

- Goal: Create the repo, confirm four contributors, and deliver the pitch.
- Deliverables: GitHub repo with `README.md`, collaborators added, four separate commits, pitch slides.
- Acceptance: Repo shows 4 distinct commits from 4 accounts; slides ready and rehearsed.

Day-by-day:
- Day 0: Create repo, add `README.md`, add `.gitignore` with `node_modules/`.
- Day 1: Invite three collaborators; each teammate accepts.
- Day 2: Each member clones and makes one commit adding their name to `README.md`.
- Day 3: Draft pitch slides (team, one-sentence app, screens, features, stack, scope justification, look & feel, ownership).
- Day 4: Finalize and rehearse pitch; record who speaks which slide.
- Day 5: Submit and confirm pitch materials.

Week 1 — Data model & static screens (Day 8–14)

- Goal: Define data model, seed data, and the static UI skeleton for navigation and wireframes.
- Deliverables: Seed JSON files, page routes, placeholder components, basic layout and Tailwind setup.
- Acceptance: 5+ screens navigate and render from JS data.

Day-by-day:
- Day 1: Create `data/seed.js` or `seed.json` with sample `users`, `libraries`, `tracks`, `rooms`.
- Day 2: Scaffold routes/pages: `Login`, `Home`, `Discover`, `Libraries`, `Profile`, `Chat`, `Room`, `Duo`, `Player`.
- Day 3: Implement global layout, header/nav, and responsive breakpoints.
- Day 4: Wire each page to render data from seed file.
- Day 5: Accessibility smoke-check, commit, create PR for review.

Week 2 — Component library & player baseline (Day 15–21)

- Goal: Build core UI components and a mock player component to test UI flow.
- Deliverables: `TrackCard`, `LibraryEditor`, `Player` UI, `DescribeForm` placeholder.
- Acceptance: Player UI shows play/pause states with mock audio URL and `TrackCard` used across screens.

Day-by-day:
- Day 1: Implement `TrackCard` component (title, artist, thumbnail, actions).
- Day 2: Implement `LibraryEditor` (list, reorder placeholder, add/remove UI).
- Day 3: Implement `Player` component with play/pause, next, previous (use `Audio` API with sample URLs).
- Day 4: Implement `DescribeForm` UI capturing free-text input.
- Day 5: Integration test: create a library then play a track from it; commit and PR.

Week 3 — Describe → Recommendation flow (Day 22–28)

- Goal: Implement parsing and mapping from free-text descriptions to recommendation lists using seeded mapping rules and small prompt heuristics (no external API calls required).
- Deliverables: Recommendation engine module (client-side), UI for results, basic ranking.
- Acceptance: Entering a description produces 10 candidate tracks based on keyword mapping.

Day-by-day:
- Day 1: Define a lightweight rule-set for mapping description tokens to tags/genres.
- Day 2: Implement `recommendationEngine.js` that matches description to seed tracks by tags/artist similarity.
- Day 3: Connect `DescribeForm` to engine and render paginated results.
- Day 4: Add sorting and simple relevance scoring; edge-case handling for empty input.
- Day 5: Commit, test with multiple descriptions; PR and review.

Week 4 — Libraries CRUD & persistence (Day 29–35)

- Goal: Implement full create/read/update/delete flows for libraries with localStorage persistence.
- Deliverables: Library creation modal, add/remove tracks, reorder with drag-drop, save to localStorage.
- Acceptance: Libraries persist across reloads and can be exported to JSON via a button.

Day-by-day:
- Day 1: Implement `createLibrary` and `deleteLibrary` flows with confirmation.
- Day 2: Add `addTrack` and `removeTrack` flows and local UI updates.
- Day 3: Integrate `drag-and-drop` reorder (use native Drag API or lightweight helper).
- Day 4: Persist `libraries` to `localStorage` and implement `export as JSON`.
- Day 5: Tests for persistence, commit and PR.

Week 5 — Player integration & recently played (Day 36–42)

- Goal: Hook player to libraries and maintain recently played list.
- Deliverables: Play queue API, persist recently played, UI for mini-player and expanded player.
- Acceptance: Playing a track updates recently played and persists to localStorage.

Day-by-day:
- Day 1: Implement play queue state and `playTrack(trackId)` method.
- Day 2: Emit and handle events for `trackStarted`, `trackEnded` to advance queue.
- Day 3: Implement `recentlyPlayed` storage and UI display.
- Day 4: Add shuffle/repeat toggles and reflect in queue behavior.
- Day 5: Integration tests; PR.

Week 6 — User profiles & public libraries (Day 43–49)

- Goal: Implement `Profile` page, public library visibility, follow & like basics (local simulation).
- Deliverables: Follow/unfollow actions, like/unlike libraries, public library browsing.
- Acceptance: Following a user shows their public libraries in a followed feed and likes persist.

Day-by-day:
- Day 1: Create `Profile` page rendering user info and public libraries.
- Day 2: Implement `followUser` and `likeLibrary` actions stored in localStorage.
- Day 3: Add followed feed to `Home` and filter options.
- Day 4: Tests and UI polishing.
- Day 5: Commit and PR.

Week 7 — Duo Mode (shared library) (Day 50–56)

- Goal: Implement two-user shared editing with optimistic local merging and a simple sync model (no backend).
- Deliverables: Duo room creation, shared library state, change merging guide.
- Acceptance: Two browser sessions (same seed user or different) see shared changes when both have the Duo room open (simulated via local events or polling storage).

Day-by-day:
- Day 1: Design shared state model and conflict resolution rules (last-writer-wins, operation log).
- Day 2: Implement Duo room UI for inviting another user (copyable room id/token stored locally).
- Day 3: Implement changes syncing using `localStorage` events and fallback polling every X seconds.
- Day 4: Test conflict scenarios and refine merge rules.
- Day 5: Commit, PR and document usage in README.

Week 8 — Chat and notifications (Day 57–63)

- Goal: Build in-app chat (local simulated) and notifications for follows, likes, and room invites.
- Deliverables: Chat UI, message history stored locally, notification center.
- Acceptance: Messages persist locally and notifications appear and clear.

Day-by-day:
- Day 1: Implement chat UI and store messages in local data for a room or DM.
- Day 2: Implement notification queue and toast system.
- Day 3: Connect chat events to notifications (new message, invite received).
- Day 4: Add message search and basic moderation placeholder (delete message).
- Day 5: Tests, PR, and documentation.

Week 9 — Group Listening (room host controls) (Day 64–70)

- Goal: Create listening rooms where one user (host) controls playback and others follow (simulated sync).
- Deliverables: Room queue, host controls (play/pause/skip), participant join/leave.
- Acceptance: Non-host clients reflect host actions within a 1–2 second lag (using local sync strategy).

Day-by-day:
- Day 1: Implement room lifecycle (create, join, leave, destroy).
- Day 2: Implement host control API and broadcast changes via `localStorage` events.
- Day 3: Implement participant sync and basic UI for who is host.
- Day 4: Test with multiple browser windows; handle desync and recovery.
- Day 5: Commit and PR; write how-to for demo.

Week 10 — Edge cases, validation & accessibility (Day 71–77)

- Goal: Fix edge cases, add input validation, improve accessibility and responsive behavior.
- Deliverables: Form validation, aria attributes, keyboard navigation, responsive fixes.
- Acceptance: Pass checklist for accessibility basics and responsive breakpoints.

Day-by-day:
- Day 1: Run axe-core or manual accessibility checks; record issues.
- Day 2: Implement fixes for labeled inputs, landmarks, and keyboard focus.
- Day 3: Add input validation and user-friendly error messages across forms.
- Day 4: Test on mobile viewport and adjust layouts.
- Day 5: Commit and PR.

Note: Offline Listening (Service Worker + Cache API)

- Integrate offline caching during this polish week:
	- Add a Service Worker that caches selected track responses and app shell assets.
	- Provide a UI for users to "Download" a playlist for offline use and to manage cached content.
	- Acceptance: cached tracks play while offline and the UI indicates offline availability.

Week 11 — Polish, documentation & demo script (Day 78–84)

- Goal: Polish UI, finalize README, and write the demo script with roles and talking points.
- Deliverables: Final README, demo script, `PROJECT_STATUS.md` summary.
- Acceptance: Demo script practiced and README contains run/build instructions.

Day-by-day:
- Day 1: Finalize color palette, spacing, and microcopy.
- Day 2: Update `README.md` with setup, commands, and feature list.
- Day 3: Write demo script: who speaks for which feature and live flows.
- Day 4: Run-through demo and fix discovered issues.
- Day 5: Final commit and PR.

Week 12 — Final demo & deployment (Day 85–91)

- Goal: Freeze features, produce static export, and verify app runs from clean clone.
- Deliverables: Static export in `/dist` or `/out`, final demo video or live demo, final tag/release.
- Acceptance: From a clean clone: `npm install` and documented build/start run the app.

Day-by-day:
- Day 1: Feature freeze and branch for final testing.
- Day 2: Run `npm run build` and `npm run generate` (Nuxt) to produce static files.
- Day 3: Test static export locally (`serve` or `http-server`).
- Day 4: Tag release and create release notes.
- Day 5: Final demo and submit deliverables.

Cross-cutting tasks (ongoing)

- Code review: require 1 reviewer per PR; include a check that the author explains AI-generated code.
- Commit messages: use conventional commits (`feat:`, `fix:`, `chore:`) and short descriptions.
- Branching: `main` for release, `develop` for integration, feature branches `feature/<name>`.
- PR template: include description, related issue, testing steps, reviewer, and any AI prompts used.
- Testing: manual integration tests; create a lightweight `TESTS.md` documenting manual checks.

Acceptance checklist (final)

- App runs from clean clone with `npm install` and the documented start command.
- All core features implemented and demonstrated in the demo script.
- At least five screens navigable and functional.
- Three or more stateful features persist to localStorage.
- All four members have distinct commits and PRs merged.

Automation & CI suggestions (optional)

- Add a simple GitHub Action to run linting and build on PRs to `develop`.
- Optionally, add a `preview` deployment on branches using GitHub Pages or Netlify for demoing PRs.

Files to add/update (recommended)

- `README_PROJECT.md` — one-page plan + run instructions
- `PROJECT_STATUS.md` — weekly status bullets
- `TESTS.md` — manual test checklist
- `.github/PULL_REQUEST_TEMPLATE.md` — PR template
- `.github/ISSUE_TEMPLATE/feature.md` — feature issue template

Next steps I can take now

- Generate `README_PROJECT.md` from this detailed plan and write it to the repo.
- Create `tasks.md` with GitHub-issue-style tasks for Phase 2 (daily tasks).
- Create the PR and issue templates under `.github/`.

---

Marking detailed plan added to `plan.md`.

---

## User-provided Project Specification

The following detailed specification was provided by the team and is included here verbatim. Paste into issue tracker or README as needed.

# Synx — Semester Project Development Plan

## Project Overview

**Project Name:** Synx

**Project Type:** Frontend Music & Social Listening Application

**Framework:** Nuxt (JavaScript)

**Storage:** Browser `localStorage`

**Backend:** None

**Database:** None

Synx is a frontend music application designed around personalized music discovery and social listening. Instead of relying mainly on a traditional search bar, users describe themselves, their interests, favorite artists, or current mood. Synx uses this information to generate music recommendations and organize personalized music libraries.

The application also focuses on social interaction through profiles, music sharing, chat, group listening, and shared libraries.

---

# 1. Project Goals

The main goals of Synx are:

- Create a modern music application interface.
- Provide personalized music recommendations.
- Allow users to create and manage multiple music libraries.
- Allow users to discover other users and their music collections.
- Provide social interaction through profiles and chat.
- Allow users to listen together through Group Listening.
- Allow two users to collaborate through Duo Mode.
- Support offline-style music access using browser storage and locally available demo data.
- Demonstrate advanced frontend development using Nuxt and JavaScript.
- Create a project large enough to be developed throughout the semester.

---

# 2. Core Features

## Feature 1 — Login & Home Feed

Users can log in using a frontend-only demo account.

### Login

The login screen should include:

- Username or email
- Password
- Login button
- Demo account option
- Basic validation
- Remember login state using `localStorage`

Important:

This is a frontend-only project. Do not implement real authentication or real passwords.

### Home Feed

After logging in, users are taken to the home feed.

The home feed should contain:

- Personalized recommendations
- Recently played music
- Recommended libraries
- Trending music
- Suggested users
- Mood-based recommendations
- Quick access to saved libraries

Music should be rendered from JavaScript data instead of manually duplicated HTML.

---

# 3. Feature 2 — Describe Yourself

Synx should provide a unique music discovery experience without depending on a traditional search bar.

Users describe themselves using a text input.

Example:

> "I like basketball, late-night gaming, chill music, and artists like The Weeknd."

Another example:

> "I'm studying tonight and want calm music without too many vocals."

The application analyzes keywords from the description and determines suitable music moods or categories.

Possible detected categories:

- Chill
- Study
- Workout
- Party
- Romantic
- Gaming
- Focus
- Relaxing
- Sad
- Happy
- Night
- Travel

The system then displays recommended songs and automatically creates a suggested library.

### Requirements

- Text input
- Character limit
- Submit button
- Loading/analyzing state
- Keyword detection
- Recommendation result
- Generated library
- Ability to save generated library
- Empty state when no suitable keywords are detected

This feature should work using local JavaScript logic and hardcoded music data.

No external AI API is required.

---

# 4. Feature 3 — Multiple Music Libraries

Users can create multiple personal music libraries.

Examples:

- Study Mode
- Workout
- Chill Night
- Gaming
- Party
- Relax
- Road Trip

Each library should contain:

- Library name
- Description
- Cover image
- Songs
- Number of songs
- Owner
- Created date
- Likes

Users should be able to:

- Create a library
- Rename a library
- Delete a library
- Add songs
- Remove songs
- Reorder songs
- Like/save libraries
- Open a library
- Play a library

Library data should be saved using `localStorage`.

---

# 5. Feature 4 — Profile Page

Each user has a profile.

The profile should display:

- Profile picture
- Username
- Bio
- Followers
- Following
- Number of libraries
- Public libraries
- Recently played
- Liked libraries

Users should be able to visit other profiles.

Other users can:

- Follow/unfollow
- View public libraries
- Like libraries
- Open libraries
- Start a chat

The current user's profile should also allow editing profile information.

---

# 6. Feature 5 — Chat

Synx should include a frontend-only messaging system.

Users can:

- View conversations
- Open a conversation
- Send messages
- Receive simulated/demo responses
- Share music
- Share libraries
- View timestamps

The chat interface should include:

- Conversation list
- Active conversation
- Message bubbles
- Message input
- Send button
- Shared music cards
- Empty states

Messages should be stored in `localStorage`.

Since there is no backend, chat does not need real-time communication.

The interface should simulate a realistic messaging experience.

---

# 7. Feature 6 — Group Listening

Users can create a Group Listening session.

The host can:

- Create a session
- Select a library
- Invite followers
- Start playback
- Pause playback
- Skip songs
- Change songs
- End the session

Participants can:

- Join the session
- See the current song
- See the queue
- See other participants
- View the host
- Send reactions

Only the host controls playback.

### Group Listening UI

Include:

- Session name
- Host information
- Current song
- Album artwork
- Playback controls
- Queue
- Participants
- Chat/reactions
- Leave session button
- End session button for host

Because Synx is frontend-only, the feature should simulate synchronized playback within the application.

---

# 8. Feature 7 — Shared Library / Duo Mode

Duo Mode allows two users to manage one shared music library.

Users can:

- Create a Duo Library
- Invite another user
- Accept/decline invitation
- Add songs
- Remove songs
- Organize songs
- Rename the library
- Change the cover
- View both members

The library should clearly show:

**Owner 1 + Owner 2**

Example:

> Ivan + Alex — Late Night Mix

Both users should appear as collaborators.

Duo libraries should be stored using `localStorage`.

---

# 9. Feature 8 — Offline Listening

Create an offline-style feature that allows users to save songs or libraries for offline access.

Users can:

- Download a song
- Download a library
- View downloaded songs
- Remove downloads
- Open Offline Mode

The Offline page should display:

- Downloaded songs
- Downloaded libraries
- Storage/status indicators
- Empty state
- Remove button

Important:

Because this is a frontend-only semester project without a backend or music streaming API, this feature should be implemented as a frontend simulation.

Do not attempt to illegally download copyrighted music.

Use demo/local audio files or placeholder music data.

---

# 10. Required Screens

Synx should have more than the required five screens.

Target screens:

1. **Login**
	- User authentication interface.

2. **Home**
	- Personalized music feed and recommendations.

3. **Describe Yourself**
	- Personalized music discovery.

4. **My Libraries**
	- User-created music libraries.

5. **Library Details**
	- Songs, information, and playback controls.

6. **Profile**
	- User profile and public libraries.

7. **Discover Users**
	- Explore other users and their libraries.

8. **Chat**
	- Music conversations and recommendations.

9. **Group Listening**
	- Shared listening session.

10. **Duo Mode**
	 - Collaborative music library.

11. **Offline**
	 - Downloaded music and libraries.

12. **Settings**
	 - Profile and application preferences.

---

# 11. Main Navigation

The main application navigation should include:

- Home
- Discover
- Describe
- Libraries
- Group
- Duo
- Chat
- Offline
- Profile

On mobile, convert this into a responsive bottom navigation or mobile menu.

---

# 12. Application State

Synx must demonstrate multiple state-changing features.

Important application state includes:

### Authentication State

```js
currentUser
isLoggedIn
```

