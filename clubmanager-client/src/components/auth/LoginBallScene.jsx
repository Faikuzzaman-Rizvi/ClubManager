import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../animations/gsapAnimations';

/**
 * Generates an equirectangular match ball texture with hexagonal leather
 * geometry, club amber accents, and graphite panel detailing.
 */
function useMatchBallTexture() {
  return useMemo(() => {
    const width = 1024;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Pearl white base
    ctx.fillStyle = '#f6f8f7';
    ctx.fillRect(0, 0, width, height);

    const radius = 32;
    const stepX = radius * 1.9;
    const stepY = radius * 1.62;

    const hexagon = (cx, cy, r) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    let row = 0;
    for (let y = -stepY; y < height + stepY; y += stepY) {
      const offset = row % 2 === 0 ? 0 : stepX / 2;
      for (let x = -stepX; x < width + stepX; x += stepX) {
        const cx = x + offset;
        const polar = Math.abs(y - height / 2) / (height / 2);

        // Draw panels with subtle spherical taper
        hexagon(cx, y, radius * (1 - polar * 0.22));

        // Alternate panel colors: deep carbon & pitch emerald
        if ((row + Math.floor(x / stepX)) % 3 === 0) {
          ctx.fillStyle = '#0f171c';
          ctx.fill();
        } else if ((row + Math.floor(x / stepX)) % 5 === 0) {
          ctx.fillStyle = '#183424';
          ctx.fill();
        }

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#e2e7e4';
        ctx.stroke();
      }
      row += 1;
    }

    // Dynamic dual club amber / gold speed stripes
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(0, height * 0.47, width, 6);
    ctx.fillRect(0, height * 0.53, width, 3);

    // Glowing cyan/emerald micro-stripe
    ctx.fillStyle = '#2f9e6a';
    ctx.fillRect(0, height * 0.505, width, 2);
    ctx.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);
}

/**
 * 3D Animated Match Ball with dynamic pointer parallax & floating physics.
 */
function Ball({ reduced, onSpin }) {
  const meshRef = useRef(null);
  const texture = useMatchBallTexture();
  const { viewport } = useThree();
  const spinSpeed = useRef(0.35);

  // Responsive scale proportional to viewport width
  const scale = Math.min(1.4, Math.max(0.9, viewport.width / 5.2));

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || reduced) return;

    // Decay extra spin smoothly
    spinSpeed.current += (0.35 - spinSpeed.current) * 0.04;

    // Constant rotation + extra impulse on interaction
    mesh.rotation.y += delta * spinSpeed.current;
    mesh.rotation.z = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;

    // Smooth pointer parallax tracking
    const targetRotX = state.pointer.y * 0.35;
    const targetPosX = state.pointer.x * 0.25;

    mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.05;
    mesh.position.x += (targetPosX - mesh.position.x) * 0.05;

    // Floating harmonic bounce
    mesh.position.y = Math.sin(state.clock.elapsedTime * 1.4) * 0.12;
  });

  const handleClick = () => {
    // Give playful burst of spin when clicked
    spinSpeed.current = 2.2;
    if (onSpin) onSpin();
  };

  return (
    <mesh
      ref={meshRef}
      castShadow
      scale={scale}
      onClick={handleClick}
      onPointerOver={() => {
        spinSpeed.current = 0.85;
      }}
    >
      <sphereGeometry args={[1, 48, 48]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.4}
        metalness={0.08}
      />
    </mesh>
  );
}

/**
 * Ambient floating particles simulating floodlit stadium atmosphere.
 */
function StadiumMotes({ count = 35 }) {
  const pointsRef = useRef(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      // Deterministic pseudo-random distribution
      const u = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const v = Math.cos(i * 39.346 + 11.135) * 24634.6345;
      const w = Math.sin(i * 73.156 + 45.164) * 31415.9265;
      positions[i * 3] = (u - Math.floor(u) - 0.5) * 6;
      positions[i * 3 + 1] = (v - Math.floor(v) - 0.5) * 4;
      positions[i * 3 + 2] = (w - Math.floor(w) - 0.5) * 4;
    }
    return positions;
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.06;
    pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#d9a441"
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Glowing tactical turf ring below the football.
 */
function TacticalTurfRing() {
  const ringRef = useRef(null);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z -= delta * 0.12;
  });

  return (
    <group position={[0, -1.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Outer Tactical Circle */}
      <mesh ref={ringRef}>
        <ringGeometry args={[1.5, 1.54, 48]} />
        <meshBasicMaterial color="#2f9e6a" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>

      {/* Inner Glow Circle */}
      <mesh>
        <ringGeometry args={[1.1, 1.13, 36]} />
        <meshBasicMaterial color="#d9a441" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Main 3D Football Canvas for the Login Experience.
 */
export default function LoginBallScene() {
  const reduced = prefersReducedMotion();
  const [interactiveNotice, setInteractiveNotice] = useState(false);

  return (
    <div className="auth-canvas-container">
      <Canvas
        dpr={[1, 1.75]}
        shadows
        frameloop={reduced ? 'demand' : 'always'}
        camera={{ position: [0, 0.2, 4.3], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        aria-hidden="true"
        className="auth-three-canvas"
      >
        {/* Stadium Floodlights & Ambient Lighting */}
        <ambientLight intensity={0.65} />
        <directionalLight
          position={[3.8, 4.8, 3.2]}
          intensity={2.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        {/* Emerald pitch bounce light */}
        <directionalLight position={[-4, -1, 1]} intensity={0.9} color="#2f9e6a" />
        {/* Warm club gold rim light */}
        <pointLight position={[-2, 1.8, 2.8]} intensity={14} color="#d9a441" distance={8} />

        <Ball
          reduced={reduced}
          onSpin={() => setInteractiveNotice(true)}
        />
        <TacticalTurfRing />
        {!reduced && <StadiumMotes />}

        <ContactShadows
          position={[0, -1.48, 0]}
          opacity={0.6}
          scale={5.8}
          blur={2.4}
          far={3}
          resolution={512}
          color="#010c07"
          frames={reduced ? 1 : Infinity}
        />
      </Canvas>

      <div className="auth-canvas-hint">
        <span className="auth-hint-pill">
          {interactiveNotice ? '⚡ Interactive match ball! Click to spin' : '⚽ Interactive 3D Match Ball · Hover to steer'}
        </span>
      </div>
    </div>
  );
}
