import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, MeshReflectorMaterial, Sparkles, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import * as THREE from 'three';

const SPEED = 25;
const OBSTACLE_COUNT = 30;
const SCENERY_COUNT = 60;
const LANE_WIDTH = 3;

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const resetGame = () => {
    setPlaying(true);
    setGameOver(false);
    setScore(0);
  };

  return (
    <div className="w-full h-screen bg-slate-950 font-sans select-none overflow-hidden relative text-white flex flex-col">
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-center pointer-events-none mix-blend-screen">
        <h1 className="text-2xl md:text-4xl font-black tracking-[0.2em] text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
           VOIDSURFER
        </h1>
        <div className="text-right">
          <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Distance</p>
          <p className="text-3xl md:text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            {Math.floor(score)}<span className="text-lg text-cyan-500 ml-1">m</span>
          </p>
        </div>
      </div>

      {!playing && !gameOver && (
        <div className="absolute inset-0 bg-slate-950/80 z-20 flex flex-col justify-center items-center backdrop-blur-md">
          <h2 className="text-5xl md:text-8xl font-black mb-4 text-white drop-shadow-[0_0_30px_rgba(34,211,238,0.5)] tracking-tighter uppercase text-center leading-none">
            Welcome to<br/><span className="text-cyan-400">The Grid</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl text-center leading-relaxed font-light px-6">
            A high-fidelity 3D experience with realistic lighting, procedural environments, and advanced post-processing.
            <br/><br/>
            <strong className="text-white font-bold tracking-widest uppercase">Controls:</strong> A/D or Left/Right arrows to dodge.
          </p>
          <button 
            onClick={resetGame}
            className="px-10 py-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xl md:text-2xl uppercase tracking-[0.2em] rounded-full shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all duration-300 transform hover:scale-105 active:scale-95 outline-none focus:ring-4 focus:ring-cyan-300 pointer-events-auto cursor-pointer"
          >
            Initiate Link
          </button>
        </div>
      )}

      {gameOver && (
        <div className="absolute inset-0 bg-red-950/90 z-20 flex flex-col justify-center items-center backdrop-blur-md">
          <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
          <h2 className="text-6xl md:text-9xl font-black mb-4 text-white drop-shadow-[0_0_40px_rgba(239,68,68,0.8)] tracking-widest relative z-10">
            CRASHED
          </h2>
          <p className="text-2xl md:text-4xl text-red-300 mb-10 font-bold uppercase tracking-widest relative z-10">
            Distance: {Math.floor(score)}m
          </p>
          <button 
            onClick={resetGame}
            className="px-10 py-5 bg-white text-red-900 font-black text-xl md:text-2xl uppercase tracking-[0.2em] rounded-full shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all duration-300 transform hover:scale-105 active:scale-95 outline-none focus:ring-4 focus:ring-red-400 pointer-events-auto cursor-pointer relative z-10"
          >
            Reset System
          </button>
        </div>
      )}

      <Canvas shadows dpr={[1, 2]} gl={{ antialias: false, powerPreference: "high-performance" }} className="flex-1 w-full h-full">
        <PerspectiveCamera makeDefault position={[0, 4, 10]} fov={60} />
        <color attach="background" args={['#020617']} />
        <fog attach="fog" args={['#020617', 10, 80]} />
        
        <ambientLight intensity={0.2} />
        <directionalLight 
          castShadow 
          position={[20, 30, 10]} 
          intensity={2} 
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={1}
          shadow-camera-far={100}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
          shadow-bias={-0.0001}
        />
        <pointLight position={[-10, 5, -20]} intensity={2} color="#22d3ee" distance={50} />
        <pointLight position={[10, 5, -20]} intensity={2} color="#db2777" distance={50} />

        <Environment preset="night" />
        <Sparkles count={800} scale={50} size={4} speed={0.4} color="#22d3ee" position={[0, 10, -20]} />

        {/* High Resolution Reflective Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -20]} receiveShadow>
          <planeGeometry args={[100, 200]} />
          <MeshReflectorMaterial 
            blur={[400, 100]}
            resolution={1024}
            mixBlur={1}
            mixStrength={80}
            roughness={0.15}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#0f172a"
            metalness={0.9}
            mirror={1}
            transparent
            opacity={0.9}
          />
        </mesh>
        
        {/* Animated Grid Lines */}
        <gridHelper args={[100, 100, '#0ea5e9', '#1e293b']} position={[0, -0.49, -20]} />

        {/* Background Scenery Blocks */}
        <Scenery />

        {playing && <GameLoop setGameOver={setGameOver} setScore={setScore} />}

        {/* Advanced Post Processing */}
        <EffectComposer multisampling={4}>
          <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} height={300} intensity={2.0} mipmapBlur />
          <Vignette eskil={false} offset={0.1} darkness={1.3} />
          <ToneMapping />
        </EffectComposer>
      </Canvas>
      
      {/* Mobile Touch Controls */}
      <div className="absolute bottom-10 left-0 w-full flex justify-between px-6 z-10 md:hidden pointer-events-none">
        <button id="btn-left" aria-label="Move Left" className="w-24 h-24 bg-white/5 rounded-full backdrop-blur-md pointer-events-auto active:bg-cyan-500/30 border border-white/10 flex items-center justify-center text-white/40 shadow-xl transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button id="btn-right" aria-label="Move Right" className="w-24 h-24 bg-white/5 rounded-full backdrop-blur-md pointer-events-auto active:bg-cyan-500/30 border border-white/10 flex items-center justify-center text-white/40 shadow-xl transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  );
}

