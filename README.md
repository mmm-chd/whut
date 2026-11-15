# What Happens Up There

An interactive digital storybook about NASA's robotic space explorers — the rovers, landers, and vehicles that went to the Moon and Mars, told through pop-up book visuals, audio, and gamification.

## About the Project

**What Happens Up There** is an interactive digital storybook website that tells the stories of NASA's robotic space exploration objects on the Moon and Mars through character development, pop-up book visuals, audio, and gamification. Designed for children ages 8–12, the project aims to simplify NASA's complex space mission archives into an educational, interactive, and emotionally engaging learning experience.

Each character represents a real object, such as a rover, lander, or other exploration vehicle, with a personality and backstory based on its actual function, achievements, and mission history. Through minigames inspired by each object's functions and mission facts, users learn about their contributions to the history of space exploration.

With the theme **"Abandoned but Not Forgotten,"** the project reframes neglect as a way to preserve the stories of objects that have completed their missions, pioneered exploration, or lost communication — but still have a place in the history of human exploration.

Drawing on the **NASA Space Science Data Coordinated Archive (NSSDCA)**, What Happens Up There combines scientific accuracy, accessible education, and emotional storytelling to bring forgotten stories back to life.

## Features

- 🚀 **Pop-up book visuals** — paper-cut scenes rendered with WebGL (Three.js) with parallax and cinematic transitions
- 📖 **Character selection journal** — explore each character's spread before starting their story
- 🎮 **Minigames** — gameplay inspired by each object's real functions and mission facts
- 🔊 **Voice-over & music** — narrated scenes with a looping story score (Howler)
- 📱 **Responsive & accessible** — rotation prompts on small screens, `prefers-reduced-motion` support

## Tech Stack

| Layer      | Tools                                                          |
| ---------- | -------------------------------------------------------------- |
| Frontend   | React 19, TypeScript                                           |
| Build tool | Vite 8                                                         |
| 3D / WebGL | Three.js, @react-three/fiber                                   |
| Animation  | GSAP, motion                                                   |
| Audio      | Howler                                                         |
| State      | Zustand                                                        |
| Testing    | Vitest (jsdom)                                                 |
| Tooling    | oxlint, Prettier                                               |

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.19 or ≥ 22.12 (required by Vite 8)
- **npm** (bundled with Node.js)

### Installation & Development

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Open the URL shown in the terminal (by default `http://localhost:5173`).

### Production Build

```bash
# Build the optimized bundle into dist/
npm run build

# Preview the production build locally
npm run preview
```

## Available Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Create a production build in `dist/` |
| `npm run preview` | Serve the production build locally   |
| `npm test`        | Run the Vitest test suite            |
| `npm run lint`    | Lint the codebase with oxlint        |
| `npm run typecheck` | Type-check the project (`tsc --noEmit`) |
| `npm run format`  | Format the codebase with Prettier    |

## Routes

| Path                   | Stage                                            |
| ---------------------- | ------------------------------------------------ |
| `/`                    | Splash + the launchpad (homepage)                |
| `/characters`          | The adventure journal (character selection)      |
| `/story`               | The story sequence                               |
| `/story/<character>`   | Deep link into a character's story (e.g. `/story/perseverance`) |

Unknown paths fall back to the homepage. Deep links skip the intro and land directly on that stage.

## Project Structure

```
src/
├── app/          # App shell, router, story sequence, URL sync
├── assets/       # Fonts, images, audio, and fixed art assets
├── audio/        # Menu score and story score hooks
├── characters/   # Character rigs (e.g. Percy the rover)
├── components/   # Shared UI (playback controls, pause menu, splash)
├── engine/       # Narrative controller and scene registry
├── scenes/       # One folder per scene (home, book, story scenes)
├── stores/       # Zustand stores (story, settings)
├── styles/       # Global stage styles
└── three/        # WebGL stage primitives
```

## Credits

Created by team **Porpopil** for the "Abandoned but Not Forgotten" theme, drawing on the [NASA Space Science Data Coordinated Archive (NSSDCA)](https://nssdc.gsfc.nasa.gov/) and NASA mission archives. Illustrations and environment assets are AI-generated; 3D models come from NASA 3D Resources.

The full credit roll — including the team members and the volunteer voices behind the characters — lives in the **Credit** tab on the homepage.
