/**
 * 3D Game of Life Visualization Component
 * 
 * @file MainComponent.tsx
 * @author haruka_apps
 * @version 1.0.0
 * @license MIT
 * 
 * An interactive, three-dimensional visualization of Conway's Game of Life using Three.js.
 * Features dynamic cell generation, audio feedback, and customizable parameters.
 * 
 * Key Features:
 * - 3D grid visualization with customizable size and cell appearance
 * - Audio feedback synchronized with cell generation
 * - Performance optimization using instanced meshes
 * - Interactive controls for simulation parameters
 * - Dynamic lighting with 12 point lights
 * 
 * @example
 * ```tsx
 * import MainComponent from './components/MainComponent';
 * 
 * function App() {
 *   return <MainComponent />;
 * }
 * ```
 */

import React from "react";

interface Cell {
  position: [number, number, number];
  isAlive: boolean;
}

interface Grid {
  [key: string]: Cell;
}

interface AudioRefs {
  context: AudioContext | null;
  oscillator: OscillatorNode | null;
  gain: GainNode | null;
}

const PHI = 1.618033988749895; // Golden ratio for aesthetic proportions
const DEFAULT_GRID_SIZE = 13;
const DEFAULT_CELL_SIZE = 0.7;
const DEFAULT_ROTATION_SPEED = 0.8;
const DEFAULT_CAMERA_DISTANCE = 30;
const DEFAULT_PATTERN_SPEED = 1;