// Background Scenic Buildings
function Scenery() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const meshRef2 = useRef<THREE.InstancedMesh>(null); // For wireframes
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (meshRef.current && meshRef2.current) {
      for (let i = 0; i < SCENERY_COUNT; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        dummy.position.set(
          side * (15 + Math.random() * 30),
          Math.random() * 5 + 2,
          -Math.random() * 150 + 20
        );
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.scale.set(Math.random() * 4 + 2, Math.random() * 30 + 10, Math.random() * 4 + 2);
        dummy.updateMatrix();
        
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, new THREE.Color(Math.random() > 0.5 ? '#1e293b' : '#0f172a'));
        
        meshRef2.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
      
      meshRef2.current.instanceMatrix.needsUpdate = true;
    }
  }, [dummy]);

  useFrame((_, delta) => {
    if (meshRef.current && meshRef2.current) {
        const speed = SPEED;
        let p = new THREE.Vector3();
        let s = new THREE.Vector3();
        let q = new THREE.Quaternion();
        
        for (let i = 0; i < SCENERY_COUNT; i++) {
            meshRef.current.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(p, q, s);
            
            p.z += speed * delta * 0.8; // Parallax effect
            if (p.z > 20) {
              p.z -= 150;
              p.x = (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 30);
              s.set(Math.random() * 4 + 2, Math.random() * 30 + 10, Math.random() * 4 + 2);
            }
            
            dummy.position.copy(p);
            dummy.quaternion.copy(q);
            dummy.scale.copy(s);
            dummy.updateMatrix();
            
            meshRef.current.setMatrixAt(i, dummy.matrix);
            meshRef2.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        meshRef2.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, SCENERY_COUNT]} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial roughness={0.2} metalness={0.8} />
      </instancedMesh>
      <instancedMesh ref={meshRef2} args={[undefined, undefined, SCENERY_COUNT]}>
        <boxGeometry />
        <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.15} />
      </instancedMesh>
    </group>
  );
}

