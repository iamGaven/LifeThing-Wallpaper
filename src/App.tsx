import React, { useEffect, useState, useCallback, useRef } from "react";

// Types
interface GameSettings {
  background_color: string;
  foreground_color: string;
  cell_size: number;
  simulation_speed: number;
  try_revive_stuck_sim: boolean;
  hard_reset_on_stuck: boolean;
  max_revival_attempts: number;
  grid_population_percentage: number;
  fade_amount: number;
  stable_display_time: number;
  edge_wrapping: boolean;
  cell_padding: number;
  bottom_margin: number;
  cell_corner_radius: number;
  neighbor_opacity_enabled: boolean;
  neighbor_opacity_increment: number;
  color_mode: boolean;
  random_color_chance: number;
  max_saturation_age: number;
  saturation_factor: number;
  random_color_pure: boolean;
}

interface CellColor {
  r: number;
  g: number;
  b: number;
}

interface ColoredCell {
  alive: boolean;
  color?: CellColor;
  age?: number;
}

type GridState = boolean[][];
type ColoredGridState = ColoredCell[][];

declare global {
  interface Window {
    wallpaperPropertyListener?: {
      applyUserProperties: (properties: any) => void;
    };
    wallpaperPaused?: boolean;
  }
}

// Default settings optimized for wallpaper use
const DEFAULT_SETTINGS: GameSettings = {
  background_color: "#000000",
  foreground_color: "#1db954",
  cell_size: 25,
  simulation_speed: 2000,
  try_revive_stuck_sim: true,
  hard_reset_on_stuck: false,
  max_revival_attempts: 5,
  grid_population_percentage: 0.3,
  fade_amount: 1,
  stable_display_time: 0,
  edge_wrapping: true,
  cell_padding: 4,
  bottom_margin: 0,
  cell_corner_radius: 8,
  neighbor_opacity_enabled: true,
  neighbor_opacity_increment: 0.15,
  color_mode: true,
  random_color_chance: 0.05,
  max_saturation_age: 15,
  saturation_factor: 0.3,
  random_color_pure: false,
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [grid, setGrid] = useState<GridState>([]);
  const [coloredGrid, setColoredGrid] = useState<ColoredGridState>([]);
  const [targetGrid, setTargetGrid] = useState<GridState>([]);
  const [targetColoredGrid, setTargetColoredGrid] = useState<ColoredGridState>([]);
  const [isFading, setIsFading] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);
  const stateHistoryRef = useRef<string[]>([]);
  const stuckCounterRef = useRef<number>(0);
  const fadeStartTimeRef = useRef<number>(0);
  const fibonacciIndexRef = useRef<number>(0);

  // Wallpaper Engine integration
  useEffect(() => {
  if (window.wallpaperPropertyListener) {
    window.wallpaperPropertyListener = {
      applyUserProperties: (properties: any) => {
        console.log("Properties received:", properties);
        const newSettings: Partial<GameSettings> = {};

        if (properties.cell_size?.value !== undefined) {
          newSettings.cell_size = properties.cell_size.value;
        }
        if (properties.simulation_speed?.value !== undefined) {
          newSettings.simulation_speed = properties.simulation_speed.value;
        }
        if (properties.grid_population_percentage?.value !== undefined) {
          newSettings.grid_population_percentage = properties.grid_population_percentage.value;
        }
        if (properties.fade_amount?.value !== undefined) {
          newSettings.fade_amount = properties.fade_amount.value;
        }
        if (properties.stable_display_time?.value !== undefined) {
          newSettings.stable_display_time = properties.stable_display_time.value;
        }
        if (properties.edge_wrapping?.value !== undefined) {
          newSettings.edge_wrapping = properties.edge_wrapping.value;
        }
        if (properties.cell_padding?.value !== undefined) {
          newSettings.cell_padding = properties.cell_padding.value;
        }
        if (properties.cell_corner_radius?.value !== undefined) {
          newSettings.cell_corner_radius = properties.cell_corner_radius.value;
        }
        if (properties.neighbor_opacity_enabled?.value !== undefined) {
          newSettings.neighbor_opacity_enabled = properties.neighbor_opacity_enabled.value;
        }
        if (properties.neighbor_opacity_increment?.value !== undefined) {
          newSettings.neighbor_opacity_increment = properties.neighbor_opacity_increment.value;
        }
        
        // Handle color_mode with BOTH possible property names
        if (properties.schemecolor?.value !== undefined) {
          console.log("Color mode (schemecolor):", properties.schemecolor.value);
          newSettings.color_mode = properties.schemecolor.value;
        }
        if (properties.color_mode?.value !== undefined) {
          console.log("Color mode (color_mode):", properties.color_mode.value);
          newSettings.color_mode = properties.color_mode.value;
        }
        
        if (properties.random_color_chance?.value !== undefined) {
          newSettings.random_color_chance = properties.random_color_chance.value;
        }
        if (properties.max_saturation_age?.value !== undefined) {
          newSettings.max_saturation_age = properties.max_saturation_age.value;
        }
        if (properties.saturation_factor?.value !== undefined) {
          newSettings.saturation_factor = properties.saturation_factor.value;
        }
        if (properties.random_color_pure?.value !== undefined) {
          newSettings.random_color_pure = properties.random_color_pure.value;
        }
        if (properties.try_revive_stuck_sim?.value !== undefined) {
          newSettings.try_revive_stuck_sim = properties.try_revive_stuck_sim.value;
        }
        if (properties.hard_reset_on_stuck?.value !== undefined) {
          newSettings.hard_reset_on_stuck = properties.hard_reset_on_stuck.value;
        }
        if (properties.max_revival_attempts?.value !== undefined) {
          newSettings.max_revival_attempts = properties.max_revival_attempts.value;
        }
        if (properties.background_color?.value) {
          const [r, g, b] = properties.background_color.value.split(' ').map(Number);
          newSettings.background_color = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
        }
        if (properties.foreground_color?.value) {
          const [r, g, b] = properties.foreground_color.value.split(' ').map(Number);
          newSettings.foreground_color = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
        }

        console.log("Applying settings:", newSettings);
        setSettings(prev => ({ ...prev, ...newSettings }));
      }
    };
  }
}, []);

  const fibonacci = useCallback((n: number): number => {
    if (n <= 0) return 1;
    if (n === 1) return 1;
    let a = 1, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }, []);

  const generateRandomColor = useCallback((): CellColor => {
    return {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256)
    };
  }, []);

  const generateTweakedColor = useCallback((baseColor: CellColor): CellColor => {
    const channels = ['r', 'g', 'b'] as const;
    const randomChannel = channels[Math.floor(Math.random() * 3)];
    const extremeValue = Math.random() < 0.5 ? 0 : 255;
    
    return {
      ...baseColor,
      [randomChannel]: extremeValue
    };
  }, []);

  const averageColors = useCallback((colors: CellColor[]): CellColor => {
    if (colors.length === 0) return { r: 255, g: 255, b: 255 };
    
    const sum = colors.reduce((acc, color) => ({
      r: acc.r + color.r,
      g: acc.g + color.g,
      b: acc.b + color.b
    }), { r: 0, g: 0, b: 0 });
    
    return {
      r: Math.round(sum.r / colors.length),
      g: Math.round(sum.g / colors.length),
      b: Math.round(sum.b / colors.length)
    };
  }, []);

  const enhanceColorSaturation = useCallback((color: CellColor, age: number): CellColor => {
    const maxAge = settings.max_saturation_age;
    const ageBoost = Math.min(age, maxAge) / maxAge;
    const saturationFactor = 1 + (ageBoost * settings.saturation_factor);
    
    const center = (color.r + color.g + color.b) / 3;
    
    const enhanceChannel = (channel: number) => {
      const distance = channel - center;
      const enhanced = center + (distance * saturationFactor);
      return Math.round(Math.max(0, Math.min(255, enhanced)));
    };
    
    return {
      r: enhanceChannel(color.r),
      g: enhanceChannel(color.g),
      b: enhanceChannel(color.b)
    };
  }, [settings.saturation_factor, settings.max_saturation_age]);

  const averageColorsWeighted = useCallback((colors: CellColor[], ages: number[]): CellColor => {
    if (colors.length === 0) return { r: 255, g: 255, b: 255 };
    if (colors.length !== ages.length) return averageColors(colors);
    
    let totalWeight = 0;
    const weightedSum = colors.reduce((acc, color, index) => {
      const weight = ages[index] || 1;
      totalWeight += weight;
      return {
        r: acc.r + color.r * weight,
        g: acc.g + color.g * weight,
        b: acc.b + color.b * weight
      };
    }, { r: 0, g: 0, b: 0 });
    
    return {
      r: Math.round(weightedSum.r / totalWeight),
      g: Math.round(weightedSum.g / totalWeight),
      b: Math.round(weightedSum.b / totalWeight)
    };
  }, [averageColors]);

  const calculateGridDimensions = useCallback(() => {
    const availableHeight = window.innerHeight - settings.bottom_margin;
    const width = Math.floor(window.innerWidth / (settings.cell_size + settings.cell_padding));
    const height = Math.floor(availableHeight / (settings.cell_size + settings.cell_padding));
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }, [settings.cell_size, settings.cell_padding, settings.bottom_margin]);

  const createRandomGrid = useCallback((width: number, height: number): GridState => {
    return Array(height).fill(null).map(() => 
      Array(width).fill(null).map(() => Math.random() < settings.grid_population_percentage)
    );
  }, [settings.grid_population_percentage]);

  const createRandomColoredGrid = useCallback((width: number, height: number): ColoredGridState => {
    return Array(height).fill(null).map(() => 
      Array(width).fill(null).map(() => {
        const alive = Math.random() < settings.grid_population_percentage;
        return {
          alive,
          color: alive ? generateRandomColor() : undefined,
          age: alive ? 1 : undefined
        };
      })
    );
  }, [generateRandomColor, settings.grid_population_percentage]);

  const countNeighbors = useCallback((grid: GridState, x: number, y: number): number => {
    let count = 0;
    const height = grid.length;
    const width = grid[0].length;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        
        let newX = x + i;
        let newY = y + j;
        
        if (settings.edge_wrapping) {
          newX = (newX + height) % height;
          newY = (newY + width) % width;
        } else {
          if (newX < 0 || newX >= height || newY < 0 || newY >= width) continue;
        }
        
        if (grid[newX][newY]) count++;
      }
    }
    return count;
  }, [settings.edge_wrapping]);

  const countNeighborsColored = useCallback((grid: ColoredGridState, x: number, y: number): { count: number, colors: CellColor[], ages: number[] } => {
    let count = 0;
    const colors: CellColor[] = [];
    const ages: number[] = [];
    const height = grid.length;
    const width = grid[0].length;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        
        let newX = x + i;
        let newY = y + j;
        
        if (settings.edge_wrapping) {
          newX = (newX + height) % height;
          newY = (newY + width) % width;
        } else {
          if (newX < 0 || newX >= height || newY < 0 || newY >= width) continue;
        }
        
        const cell = grid[newX][newY];
        if (cell.alive && cell.color) {
          count++;
          colors.push(cell.color);
          ages.push(cell.age || 1);
        }
      }
    }
    return { count, colors, ages };
  }, [settings.edge_wrapping]);

  const nextGeneration = useCallback((currentGrid: GridState): GridState => {
    const height = currentGrid.length;
    const width = currentGrid[0].length;
    const newGrid: GridState = Array(height).fill(null).map(() => Array(width).fill(false));

    for (let x = 0; x < height; x++) {
      for (let y = 0; y < width; y++) {
        const neighbors = countNeighbors(currentGrid, x, y);
        const isAlive = currentGrid[x][y];

        if (isAlive && (neighbors === 2 || neighbors === 3)) {
          newGrid[x][y] = true;
        } else if (!isAlive && neighbors === 3) {
          newGrid[x][y] = true;
        }
      }
    }

    return newGrid;
  }, [countNeighbors]);

  const nextGenerationColored = useCallback((currentGrid: ColoredGridState): ColoredGridState => {
    const height = currentGrid.length;
    const width = currentGrid[0].length;
    const newGrid: ColoredGridState = Array(height).fill(null).map(() => 
      Array(width).fill(null).map(() => ({ alive: false }))
    );

    for (let x = 0; x < height; x++) {
      for (let y = 0; y < width; y++) {
        const { count, colors, ages } = countNeighborsColored(currentGrid, x, y);
        const isAlive = currentGrid[x][y].alive;
        const currentAge = currentGrid[x][y].age || 1;

        if (isAlive && (count === 2 || count === 3)) {
          const currentColor = currentGrid[x][y].color;
          newGrid[x][y] = {
            alive: true,
            color: currentColor ? enhanceColorSaturation(currentColor, currentAge) : currentColor,
            age: currentAge + 1
          };
        } else if (!isAlive && count === 3) {
          const useRandomColor = Math.random() < settings.random_color_chance;
          
          let cellColor: CellColor;
          if (!useRandomColor) {
            cellColor = averageColorsWeighted(colors, ages);
          } else if (settings.random_color_pure) {
            cellColor = generateRandomColor();
          } else {
            const inheritedColor = averageColorsWeighted(colors, ages);
            cellColor = generateTweakedColor(inheritedColor);
          }
          
          newGrid[x][y] = {
            alive: true,
            color: cellColor,
            age: 1
          };
        }
      }
    }

    return newGrid;
  }, [countNeighborsColored, averageColorsWeighted, generateRandomColor, generateTweakedColor, enhanceColorSaturation, settings.random_color_chance, settings.random_color_pure]);

  const gridToString = useCallback((grid: GridState): string => {
    return grid.map(row => row.map(cell => cell ? '1' : '0').join('')).join('');
  }, []);

  const coloredGridToString = useCallback((grid: ColoredGridState): string => {
    return grid.map(row => row.map(cell => cell.alive ? '1' : '0').join('')).join('');
  }, []);

  const isSimulationStuck = useCallback((grid: GridState | ColoredGridState): boolean => {
    const gridString = settings.color_mode ? 
      coloredGridToString(grid as ColoredGridState) : 
      gridToString(grid as GridState);
    
    const hasLiveCells = settings.color_mode ?
      (grid as ColoredGridState).some(row => row.some(cell => cell.alive)) :
      (grid as GridState).some(row => row.some(cell => cell));
    if (!hasLiveCells) return true;

    if (stateHistoryRef.current.includes(gridString)) return true;

    stateHistoryRef.current.push(gridString);
    if (stateHistoryRef.current.length > 10) {
      stateHistoryRef.current.shift();
    }

    return false;
  }, [gridToString, coloredGridToString, settings.color_mode]);

  const flipRandomCells = useCallback((grid: GridState, count: number): GridState => {
    const height = grid.length;
    const width = grid[0].length;
    const newGrid = grid.map(row => [...row]);
    
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * height);
      const y = Math.floor(Math.random() * width);
      newGrid[x][y] = !newGrid[x][y];
    }
    
    return newGrid;
  }, []);

  const flipRandomCellsColored = useCallback((grid: ColoredGridState, count: number): ColoredGridState => {
    const height = grid.length;
    const width = grid[0].length;
    const newGrid = grid.map(row => [...row]);
    
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * height);
      const y = Math.floor(Math.random() * width);
      const currentCell = newGrid[x][y];
      newGrid[x][y] = {
        alive: !currentCell.alive,
        color: !currentCell.alive ? generateRandomColor() : undefined,
        age: !currentCell.alive ? 1 : undefined
      };
    }
    
    return newGrid;
  }, [generateRandomColor]);

  const drawRoundedRect = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    if (radius === 0) {
      ctx.fillRect(x, y, width, height);
      return;
    }
    
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }, []);

  const renderGrid = useCallback((ctx: CanvasRenderingContext2D, currentGrid: GridState | ColoredGridState, nextGrid?: GridState | ColoredGridState, fadeProgress: number = 1) => {
    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    
    ctx.fillStyle = settings.background_color;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const cellSize = settings.cell_size;
    const padding = settings.cell_padding;
    const cornerRadius = settings.cell_corner_radius;
    
    const hex = settings.foreground_color.replace('#', '');
    const defaultR = parseInt(hex.substring(0, 2), 16);
    const defaultG = parseInt(hex.substring(2, 4), 16);
    const defaultB = parseInt(hex.substring(4, 6), 16);
    
    const gridHeight = currentGrid.length;
    const gridWidth = currentGrid[0].length;
    
    for (let x = 0; x < gridHeight; x++) {
      for (let y = 0; y < gridWidth; y++) {
        const pixelX = y * (cellSize + padding);
        const pixelY = x * (cellSize + padding);
        
        let alpha = 0;
        let r = defaultR, g = defaultG, b = defaultB;
        
        if (settings.color_mode) {
          const currentCell = (currentGrid as ColoredGridState)[x][y];
          const nextCell = nextGrid ? (nextGrid as ColoredGridState)[x][y] : undefined;
          
          if (settings.fade_amount > 0 && nextGrid && nextGrid.length > 0 && isFading) {
            let currentOpacity = 0;
            let currentColor = { r: 0, g: 0, b: 0 };
            
            if (currentCell.alive && currentCell.color) {
              currentOpacity = 1;
              currentColor = currentCell.color;
            } else if (settings.neighbor_opacity_enabled) {
              const { count, colors } = countNeighborsColored(currentGrid as ColoredGridState, x, y);
              if (count > 0) {
                currentOpacity = Math.min(count * settings.neighbor_opacity_increment, 0.8);
                currentColor = averageColors(colors);
              }
            }
            
            let targetOpacity = 0;
            let targetColor = { r: 0, g: 0, b: 0 };
            
            if (nextCell?.alive && nextCell.color) {
              targetOpacity = 1;
              targetColor = nextCell.color;
            } else if (settings.neighbor_opacity_enabled) {
              const { count, colors } = countNeighborsColored(nextGrid as ColoredGridState, x, y);
              if (count > 0) {
                targetOpacity = Math.min(count * settings.neighbor_opacity_increment, 0.8);
                targetColor = averageColors(colors);
              }
            }
            
            alpha = currentOpacity * (1 - fadeProgress) + targetOpacity * fadeProgress;
            r = Math.round(currentColor.r * (1 - fadeProgress) + targetColor.r * fadeProgress);
            g = Math.round(currentColor.g * (1 - fadeProgress) + targetColor.g * fadeProgress);
            b = Math.round(currentColor.b * (1 - fadeProgress) + targetColor.b * fadeProgress);
          } else {
            if (currentCell.alive && currentCell.color) {
              alpha = 1;
              r = currentCell.color.r;
              g = currentCell.color.g;
              b = currentCell.color.b;
            } else if (settings.neighbor_opacity_enabled) {
              const { count, colors } = countNeighborsColored(currentGrid as ColoredGridState, x, y);
              if (count > 0) {
                alpha = Math.min(count * settings.neighbor_opacity_increment, 0.8);
                const avgColor = averageColors(colors);
                r = avgColor.r;
                g = avgColor.g;
                b = avgColor.b;
              }
            }
          }
        } else {
          const currentAlive = (currentGrid as GridState)[x][y];
          const nextAlive = nextGrid ? (nextGrid as GridState)[x][y] : undefined;
          
          if (settings.fade_amount > 0 && nextGrid && nextGrid.length > 0 && isFading) {
            let currentOpacity = 0;
            if (currentAlive) {
              currentOpacity = 1;
            } else if (settings.neighbor_opacity_enabled) {
              const neighborCount = countNeighbors(currentGrid as GridState, x, y);
              if (neighborCount > 0) {
                currentOpacity = Math.min(neighborCount * settings.neighbor_opacity_increment, 0.8);
              }
            }
            
            let targetOpacity = 0;
            if (nextAlive) {
              targetOpacity = 1;
            } else if (settings.neighbor_opacity_enabled) {
              const neighborCount = countNeighbors(nextGrid as GridState, x, y);
              if (neighborCount > 0) {
                targetOpacity = Math.min(neighborCount * settings.neighbor_opacity_increment, 0.8);
              }
            }
            
            alpha = currentOpacity * (1 - fadeProgress) + targetOpacity * fadeProgress;
          } else {
            if (currentAlive) {
              alpha = 1;
            } else if (settings.neighbor_opacity_enabled) {
              const neighborCount = countNeighbors(currentGrid as GridState, x, y);
              if (neighborCount > 0) {
                alpha = Math.min(neighborCount * settings.neighbor_opacity_increment, 0.8);
              }
            }
          }
        }
        
        if (alpha > 0) {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          drawRoundedRect(ctx, pixelX, pixelY, cellSize, cellSize, cornerRadius);
        }
      }
    }
  }, [settings, isFading, countNeighbors, countNeighborsColored, averageColors, drawRoundedRect]);

  const gameLoop = useCallback((timestamp: number) => {
    // Pause when Wallpaper Engine indicates windows are open
    if (window.wallpaperPaused) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || (settings.color_mode ? coloredGrid.length === 0 : grid.length === 0)) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const fadeTime = settings.simulation_speed * settings.fade_amount;
    const stableTime = settings.stable_display_time;
    const totalCycleTime = fadeTime + stableTime;

    if (!isFading && timestamp - lastUpdateRef.current >= totalCycleTime) {
      if (settings.color_mode) {
        const nextGrid = nextGenerationColored(coloredGrid);
        
        if (isSimulationStuck(nextGrid)) {
          const isEmpty = !(nextGrid as ColoredGridState).some(row => row.some(cell => cell.alive));
          
          if (settings.hard_reset_on_stuck) {
            stuckCounterRef.current = 0;
            stateHistoryRef.current = [];
            fibonacciIndexRef.current = 0;
            const newDims = calculateGridDimensions();
            const newGrid = createRandomColoredGrid(newDims.width, newDims.height);
            setColoredGrid(newGrid);
            setTargetColoredGrid([]);
            setIsFading(false);
            lastUpdateRef.current = timestamp;
            return;
          }
          
          if (isEmpty) {
            stuckCounterRef.current = 0;
            stateHistoryRef.current = [];
            fibonacciIndexRef.current = 0;
            const newDims = calculateGridDimensions();
            const newGrid = createRandomColoredGrid(newDims.width, newDims.height);
            setColoredGrid(newGrid);
            setTargetColoredGrid([]);
            setIsFading(false);
            lastUpdateRef.current = timestamp;
            return;
          }
          if (!settings.try_revive_stuck_sim) {
            setTargetColoredGrid(nextGrid);
          } else {
            stuckCounterRef.current++;
            if (stuckCounterRef.current > settings.max_revival_attempts) {
              stuckCounterRef.current = 0;
              stateHistoryRef.current = [];
              fibonacciIndexRef.current = 0;
              const newDims = calculateGridDimensions();
              const newGrid = createRandomColoredGrid(newDims.width, newDims.height);
              setColoredGrid(newGrid);
              setTargetColoredGrid([]);
              setIsFading(false);
              lastUpdateRef.current = timestamp;
              return;
            } else {
              const cellsToFlip = fibonacci(fibonacciIndexRef.current);
              const totalCells = coloredGrid.length * coloredGrid[0].length;
              
              if (cellsToFlip > totalCells / 3) {
                stuckCounterRef.current = 0;
                stateHistoryRef.current = [];
                fibonacciIndexRef.current = 0;
                const newDims = calculateGridDimensions();
                const newGrid = createRandomColoredGrid(newDims.width, newDims.height);
                setColoredGrid(newGrid);
                setTargetColoredGrid([]);
                setIsFading(false);
                lastUpdateRef.current = timestamp;
                return;
              }
              
              const flippedGrid = flipRandomCellsColored(nextGrid, cellsToFlip);
              fibonacciIndexRef.current++;
              setTargetColoredGrid(flippedGrid);
            }
          }
        } else {
          stuckCounterRef.current = 0;
          fibonacciIndexRef.current = 0;
          setTargetColoredGrid(nextGrid);
        }
      } else {
        const nextGrid = nextGeneration(grid);
        
        if (isSimulationStuck(nextGrid)) {
          const isEmpty = !(nextGrid as GridState).some(row => row.some(cell => cell));
          
          if (settings.hard_reset_on_stuck ){
            stuckCounterRef.current = 0;
            stateHistoryRef.current = [];
            fibonacciIndexRef.current = 0;
            const newDims = calculateGridDimensions();
            const newGrid = createRandomGrid(newDims.width, newDims.height);
            setGrid(newGrid);
            setTargetGrid([]);
            setIsFading(false);
            lastUpdateRef.current = timestamp;
            return;
          }
          
          if (isEmpty) {
            stuckCounterRef.current = 0;
            stateHistoryRef.current = [];
            fibonacciIndexRef.current = 0;
            const newDims = calculateGridDimensions();
            const newGrid = createRandomGrid(newDims.width, newDims.height);
            setGrid(newGrid);
            setTargetGrid([]);
            setIsFading(false);
            lastUpdateRef.current = timestamp;
            return;
          }
          if (!settings.try_revive_stuck_sim) {
              setTargetGrid(nextGrid);
          } else {
            stuckCounterRef.current++;
            if (stuckCounterRef.current > settings.max_revival_attempts) {
              stuckCounterRef.current = 0;
              stateHistoryRef.current = [];
              fibonacciIndexRef.current = 0;
              const newDims = calculateGridDimensions();
              const newGrid = createRandomGrid(newDims.width, newDims.height);
              setGrid(newGrid);
              setTargetGrid([]);
              setIsFading(false);
              lastUpdateRef.current = timestamp;
              return;
            } else {
              const cellsToFlip = fibonacci(fibonacciIndexRef.current);
              const totalCells = grid.length * grid[0].length;
              
              if (cellsToFlip > totalCells / 3) {
                stuckCounterRef.current = 0;
                stateHistoryRef.current = [];
                fibonacciIndexRef.current = 0;
                const newDims = calculateGridDimensions();
                const newGrid = createRandomGrid(newDims.width, newDims.height);
                setGrid(newGrid);
                setTargetGrid([]);
                setIsFading(false);
                lastUpdateRef.current = timestamp;
                return;
              }
              
              const flippedGrid = flipRandomCells(nextGrid, cellsToFlip);
              fibonacciIndexRef.current++;
              setTargetGrid(flippedGrid);
            }
          }
        } else {
          stuckCounterRef.current = 0;
          fibonacciIndexRef.current = 0;
          setTargetGrid(nextGrid);
        }
      }

      if (settings.fade_amount > 0 && fadeTime > 0) {
        setIsFading(true);
        fadeStartTimeRef.current = timestamp;
      } else {
        if (settings.color_mode) {
          setColoredGrid(targetColoredGrid.length > 0 ? targetColoredGrid : nextGenerationColored(coloredGrid));
          setTargetColoredGrid([]);
        } else {
          setGrid(targetGrid.length > 0 ? targetGrid : nextGeneration(grid));
          setTargetGrid([]);
        }
      }
      
      lastUpdateRef.current = timestamp;
    }

    if (isFading) {
      const fadeElapsed = timestamp - fadeStartTimeRef.current;
      const fadeProgress = Math.min(fadeElapsed / fadeTime, 1);

      if (settings.color_mode) {
        renderGrid(ctx, coloredGrid, targetColoredGrid, fadeProgress);
      } else {
        renderGrid(ctx, grid, targetGrid, fadeProgress);
      }

      if (fadeProgress >= 1) {
        if (settings.color_mode) {
          setColoredGrid(targetColoredGrid);
          setTargetColoredGrid([]);
        } else {
          setGrid(targetGrid);
          setTargetGrid([]);
        }
        setIsFading(false);
      }
    } else {
      if (settings.color_mode) {
        renderGrid(ctx, coloredGrid);
      } else {
        renderGrid(ctx, grid);
      }
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [grid, coloredGrid, targetGrid, targetColoredGrid, isFading, nextGeneration, nextGenerationColored, isSimulationStuck, flipRandomCells, flipRandomCellsColored, calculateGridDimensions, createRandomGrid, createRandomColoredGrid, renderGrid, settings, fibonacci]);

  // Initialize simulation
  useEffect(() => {
    const initializeSimulation = () => {
      const newDims = calculateGridDimensions();
      setDimensions(newDims);
      
      if (settings.color_mode ? coloredGrid.length === 0 : grid.length === 0) {
        if (settings.color_mode) {
          const initialGrid = createRandomColoredGrid(newDims.width, newDims.height);
          setColoredGrid(initialGrid);
          setTargetColoredGrid([]);
        } else {
          const initialGrid = createRandomGrid(newDims.width, newDims.height);
          setGrid(initialGrid);
          setTargetGrid([]);
        }
        setIsFading(false);
      }
    };

    initializeSimulation();
    window.addEventListener('resize', initializeSimulation);
    return () => window.removeEventListener('resize', initializeSimulation);
  }, [calculateGridDimensions, createRandomGrid, createRandomColoredGrid, grid.length, coloredGrid.length, settings.color_mode]);

  // Reset simulation when grid-affecting settings change
  useEffect(() => {
    if (settings.color_mode ? coloredGrid.length > 0 : grid.length > 0) {
      const newDims = calculateGridDimensions();
      if (settings.color_mode) {
        const newGrid = createRandomColoredGrid(newDims.width, newDims.height);
        setColoredGrid(newGrid);
        setTargetColoredGrid([]);
      } else {
        const newGrid = createRandomGrid(newDims.width, newDims.height);
        setGrid(newGrid);
        setTargetGrid([]);
      }
      setIsFading(false);
      setDimensions(newDims);
      stateHistoryRef.current = [];
      stuckCounterRef.current = 0;
      fibonacciIndexRef.current = 0;
      
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - settings.bottom_margin;
      }
    }
  }, [settings.cell_size, settings.cell_padding, settings.bottom_margin, settings.color_mode, calculateGridDimensions, createRandomGrid, createRandomColoredGrid]);

  // Switch between color and standard modes
  useEffect(() => {
    if (grid.length > 0 || coloredGrid.length > 0) {
      const newDims = calculateGridDimensions();
      if (settings.color_mode) {
        if (coloredGrid.length === 0) {
          const newGrid = createRandomColoredGrid(newDims.width, newDims.height);
          setColoredGrid(newGrid);
          setTargetColoredGrid([]);
          setGrid([]);
          setTargetGrid([]);
        }
      } else {
        if (grid.length === 0) {
          const newGrid = createRandomGrid(newDims.width, newDims.height);
          setGrid(newGrid);
          setTargetGrid([]);
          setColoredGrid([]);
          setTargetColoredGrid([]);
        }
      }
      setIsFading(false);
      stateHistoryRef.current = [];
      stuckCounterRef.current = 0;
      fibonacciIndexRef.current = 0;
    }
  }, [settings.color_mode, calculateGridDimensions, createRandomGrid, createRandomColoredGrid, grid.length, coloredGrid.length]);

  // Start game loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop]);

  // Update canvas size when dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - settings.bottom_margin;
  }, [dimensions, settings.bottom_margin]);

  return (
    <div 
      className="w-screen h-screen overflow-hidden"
      style={{ backgroundColor: settings.background_color }}
    >
      <canvas
        ref={canvasRef}
        className="block"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default App;