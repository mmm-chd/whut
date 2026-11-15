# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Children (about 8 to 12) reading an interactive storybook about the Mars 2020 Perseverance rover ("Percy"), on desktop and on phones in landscape. They read short narration, tap or drag small activities, and need to feel the story is moving without a lot of text at once.

## Product Purpose

An interactive, narrated storybook that teaches how Perseverance travels to Mars, lands in Jezero Crater, inspects itself, collects rock samples and navigates with the help of the team on Earth. Each scene is a short cinematic with at most one small activity. Success is a child finishing a scene having understood one real idea (for example, why a command takes time to reach Mars) and wanting to continue.

## Positioning

A story told by the rover itself and a friendly narrator, using real NASA/JPL facts at child level, instead of a facts page. The same cast (Percy, Ginny, Oppy) and the same hand-made world carry through every scene.

## Operating Context

Scenes run in order inside one shell with one shared music score, one dialogue and voice-over system and one pause/replay control. Story is authored per scene in `animation-baseline-en/perseverance/` and dialogue in `docs-base/assets/dialog-perseverance.pdf`. Scene plans live in `src/docs/`. Stage art is drawn with WebGL sprites; text, controls and cards are DOM.

## Capabilities and Constraints

- Strict TypeScript, React 19, Vite, GSAP, Zustand, Howler, three.js with react-three-fiber.
- Engine status is only `idle | playing | waiting | completed`; scene phases stay local to the scene.
- Landscape only (a rotate gate covers portrait). Reduced-motion must keep the same story beats.
- Facts must come from verified NASA/JPL sources; unverified facts are marked draft in data.
- Real recordings exist for most lines; a mapping by file name is a candidate until checked by ear.
- P-06 is being built by another contributor. P-07 must not edit that scene's files or claim its place in the story order.

## Brand Commitments

The world already shipped is binding: the shared Mars landscape, the layered Percy rig, cream scrapbook paper cards with a rust-brown border, the crayon display face (DK Cool Crayon) with a handwritten body face, round pill buttons, and the project's cursor family.

## Evidence on Hand

Perseverance and rover PNGs under `src/assets/`, rover cards for Sojourner, Spirit, Opportunity and Curiosity under `src/assets/drafts/p03/`, and voice-over under `src/audio/voice-over/perseverance/`. There is no top-down art for P-07; it is authored for this scene.

## Product Principles

1. One real idea per scene, said in plain words, shown before it is explained.
2. A child's action always has a visible result; waiting is never empty.
3. Nothing punishes: obstacles teach, they do not fail the child.
4. Every scene looks like it belongs to the same hand-made book.
5. Facts are honest: dated, sourced, and marked draft until checked.

## Accessibility & Inclusion

Keyboard and touch alternatives for every pointer action, 44 px minimum targets, visible focus, text and shape (not colour alone) for state, reduced-motion support, and readable text over the picture.