function GameLoop({ setGameOver, setScore }: { setGameOver: (s: boolean) => void, setScore: (s: (prev: number) => number) => void }) {
  const playerRef = useRef<THREE.Group>(null);
  const shipModelRef = useRef<THREE.Mesh>(null);
  const obstaclesGroupRef = useRef<THREE.Group>(null);
  
  const targetX = useRef(0);
  const currentSpeed = useRef(SPEED);
  const engineGlowRef = useRef<THREE.PointLight>(null);

  // Initialize Obstacles
  const obstaclesData = useMemo(() => {
    return Array.from({ length: OBSTACLE_COUNT }, (_, i) => ({
      position: new THREE.Vector3(
        (Math.floor(Math.random() * 3) - 1) * LANE_WIDTH,
        1,
        -20 - i * 8 - Math.random() * 5
      ),
      type: Math.floor(Math.random() * 3), // 0: cube, 1: wide wall, 2: tall pillar
      color: Math.random() > 0.5 ? '#f43f5e' : '#f59e0b',
      rotSpeed: (Math.random() - 0.5) * 2
    }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'a' || e.key === 'ArrowLeft') targetX.current = Math.max(-LANE_WIDTH, targetX.current - LANE_WIDTH);
        if (e.key === 'd' || e.key === 'ArrowRight') targetX.current = Math.min(LANE_WIDTH, targetX.current + LANE_WIDTH);
    };

    const handleLeft = () => targetX.current = Math.max(-LANE_WIDTH, targetX.current - LANE_WIDTH);
    const handleRight = () => targetX.current = Math.min(LANE_WIDTH, targetX.current + LANE_WIDTH);

    window.addEventListener('keydown', handleKeyDown);
    
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    btnLeft?.addEventListener('pointerdown', handleLeft);
    btnRight?.addEventListener('pointerdown', handleRight);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        btnLeft?.removeEventListener('pointerdown', handleLeft);
        btnRight?.removeEventListener('pointerdown', handleRight);
    };
  }, []);

  useFrame((state, delta) => {
    // Escalate difficulty safely up to a cap
    currentSpeed.current = Math.min(SPEED + state.clock.elapsedTime * 0.2, SPEED * 2.5);

    // Smooth Player Movement
    if (playerRef.current && shipModelRef.current) {
        playerRef.current.position.x = THREE.MathUtils.lerp(playerRef.current.position.x, targetX.current, 15 * delta);
        
        // Hovering Effect
        playerRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.15;
        
        // Banking effect based on movement
        const bank = (playerRef.current.position.x - targetX.current) * 0.3;
        shipModelRef.current.rotation.z = THREE.MathUtils.lerp(shipModelRef.current.rotation.z, bank, 10 * delta);
        shipModelRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 4) * 0.05; // slight pitch
        
        // Engine pulse
        if (engineGlowRef.current) {
            engineGlowRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 20) * 0.5;
        }
    }

    // Move Obstacles & Collision Detection
    // We construct a slightly smaller box for the player for fairer hitboxes
    const playerBox = new THREE.Box3();
    if (playerRef.current) {
        playerBox.setFromObject(playerRef.current);
        playerBox.expandByScalar(-0.3); // Tolerance
    }

    if (obstaclesGroupRef.current) {
        obstaclesGroupRef.current.children.forEach((obs, index) => {
             // Move towards camera
             obs.position.z += currentSpeed.current * delta;
             
             // Spin obstalces slightly
             const data = obstaclesData[index];
             if (data.type === 0) {
                 obs.rotation.x += data.rotSpeed * delta;
                 obs.rotation.y += data.rotSpeed * delta;
             }

             // Check Collision
             const obsBox = new THREE.Box3().setFromObject(obs);
             obsBox.expandByScalar(-0.2); // Tolerance

             if (obsBox.intersectsBox(playerBox) && obs.position.z < 2 && obs.position.z > -2) {
                 setGameOver(true);
             }

             // Recycle Obstacle
             if (obs.position.z > 5) {
                 // Move far back
                 const maxZ = Math.min(...obstaclesGroupRef.current.children.map(c => c.position.z));
                 obs.position.z = maxZ - (8 + Math.random() * 5);
                 obs.position.x = (Math.floor(Math.random() * 3) - 1) * LANE_WIDTH;
             }
        });
    }

    // Update Score
    setScore(s => s + (currentSpeed.current * delta * 0.5));
  });

  return (
    <>
        <group ref={playerRef} position={[0, 1, 0]}>
            {/* The Ship */}
            <mesh ref={shipModelRef} castShadow receiveShadow>
                <coneGeometry args={[0.8, 2.5, 4]} />
                <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={1.0} envMapIntensity={3} />
                
                {/* Glowing Core / Engine */}
                <mesh position={[0, -1, 0]}>
                   <sphereGeometry args={[0.4, 16, 16]} />
                   <meshBasicMaterial color="#22d3ee" />
                </mesh>
                <pointLight ref={engineGlowRef} color="#22d3ee" position={[0, -1.5, 0]} intensity={2} distance={10} />
            </mesh>
            
            {/* Attached Spotlight cutting through fog */}
            <spotLight position={[0, 1, 1]} angle={0.5} penumbra={0.8} intensity={5} color="#e0f2fe" distance={50} castShadow target-position={[0, 0, -20]} />
        </group>
        
        {/* Dynamic Obstacles */}
        <group ref={obstaclesGroupRef}>
             {obstaclesData.map((data, i) => (
                 <mesh key={i} position={data.position} castShadow receiveShadow>
                     {data.type === 0 && <boxGeometry args={[1.8, 1.8, 1.8]} />}
                     {data.type === 1 && <boxGeometry args={[LANE_WIDTH * 1.5, 1, 1]} />}
                     {data.type === 2 && <boxGeometry args={[1, 4, 1]} />}
                     
                     <meshStandardMaterial 
                       color={data.color} 
                       emissive={data.color} 
                       emissiveIntensity={0.6} 
                       roughness={0.2} 
                       metalness={0.8} 
                     />
                     <pointLight color={data.color} intensity={1} distance={5} />
                 </mesh>
             ))}
        </group>
    </>
  );
}

