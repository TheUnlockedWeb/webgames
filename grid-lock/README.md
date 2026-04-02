# 🕹️ GRID-LOCK // PROTOCOL

![Version](https://img.shields.io/badge/version-1.0.0-blueviolet)
![License](https://img.shields.io/badge/license-MIT-green)
![Difficulty](https://img.shields.io/badge/difficulty-EXTREME-red)

**GRID-LOCK** is a high-precision, grid-based reflex game. Engineered with vanilla JavaScript, it challenges players to navigate a "Data Packet" through high-speed security perimeters to reach a terminal goal.

---

## 🚀 Single-File Deployment

This project is designed to be lightweight. You can run the entire game from a single `index.html` file.

1. Copy the game code into `index.html`.
2. Open the file in any modern web browser.
3. Use the **Arrow Keys** to navigate.

---

## 🎮 Game Mechanics

| Entity | Description |
| :--- | :--- |
| **Player (White)** | Your system avatar. Movement is restricted to the grid. |
| **Orbs (Red)** | Automated security patrols. Collision results in an immediate reset. |
| **Goal (Green)** | The target terminal. Reach this to complete the protocol. |

### ⚠️ Difficulty Warning
The security orbs scale in speed. **Orb #5** moves at a velocity of 13px per frame, requiring a dash-and-pause strategy to bypass.

---

## 🛠️ Technical Overview

### 🧱 Architecture
The game uses a **Constant Loop Pattern** via `requestAnimationFrame` to ensure 60FPS performance. 

### 📐 Physics & Collision
Instead of complex physics libraries, the engine uses **AABB (Axis-Aligned Bounding Box)** detection:
```javascript
if (player.x < en.x + radius && player.x + player.w > en.x - radius) {
    // Collision detected
}
