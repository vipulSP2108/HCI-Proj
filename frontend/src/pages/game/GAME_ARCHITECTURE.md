# LimbPlay Game Architecture & Developer Guide

This document serves as the ground-truth technical reference for the three core therapy games in the LimbPlay application. **Any developer working on this codebase MUST read this file first** to avoid breaking the delicate MediaPipe integrations, mobile layouts, and timer logic.

---

## 1. The Core Games

### A. Shape Tracer (Board Drawing Game)
- **Location**: `frontend/src/pages/game/BoardDrawingGame/BoardDrawingGame.js`
- **Clinical Focus**: Fine motor precision and distal control.
- **Mechanics**: The patient traces shapes (circles, squares, triangles) using MediaPipe hand tracking. Features dynamic "Safe Zones" (Green) and "Warning Zones" (Yellow) which can be configured by doctors.
- **Context Imports**: Uses `useAuth()` to get `isDarkMode` and `user` state, and `useSettings()` for `globalSettings`.

### B. Arm Orchard (Fruit Basket Game)
- **Location**: `frontend/src/pages/game/FruitBasketGame/FruitBasketGame.js`
- **Clinical Focus**: Arm reach, coordination, and grasp/transport/release mechanics.
- **Mechanics**: The patient picks up virtual apples using open/close hand gestures and drops them into a basket. 
- **Important Note**: The basket radius dynamically scales down for mobile using `isMobile` variables to prevent it from obstructing the screen on smaller devices.

### C. Piano Therapy (Piano Reaction Game)
- **Location**: `frontend/src/pages/game/PianoReactionGame/PianoReactionGame.js`
- **Clinical Focus**: Reaction time, finger dexterity, and wrist movement.
- **Mechanics**: Features a scrolling piano interface where the patient hits specific keys within dynamic time limits based on their assigned therapy levels.

---

## 2. Critical UI & Layout Patterns (DO NOT BREAK)

We spent significant time perfectly calibrating the unified responsive layout for these games. Adhere to these rules strictly:

### The "Never Unmount" MediaPipe Rule
The `<video>` and `<canvas>` elements feeding the MediaPipe camera logic must **NEVER** conditionally unmount based on screen size (e.g., do not wrap them in `{isMobile ? ... : ...}` blocks). 
- **Why?** Unmounting and remounting the `<video>` element forces MediaPipe to aggressively reinitialize, causing massive lag spikes, crashes, or black screens.
- **The Solution**: The camera is permanently mounted inside the desktop `<aside>` panel. 

### The 2-Column / Mobile PiP Hybrid Layout
- **Desktop/Tablet**: The UI flows naturally as a 2-column flexbox (`<aside>` for the lobby/camera, `<main>` for the game canvas).
- **Mobile**: To keep the video mounted without breaking the UI, the `<aside>` panel visually collapses (`width: 0, height: 0, overflow: visible, background: transparent`). The camera container *breaks out* of it and becomes a `position: fixed` draggable Picture-in-Picture (PiP) overlay on top of the fullscreen `<main>` canvas.
- **PiP Snapping Logic**: When dragging the camera PiP on mobile, it calculates the distance to all 4 screen edges (Left, Right, Top, Bottom) and mathematically snaps to the closest one.

---

## 3. Game Timer & State Memory Leaks

Games utilize `setInterval` and `setTimeout` for session countdowns and section transitions. 

**CRITICAL**: You must always ensure intervals are explicitly cleared using `clearInterval` and `clearTimeout` in **all** exit pathways, including:
1. `handleEndSession()` (When pressing the Quit button)
2. `handleBeforeSave()` (When saving a completed game)
3. `handleExitDiscard()` (When aborting/discarding a game via the Exit Modal)

*Failure to clear these in the past resulted in "Ghost Timers", where the game would navigate away to the dashboard, but a background timer would still fire 5 minutes later and trigger a "Session Complete" alert.*

---

## 4. Dark Mode Consistency

All pre-game lobbies, sidebars, buttons, and stats panels must respect the `isDarkMode` state variable (imported from `useAuth()` in Shape Tracer & Arm Orchard, or handled globally). 
- Primary action colors should fall back gracefully (e.g., `#2563eb` for light mode, `#60a5fa` for dark mode).
- Do not hardcode white backgrounds for sidebars; always conditionally check `isDarkMode`.
