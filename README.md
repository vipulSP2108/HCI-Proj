# HCI-Proj - Gamified Rehabilitation System

Welcome to the HCI-Proj, a suite of interactive, gamified rehabilitation exercises designed to help patients improve motor skills, reaction times, and dexterity. Built on a modern web stack, this platform leverages computer vision and engaging user interfaces to provide an effective and enjoyable therapeutic experience.

## System Architecture & Tech Stack

This application utilizes a modern, full-stack architecture to ensure real-time performance and seamless data tracking.

- **Frontend:** React.js bootstrapped with Create React App. It uses **Tailwind CSS** for responsive, modern styling and **Framer Motion** for smooth micro-animations.
- **Backend:** Node.js and Express.js handle API requests, session management, and data aggregation.
- **Database:** MongoDB (with Mongoose) is used to securely store patient profiles, game sessions, and analytics data.
- **Computer Vision:** **Google MediaPipe** is integrated for real-time hand and pose tracking directly in the browser, powering the motion-based games without the need for external sensors.
- **Analytics:** Data is visualized using **Recharts** on the clinician and patient dashboards, providing actionable insights into recovery progress.

---

## Games Overview

The system includes a variety of specialized exercises targeting different aspects of physical rehabilitation. Below is an in-depth look at the core games.

### 1. Piano Keyboard (Laptop Mode - Finger Dexterity)
![Piano Keyboard Game Screenshot Placeholder](placeholder_piano_keyboard.png)
- **Target:** Improve individual finger strength, dexterity, and cognitive reaction time.
- **Objective:** The user places their hands on a physical laptop keyboard. An on-screen piano key will highlight (turn black). The user must quickly press the corresponding physical key (e.g., A, S, D, F) using the assigned finger before the timer runs out.
- **How to Play:** Watch the screen for the active key indicator. Tap the matching key on your keyboard as fast as possible. The game records correct hits, incorrect hits, and timeouts (missed attempts), adjusting difficulty based on response times.

### 2. Piano Mobile (Mobile Mode)
![Piano Mobile Game Screenshot Placeholder](placeholder_piano_mobile.png)
- **Target:** Enhance wrist movement, touch reaction, and hand-eye coordination on touchscreen devices.
- **Objective:** Adapted specifically for mobile screens, this mode features a simplified piano interface (typically 4 or 5 large keys). The user must physically tap the correct section on their screen when it highlights.
- **How to Play:** Watch the screen for the active piano key. Once a key turns black, tap that section on your mobile screen before the countdown ends. It emphasizes quick touch response and spatial targeting on mobile devices.

### 3. Piano Cursor (Wrist Movement)
![Piano Cursor Game Screenshot Placeholder](placeholder_piano_cursor.png)
- **Target:** Improve wrist mobility, continuous cursor control, and precise hand-eye coordination.
- **Objective:** Instead of pressing physical keys, the user must move their computer mouse or trackpad cursor to the active piano key on the screen.
- **How to Play:** When a piano section lights up, navigate the cursor to that specific area. This exercise tracks the trajectory, speed, and accuracy of the movement, focusing on smooth wrist motions rather than isolated finger taps.

### 4. Fruit Fetch (Webcam Motion Tracking)
![Fruit Fetch Game Screenshot Placeholder](placeholder_fruit_fetch.png)
- **Target:** Full arm extension, shoulder mobility, spatial awareness, and upper body range of motion.
- **Objective:** The user utilizes their physical body movements—tracked in real-time via the webcam using MediaPipe—to reach for virtual fruits appearing on the screen and drag them into a basket.
- **How to Play:** Stand in front of the camera. A fruit will appear in a random location on the screen. Reach your hand out physically to "grab" the fruit, then move your hand to guide it into the basket. You must complete the fetch within the allowed time limit. The game tracks successful drops, missed attempts, and the time taken.

### 5. Board Drawing
![Board Drawing Game Screenshot Placeholder](placeholder_board_drawing.png)
- **Target:** Fine motor control, continuous path tracing, and sustained hand movement.
- **Objective:** The user is presented with a target shape or path on the screen and must draw or trace that shape as accurately as possible.
- **How to Play:** Using the input device (mouse, touch, or tracked hand), trace the outline of the displayed shape from start to finish. Unlike the reaction-based games, success here is measured by drawing *accuracy*. The system calculates how closely the user's drawn path matches the target shape, yielding an average match percentage rather than a simple correct/incorrect score.



