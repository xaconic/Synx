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
