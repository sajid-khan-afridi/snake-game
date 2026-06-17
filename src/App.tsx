import { Pause, Play, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Maximize } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

const SNAKE_COLORS = [
  { id: 'blue', head: '#60a5fa', body: '#3b82f6', rgb: '59, 130, 246', bgClass: 'bg-blue-500' },
  { id: 'green', head: '#4ade80', body: '#22c55e', rgb: '34, 197, 94', bgClass: 'bg-green-500' },
  { id: 'purple', head: '#c084fc', body: '#a855f7', rgb: '168, 85, 247', bgClass: 'bg-purple-500' },
  { id: 'yellow', head: '#fde047', body: '#eab308', rgb: '234, 179, 8', bgClass: 'bg-yellow-500' },
  { id: 'cyan', head: '#2dd4bf', body: '#14b8a6', rgb: '20, 184, 166', bgClass: 'bg-teal-500' },
];

const GRID_SIZE = 20;
const BASE_SPEED_MS = 150;
const MIN_SPEED_MS = 60;
const SPEED_DECREMENT = 10;
const FRUITS_PER_SPEEDUP = 5;

type Point = { x: number; y: number };
type GameStatus = 'start' | 'playing' | 'paused' | 'gameover';

type GameState = {
  snake: Point[];
  dir: Point;
  nextDir: Point;
  fruit: Point;
  score: number;
  highScore: number;
  status: GameStatus;
  speed: number;
  fruitsEaten: number;
  lastTime: number;
  flash: number;
  snakeColor: typeof SNAKE_COLORS[0];
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const [uiScore, setUiScore] = useState(0);
  const [uiHighScore, setUiHighScore] = useState(
    parseInt(localStorage.getItem('snake-high') || '0')
  );
  const [uiStatus, setUiStatus] = useState<GameStatus>('start');
  const [uiColor, setUiColor] = useState(SNAKE_COLORS[0]);

  const state = useRef<GameState>({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    dir: { x: 0, y: -1 },
    nextDir: { x: 0, y: -1 },
    fruit: { x: 5, y: 5 },
    score: 0,
    highScore: uiHighScore,
    status: 'start',
    speed: BASE_SPEED_MS,
    fruitsEaten: 0,
    lastTime: performance.now(),
    flash: 0,
    snakeColor: SNAKE_COLORS[0],
  });

  const getValidFruitPosition = (currentSnake: Point[]): Point => {
    let newFruit: Point = { x: 0, y: 0 };
    let overlapping = true;
    while (overlapping) {
      newFruit = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // Ensure the fruit does not spawn inside the snake body
      // eslint-disable-next-line no-loop-func
      overlapping = currentSnake.some(seg => seg.x === newFruit.x && seg.y === newFruit.y);
    }
    return newFruit;
  };

  const resetGame = () => {
    state.current = {
      ...state.current,
      snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
      dir: { x: 0, y: -1 },
      nextDir: { x: 0, y: -1 },
      score: 0,
      status: 'playing',
      speed: BASE_SPEED_MS,
      fruitsEaten: 0,
      lastTime: performance.now(),
      flash: 0,
    };
    state.current.fruit = getValidFruitPosition(state.current.snake);
    setUiScore(0);
    setUiStatus('playing');
  };

  const endGame = () => {
    state.current.status = 'gameover';
    setUiStatus('gameover');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const togglePause = () => {
    const current = state.current.status;
    if (current === 'playing') {
      state.current.status = 'paused';
      setUiStatus('paused');
    } else if (current === 'paused') {
      state.current.status = 'playing';
      setUiStatus('playing');
    }
  };

  const handleDirBtn = (dx: number, dy: number) => {
    const s = state.current;
    if (s.status !== 'playing') return;
    if (dx !== 0 && s.dir.x === -dx) return;
    if (dy !== 0 && s.dir.y === -dy) return;
    s.nextDir = { x: dx, y: dy };
  };

  const updateGame = () => {
    const s = state.current;

    s.dir = s.nextDir;
    const head = s.snake[0];
    const newHead = { x: head.x + s.dir.x, y: head.y + s.dir.y };

    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      endGame();
      return;
    }

    if (s.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      endGame();
      return;
    }

    s.snake.unshift(newHead);

    if (newHead.x === s.fruit.x && newHead.y === s.fruit.y) {
      s.score += 10;
      s.fruitsEaten += 1;
      s.flash = 6; 
      
      setUiScore(s.score);
      if (s.score > s.highScore) {
        s.highScore = s.score;
        localStorage.setItem('snake-high', s.highScore.toString());
        setUiHighScore(s.highScore);
      }

      const drops = Math.floor(s.fruitsEaten / FRUITS_PER_SPEEDUP);
      s.speed = Math.max(MIN_SPEED_MS, BASE_SPEED_MS - (drops * SPEED_DECREMENT));
      
      s.fruit = getValidFruitPosition(s.snake);
    } else {
      s.snake.pop();
    }
  };

  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cellW = w / GRID_SIZE;
    const cellH = h / GRID_SIZE;
    const s = state.current;

    ctx.fillStyle = '#020617'; // bg-slate-950
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1e293b'; // faint grid
    ctx.lineWidth = 1;
    for (let i = 0; i <= w; i += cellW) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let j = 0; j <= h; j += cellH) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
    }

    // Fruit
    ctx.fillStyle = '#ef4444'; // red-500
    const fx = s.fruit.x * cellW;
    const fy = s.fruit.y * cellH;
    ctx.fillRect(fx + 2, fy + 2, cellW - 4, cellH - 4);

    // Snake
    s.snake.forEach((segment, index) => {
        const x = segment.x * cellW;
        const y = segment.y * cellH;

        ctx.fillStyle = index === 0 ? s.snakeColor.head : s.snakeColor.body;
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

        // Eyes for the head
        if (index === 0) {
            ctx.fillStyle = '#000000';
            const eyeSize = Math.max(2, Math.floor(cellW / 5) - 1);
            let e1x, e1y, e2x, e2y;
            
            if (s.dir.x === 1) { // right
                e1x = x + cellW - eyeSize - 2; e1y = y + 4;
                e2x = x + cellW - eyeSize - 2; e2y = y + cellH - eyeSize - 4;
            } else if (s.dir.x === -1) { // left
                e1x = x + 2; e1y = y + 4;
                e2x = x + 2; e2y = y + cellH - eyeSize - 4;
            } else if (s.dir.y === 1) { // down
                e1x = x + 4; e1y = y + cellH - eyeSize - 2;
                e2x = x + cellW - eyeSize - 4; e2y = y + cellH - eyeSize - 2;
            } else { // up
                e1x = x + 4; e1y = y + 2;
                e2x = x + cellW - eyeSize - 4; e2y = y + 2;
            }
            ctx.fillRect(e1x, e1y, eyeSize, eyeSize);
            ctx.fillRect(e2x, e2y, eyeSize, eyeSize);
        }
    });

    // Eat animation tint flash
    if (s.flash > 0) {
        ctx.fillStyle = `rgba(${s.snakeColor.rgb}, ${s.flash * 0.05})`;
        ctx.fillRect(0, 0, w, h);
        s.flash--;
    }
  };

  useEffect(() => {
    const tick = (time: number) => {
      requestRef.current = requestAnimationFrame(tick);
      const s = state.current;
      
      if (s.status !== 'playing') {
        s.lastTime = time; 
        return;
      }

      const dt = time - s.lastTime;
      if (dt >= s.speed) {
        // Prevent massive frame dumps if window is backgrounded by only consuming one tick's worth
        s.lastTime = Math.max(time - (dt % s.speed), time - s.speed);
        updateGame();
      }
      drawGame();
    };
    
    // Initial draw to paint the grid before start
    drawGame(); 
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const s = state.current;

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter'].includes(key)) {
        e.preventDefault();
      }

      if (key === 'escape' || key === 'p' || key === ' ') {
        if (s.status === 'playing' || s.status === 'paused') {
          togglePause();
          return;
        }
      }

      if (s.status !== 'playing') {
        if (['enter', ' ', 'w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
          if (s.status === 'start' || s.status === 'gameover') {
            resetGame();
            
            // Allow immediate direction change on start
            if (key === 'arrowup' || key === 'w') state.current.nextDir = { x: 0, y: -1 };
            if (key === 'arrowdown' || key === 's') state.current.nextDir = { x: 0, y: 1 };
            if (key === 'arrowleft' || key === 'a') state.current.nextDir = { x: -1, y: 0 };
            if (key === 'arrowright' || key === 'd') state.current.nextDir = { x: 1, y: 0 };
          }
        }
        return;
      }

      const curDir = s.dir;
      if ((key === 'arrowup' || key === 'w') && curDir.y !== 1) s.nextDir = { x: 0, y: -1 };
      if ((key === 'arrowdown' || key === 's') && curDir.y !== -1) s.nextDir = { x: 0, y: 1 };
      if ((key === 'arrowleft' || key === 'a') && curDir.x !== 1) s.nextDir = { x: -1, y: 0 };
      if ((key === 'arrowright' || key === 'd') && curDir.x !== -1) s.nextDir = { x: 1, y: 0 };
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false, capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  // Force first draw so it's not a black screen on boot
  useEffect(() => {
      drawGame();
  }, [])

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      onClick={() => containerRef.current?.focus()}
      className="fixed inset-0 w-full h-full bg-slate-900 flex justify-center items-center font-['Helvetica_Neue',Arial,sans-serif] touch-none select-none text-slate-50 overflow-hidden pt-safe pb-safe focus:outline-none"
    >
      <div className="w-full max-w-5xl h-full md:max-h-[768px] md:border border-slate-700 flex flex-col items-center p-4 sm:p-6 md:p-6 box-border">

        {/* Dashboard / HUD */}
        <header className="w-full flex justify-between items-center mb-5 shrink-0 px-4 sm:px-6 py-3 bg-slate-800 rounded-lg border-b-4 transition-colors" style={{ borderColor: uiColor.body }}>
          <h1 className="m-0 text-xl sm:text-2xl tracking-[2px] font-black shrink-0 uppercase transition-colors" style={{ color: uiColor.head }}>
            NEON SNAKE <small className="text-[10px] opacity-50 tracking-normal ml-1 align-baseline">V1.0</small>
          </h1>
          
          <div className="flex items-center gap-6 sm:gap-10">
            <div className="text-center flex flex-col items-center">
              <div className="text-[10px] uppercase text-slate-400 tracking-[1px]">Score</div>
              <div className="font-mono text-xl sm:text-2xl font-bold leading-none" aria-label="Current Score">{uiScore.toString().padStart(3, '0')}</div>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="text-[10px] uppercase text-slate-400 tracking-[1px]">High Score</div>
              <div className="font-mono text-xl sm:text-2xl font-bold leading-none" aria-label="High Score">{uiHighScore.toString().padStart(3, '0')}</div>
            </div>
          </div>
        </header>

        {/* Screen / Canvas Area */}
        <div className="relative w-full shrink-0 flex justify-center mb-5">
             <div className="relative w-full max-w-[520px] aspect-square border-4 border-slate-800 bg-slate-950 shadow-[0_0_40px_rgba(0,0,0,0.5)] shrink-0">
                <canvas 
                    ref={canvasRef} 
                    width={500} 
                    height={500} 
                    className="w-full h-full object-contain block"
                    style={{ imageRendering: 'pixelated' }}
                />

                {/* Overlays */}
                {uiStatus === 'start' && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-10 transition-opacity">
                        <h2 className="text-5xl font-bold text-white mb-2 tracking-normal drop-shadow-none">SNAKE</h2>
                        
                        <div className="flex gap-3 my-4 mb-8">
                           {SNAKE_COLORS.map(c => (
                               <button 
                                 key={c.id} 
                                 aria-label={`Select ${c.id} color`}
                                 onPointerDown={(e) => { 
                                   e.preventDefault(); 
                                   e.stopPropagation(); 
                                   setUiColor(c); 
                                   state.current.snakeColor = c;
                                   drawGame();
                                 }}
                                 className={`w-8 h-8 rounded-full ${c.bgClass} border-2 ${uiColor.id === c.id ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent opacity-50 hover:opacity-80'} transition-all cursor-pointer outline-none focus:ring-2 focus:ring-slate-400`}
                               />
                           ))}
                        </div>

                        <button 
                          onPointerDown={(e) => { e.preventDefault(); resetGame(); }} 
                          className="px-8 py-3 transition-colors text-white font-bold rounded uppercase tracking-[1px] shadow-none text-lg border-none cursor-pointer hover:brightness-110 active:brightness-90 outline-none"
                          style={{ backgroundColor: uiColor.body }}
                        >
                        Start Game
                        </button>
                    </div>
                )}

                {uiStatus === 'paused' && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 z-10 transition-opacity">
                        <h2 className="text-5xl font-bold text-white mb-2 uppercase drop-shadow-none tracking-normal">PAUSED</h2>
                        <p className="mb-6 text-slate-400">Ready?</p>
                        <button 
                          onPointerDown={(e) => { e.preventDefault(); togglePause(); }} 
                          className="px-8 py-3 transition-colors text-white font-bold rounded uppercase tracking-[1px] shadow-none text-lg border-none cursor-pointer hover:brightness-110 active:brightness-90 outline-none"
                          style={{ backgroundColor: uiColor.body }}
                        >
                        Resume Game
                        </button>
                    </div>
                )}

                {uiStatus === 'gameover' && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 z-20 transition-opacity">
                        <h2 className="text-5xl font-bold text-white mb-2 uppercase drop-shadow-none tracking-normal">GAME OVER</h2>
                        <p className="mb-4 text-slate-400">Final Score: {uiScore}</p>
                        
                        <div className="flex gap-3 my-2 mb-8">
                           {SNAKE_COLORS.map(c => (
                               <button 
                                 key={c.id} 
                                 aria-label={`Select ${c.id} color`}
                                 onPointerDown={(e) => { 
                                   e.preventDefault(); 
                                   e.stopPropagation(); 
                                   setUiColor(c); 
                                   state.current.snakeColor = c;
                                   drawGame();
                                 }}
                                 className={`w-6 h-6 rounded-full ${c.bgClass} border-2 ${uiColor.id === c.id ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent opacity-50 hover:opacity-80'} transition-all cursor-pointer outline-none focus:ring-2 focus:ring-slate-400`}
                               />
                           ))}
                        </div>

                        <button 
                          onPointerDown={(e) => { e.preventDefault(); resetGame(); }} 
                          className="px-8 py-3 transition-colors text-white font-bold rounded uppercase tracking-[1px] shadow-none text-lg border-none cursor-pointer hover:brightness-110 active:brightness-90 flex items-center justify-center gap-2 outline-none"
                          style={{ backgroundColor: uiColor.body }}
                        >
                            <RotateCcw className="w-5 h-5 flex-shrink-0" /> Play Again
                        </button>
                    </div>
                )}
             </div>
        </div>

        {/* Controls Section */}
        <div className="mt-auto w-full max-w-[520px] mx-auto flex justify-between items-end gap-2 pb-4">
            <div className="hidden sm:block text-xs text-slate-500 leading-relaxed">
              <b>CONTROLS</b><br/>
              <span className="text-slate-400 font-mono bg-slate-800 px-1 py-0.5 rounded-sm">WASD</span> or <span className="text-slate-400 font-mono bg-slate-800 px-1 py-0.5 rounded-sm">ARROWS</span> to move<br/>
              <span className="text-slate-400 font-mono bg-slate-800 px-1 py-0.5 rounded-sm">SPACE</span> or <span className="text-slate-400 font-mono bg-slate-800 px-1 py-0.5 rounded-sm">P</span> to pause<br/>
            </div>

            <div className="grid grid-cols-3 grid-rows-2 gap-2 mx-auto sm:mx-0">
                <button 
                  aria-label="Move Up"
                  onPointerDown={(e) => { e.preventDefault(); handleDirBtn(0, -1); }} 
                  className="w-[60px] h-[60px] bg-slate-700 rounded-lg flex items-center justify-center text-white font-bold active:bg-slate-600 col-start-2 row-start-1 focus:outline-none"
                >
                   <ChevronUp className="w-8 h-8" />
                </button>
                <button 
                  aria-label="Move Left"
                  onPointerDown={(e) => { e.preventDefault(); handleDirBtn(-1, 0); }} 
                  className="w-[60px] h-[60px] bg-slate-700 rounded-lg flex items-center justify-center text-white font-bold active:bg-slate-600 col-start-1 row-start-2 focus:outline-none"
                >
                   <ChevronLeft className="w-8 h-8" />
                </button>

                <button 
                  aria-label="Move Down"
                  onPointerDown={(e) => { e.preventDefault(); handleDirBtn(0, 1); }} 
                  className="w-[60px] h-[60px] bg-slate-700 rounded-lg flex items-center justify-center text-white font-bold active:bg-slate-600 col-start-2 row-start-2 focus:outline-none"
                >
                   <ChevronDown className="w-8 h-8" />
                </button>

                <button 
                  aria-label="Move Right"
                  onPointerDown={(e) => { e.preventDefault(); handleDirBtn(1, 0); }} 
                  className="w-[60px] h-[60px] bg-slate-700 rounded-lg flex items-center justify-center text-white font-bold active:bg-slate-600 col-start-3 row-start-2 focus:outline-none"
                >
                   <ChevronRight className="w-8 h-8" />
                </button>
            </div>

            <div className="w-[150px] text-right hidden sm:flex items-center justify-end gap-2">
              <button 
                onClick={toggleFullscreen} 
                aria-label="Toggle Fullscreen"
                className="p-2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors focus:outline-2 focus:outline-blue-400 focus:outline-offset-2 cursor-pointer rounded-md"
              >
                <Maximize className="w-5 h-5" />
              </button>
              <button 
                onClick={togglePause} 
                aria-label={uiStatus === 'paused' ? 'Resume Game' : 'Pause Game'}
                className="px-4 py-2 text-sm bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700 transition-colors focus:outline-2 focus:outline-blue-400 focus:outline-offset-2 cursor-pointer disabled:opacity-50 rounded-md"
                disabled={uiStatus === 'start' || uiStatus === 'gameover'}
              >
                {uiStatus === 'paused' ? 'Resume' : 'Pause'}
              </button>
            </div>
        </div>

      </div>
    </div>
  );
}
