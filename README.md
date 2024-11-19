# 3D Game of Life Visualization

An interactive, three-dimensional cellular automaton visualization built with Next.js, React, Three.js, and TypeScript.

![3D Game of Life](./image.gif)

## ✨ Features

- 🎮 Interactive 3D visualization of Conway's Game of Life
- 🎨 Dynamic cell generation with customizable colors and patterns
- 🎵 Audio feedback synchronized with cell generation
- 📊 Performance-optimized using instanced meshes
- 🎥 Multiple camera modes with orbit controls
- 🎛️ Real-time parameter adjustments
- 🌈 Customizable cell and light colors
- 🔊 Toggleable sound effects

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎮 Controls

- Click anywhere to pause/resume the simulation
- Use the control panel to adjust:
  - Grid size (10-30)
  - Cell size (0.4-1.0)
  - Rotation speed
  - Camera distance
  - Cell and light colors
  - Pattern speed
  - Sound on/off

## 🛠️ Technology Stack

- Next.js
- React 18
- TypeScript
- Three.js (r128)
- Tailwind CSS

## ⚡ Performance

The visualization is optimized using:
- Instanced meshes for efficient rendering
- Memoized state updates
- Efficient grid management
- Audio context management

## 📄 License

MIT License - see LICENSE file for details

## 👤 Author

Created by haruka_apps

---