function MainComponent() {
  // Refs for Three.js objects
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = React.useRef<THREE.Scene | null>(null);
  const gridRef = React.useRef<Grid>({});
  const timeRef = React.useRef<number>(0);
  const lightsRef = React.useRef<THREE.PointLight[]>([]);
  const cellsRef = React.useRef<THREE.Mesh[]>([]);
  const cellGeometryRef = React.useRef<THREE.BoxGeometry | null>(null);
  const cellMaterialRef = React.useRef<THREE.MeshPhysicalMaterial | null>(null);
  const historyCellsRef = React.useRef<THREE.Mesh[]>([]);
  const beatRef = React.useRef<number>(0);
  const lastUpdateTimeRef = React.useRef<number>(0);
  const currentLayerRef = React.useRef<number>(0);

  // Audio refs
  const audioRefs = React.useRef<AudioRefs>({
    context: null,
    oscillator: null,
    gain: null,
  });

  // State management
  const [threeLoaded, setThreeLoaded] = React.useState<boolean>(false);
  const [paused, setPaused] = React.useState<boolean>(false);
  const [generation, setGeneration] = React.useState<number>(0);
  const [activeCells, setActiveCells] = React.useState<number>(0);
  const [showControls, setShowControls] = React.useState<boolean>(false);
  const [gridSize, setGridSize] = React.useState<number>(DEFAULT_GRID_SIZE);
  const [cellSize, setCellSize] = React.useState<number>(DEFAULT_CELL_SIZE);
  const [rotationSpeed, setRotationSpeed] = React.useState<number>(DEFAULT_ROTATION_SPEED);
  const [cameraDistance, setCameraDistance] = React.useState<number>(DEFAULT_CAMERA_DISTANCE);
  const [patternSpeed, setPatternSpeed] = React.useState<number>(DEFAULT_PATTERN_SPEED);
  const [cellColor, setCellColor] = React.useState<string>("#ffd700");
  const [lightColor, setLightColor] = React.useState<string>("#4477ff");
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(true);

  // Load Three.js library
  React.useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.async = true;
    script.onload = () => setThreeLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  React.useEffect(() => {
    if (!threeLoaded || !canvasRef.current) return;

    audioRefs.current.context = new (window.AudioContext ||
      window.webkitAudioContext)();
    audioRefs.current.oscillator = audioRefs.current.context.createOscillator();
    audioRefs.current.gain = audioRefs.current.context.createGain();

    audioRefs.current.oscillator.connect(audioRefs.current.gain);
    audioRefs.current.gain.connect(audioRefs.current.context.destination);

    audioRefs.current.oscillator.type = "sine";
    audioRefs.current.gain.gain.value = 0;
    audioRefs.current.oscillator.start();
    audioRefs.current.context.resume();

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.Fog(0x000000, 15, 40);
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(20 * PHI, 20, 20 / PHI);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasRef.current.innerHTML = "";
    canvasRef.current.appendChild(renderer.domElement);

    const grid = [];
    const initializeGrid = () => {
      const newGrid = [];
      for (let i = 0; i < gridSize; i++) {
        newGrid[i] = [];
        for (let j = 0; j < gridSize; j++) {
          newGrid[i][j] = [];
          for (let k = 0; k < gridSize; k++) {
            newGrid[i][j][k] = k === 0 && Math.random() > 0.8;
          }
        }
      }
      return newGrid;
    };

    gridRef.current = initializeGrid();

    cellGeometryRef.current = new THREE.BoxGeometry(
      cellSize,
      cellSize * PHI,
      cellSize
    );
    cellMaterialRef.current = new THREE.MeshPhysicalMaterial({
      color: cellColor,
      transparent: true,
      opacity: 0.9,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x666666,
      emissiveIntensity: 0.5,
      reflectivity: 1.0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      fog: true,
    });

    const colors = Array.from({ length: 12 }).map((_, i) => {
      const hue = (i / 12) * 360;
      return `hsl(${hue}, 100%, 70%)`;
    });

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 25 * PHI;
      const height = 15 * PHI;

      const light = new THREE.PointLight(colors[i], 6.5, 80);
      light.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      lightsRef.current.push(light);
      scene.add(light);
    }

    const ambientLight = new THREE.AmbientLight(0x404040, 5);
    scene.add(ambientLight);

    const updateLife = () => {
      if (paused) return;

      const currentTime = performance.now();
      if (currentTime - lastUpdateTimeRef.current < 50) return;
      lastUpdateTimeRef.current = currentTime;

      beatRef.current = (beatRef.current + patternSpeed) % (Math.PI * 2);

      setGeneration((prev) => {
        if (prev % 10 === 0) {
          currentLayerRef.current = Math.min(
            currentLayerRef.current + 1,
            gridSize - 1
          );

          const currentGrid = gridRef.current;
          for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
              for (let k = gridSize - 1; k > 0; k--) {
                currentGrid[i][j][k] = currentGrid[i][j][k - 1];
              }
              const beat =
                Math.sin(beatRef.current + (i + j) * 0.1) * 0.5 + 0.5;
              currentGrid[i][j][0] = Math.random() > 0.8 - beat * 0.3;
            }
          }
          gridRef.current = currentGrid;
        }
        return prev + 1;
      });

      const newGrid = [];
      let newActiveCells = 0;
      const prevGrid = gridRef.current;

      for (let i = 0; i < gridSize; i++) {
        newGrid[i] = [];
        for (let j = 0; j < gridSize; j++) {
          newGrid[i][j] = [];
          for (let k = 0; k < gridSize; k++) {
            let neighbors = 0;

            for (let di = -1; di <= 1; di++) {
              for (let dj = -1; dj <= 1; dj++) {
                if (di === 0 && dj === 0) continue;
                const ni = (i + di + gridSize) % gridSize;
                const nj = (j + dj + gridSize) % gridSize;
                if (gridRef.current[ni][nj][k]) {
                  neighbors++;
                }
              }
            }

            if (k <= currentLayerRef.current) {
              if (gridRef.current[i][j][k]) {
                newGrid[i][j][k] = neighbors === 2 || neighbors === 3;
              } else {
                newGrid[i][j][k] = neighbors === 3;
              }

              if (newGrid[i][j][k]) {
                newActiveCells++;
                if (!prevGrid[i][j][k]) {
                  const historyCell = new THREE.Mesh(
                    cellGeometryRef.current,
                    cellMaterialRef.current.clone()
                  );
                  const x = (i - gridSize / 2) * cellSize * PHI;
                  const y = k * cellSize * PHI;
                  const z = (j - gridSize / 2) * cellSize * PHI;
                  historyCell.position.set(x, y, z);
                  historyCell.material.opacity = 0.3;
                  scene.add(historyCell);
                  historyCellsRef.current.push(historyCell);

                  // Play sound for new cell
                  if (soundEnabled) {
                    const frequency = 220 + k * 110;
                    audioRefs.current.oscillator.frequency.setValueAtTime(
                      frequency,
                      audioRefs.current.context.currentTime
                    );
                    audioRefs.current.gain.gain.setValueAtTime(
                      0,
                      audioRefs.current.context.currentTime
                    );
                    audioRefs.current.gain.gain.linearRampToValueAtTime(
                      0.1,
                      audioRefs.current.context.currentTime + 0.01
                    );
                    audioRefs.current.gain.gain.linearRampToValueAtTime(
                      0,
                      audioRefs.current.context.currentTime + 0.1
                    );
                  }
                }
              }
            } else {
              newGrid[i][j][k] = false;
            }
          }
        }
      }

      setActiveCells(newActiveCells);

      if (newActiveCells < 30) {
        const phase = Math.sin(beatRef.current) * 0.5 + 0.5;
        const spawnCount = Math.floor(4 + phase * 8);

        for (let i = 0; i < spawnCount; i++) {
          const angle = (i / spawnCount) * Math.PI * 2;
          const radius = Math.floor(gridSize * 0.3);
          const x = Math.floor(
            gridSize / 2 + Math.cos(angle + beatRef.current) * radius
          );
          const y = Math.floor(
            gridSize / 2 + Math.sin(angle + beatRef.current) * radius
          );

          if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            newGrid[x][y][0] = true;
            if (x > 0) newGrid[x - 1][y][0] = true;
            if (x < gridSize - 1) newGrid[x + 1][y][0] = true;
            if (y > 0) newGrid[x][y - 1][0] = true;
            if (y < gridSize - 1) newGrid[x][y + 1][0] = true;
          }
        }
      }

      gridRef.current = newGrid;

      cellsRef.current.forEach((cell) => {
        if (sceneRef.current) {
          sceneRef.current.remove(cell);
        }
      });
      cellsRef.current = [];

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          for (let k = 0; k < gridSize; k++) {
            if (newGrid[i][j][k]) {
              const cell = new THREE.Mesh(
                cellGeometryRef.current,
                cellMaterialRef.current.clone()
              );
              const x = (i - gridSize / 2) * cellSize * PHI;
              const y = k * cellSize * PHI;
              const z = (j - gridSize / 2) * cellSize * PHI;
              const beat = Math.sin(beatRef.current + (i + j + k) * 0.1) * 0.8;
              const rotationBeat =
                Math.cos(beatRef.current + (i + j + k) * 0.2) * 0.1;
              cell.rotation.set(rotationBeat, rotationBeat, rotationBeat);
              cell.position.set(x + beat, y + beat, z + beat);
              if (sceneRef.current) {
                sceneRef.current.add(cell);
              }
              cellsRef.current.push(cell);
            }
          }
        }
      }
    };

    const handleClick = () => {
      setPaused(!paused);
      if (audioRefs.current.context.state === "suspended") {
        audioRefs.current.context.resume();
      }
    };

    renderer.domElement.addEventListener("click", handleClick);

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!paused) {
        timeRef.current += 0.005;
        updateLife();
      }

      const radius = cameraDistance;
      const cameraAngle = timeRef.current * rotationSpeed;
      camera.position.x = Math.cos(cameraAngle) * radius;
      camera.position.z = Math.sin(cameraAngle) * radius;
      camera.position.y = 20;
      camera.lookAt(0, 0, 0);

      lightsRef.current.forEach((light, i) => {
        const angle = (i / 12) * Math.PI * 2 + timeRef.current;
        const radius = 25;
        const height = 15 + Math.sin(timeRef.current * 2) * 5;

        light.position.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );
        light.intensity = 5 + Math.sin(timeRef.current * 2 + i * 0.5) * 1.5;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      renderer.domElement.removeEventListener("click", handleClick);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (canvasRef.current) {
        canvasRef.current.innerHTML = "";
      }
      if (cellGeometryRef.current) {
        cellGeometryRef.current.dispose();
      }
      if (audioRefs.current.oscillator) {
        audioRefs.current.oscillator.stop();
      }
      if (audioRefs.current.context) {
        audioRefs.current.context.close();
      }
      cellsRef.current.forEach((cell) => {
        if (cell.material) {
          cell.material.dispose();
        }
      });
      historyCellsRef.current.forEach((cell) => {
        if (cell.material) {
          cell.material.dispose();
        }
      });
    };
  }, [
    threeLoaded,
    paused,
    gridSize,
    cellSize,
    rotationSpeed,
    cameraDistance,
    cellColor,
    lightColor,
    patternSpeed,
    soundEnabled,
  ]);

  return (
    <div className="relative w-screen h-screen">
      <div ref={canvasRef} className="w-full h-full bg-black" />
      <button
        onClick={() => setShowControls(!showControls)}
        className="absolute top-4 right-4 bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 text-white transition-colors"
      >
        {showControls ? "Hide Controls" : "Show Controls"}
      </button>
      <div className="absolute top-4 left-4 text-white text-xl space-y-2">
        <div>{paused ? "Click to Resume" : "Click to Pause"}</div>
        <div>Generation: {generation}</div>
        <div>Active Cells: {activeCells}</div>
      </div>
      {showControls && (
        <div className="absolute top-16 right-4 bg-gray-800/90 p-4 rounded-lg text-white space-y-4 backdrop-blur-sm shadow-lg">
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium">Grid Size: {gridSize}</label>
              <input
                type="range"
                min="10"
                max="30"
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Cell Size: {cellSize}</label>
              <input
                type="range"
                min="0.4"
                max="1.0"
                step="0.1"
                value={cellSize}
                onChange={(e) => setCellSize(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">
                Rotation Speed: {rotationSpeed}
              </label>
              <input
                type="range"
                min="0.1"
                max="4.0"
                step="0.1"
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">
                Camera Distance: {cameraDistance}
              </label>
              <input
                type="range"
                min="20"
                max="50"
                value={cameraDistance}
                onChange={(e) => setCameraDistance(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Cell Color</label>
              <input
                type="color"
                value={cellColor}
                onChange={(e) => setCellColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Light Color</label>
              <input
                type="color"
                value={lightColor}
                onChange={(e) => setLightColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Pattern Speed: {patternSpeed}</label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={patternSpeed}
                onChange={(e) => setPatternSpeed(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">Sound</label>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-full py-2 rounded transition-colors ${
                  soundEnabled
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {soundEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainComponent;