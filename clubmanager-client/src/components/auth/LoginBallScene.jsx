import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../animations/gsapAnimations';

import {
  getTriondaBallTexture,
  getTriondaBallBumpTexture,
  getStadiumTurfTexture,
} from '../landing/triondaBallTexture';

/**
 * 3D Official Adidas FIFA 2026 Trionda Match Ball.
 * Rendered with high-response polyurethane clearcoat, authentic Scarlet Red,
 * Royal Blue, and Emerald Green panels, with 360° interactive touch/mouse drag.
 */
function TriondaLoginBall({ reduced, onInteract }) {
  const meshRef = useRef(null);
  const isDragging = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const ballRotation = useRef({ x: 0.16, y: 0.84 });
  const spinImpulse = useRef(0.42);
  const [hovered, setHovered] = useState(false);

  const ballTexture = useMemo(() => getTriondaBallTexture(), []);
  const bumpTexture = useMemo(() => getTriondaBallBumpTexture(), []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = state.clock.elapsedTime;
    const targetScale = hovered ? 0.86 : 0.82;

    if (reduced) {
      mesh.position.set(0, 0.06, 0);
      mesh.scale.set(targetScale, targetScale, targetScale);
      mesh.rotation.set(0.16, 0.84, 0);
      return;
    }

    // Pointer interactive parallax tilt & smooth resting float
    const targetX = state.pointer.x * 0.12;
    const targetY = 0.06 + Math.sin(t * 2.0) * 0.02;

    mesh.position.x += (targetX - mesh.position.x) * 0.06;
    mesh.position.y += (targetY - mesh.position.y) * 0.08;

    mesh.scale.x += (targetScale - mesh.scale.x) * 0.1;
    mesh.scale.y += (targetScale - mesh.scale.y) * 0.1;
    mesh.scale.z += (targetScale - mesh.scale.z) * 0.1;

    // Smooth idle spin unless being dragged by user
    if (!isDragging.current) {
      spinImpulse.current = THREE.MathUtils.damp(spinImpulse.current, 0.38, 1.5, delta);
      ballRotation.current.y += delta * spinImpulse.current;
      ballRotation.current.x = 0.14 + Math.sin(t * 0.7) * 0.04;
    }

    mesh.rotation.y = ballRotation.current.y;
    mesh.rotation.x = ballRotation.current.x;
  });

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      position={[0, 0.06, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        isDragging.current = true;
        prevMousePos.current = { x: e.clientX, y: e.clientY };
        if (onInteract) onInteract();
      }}
      onPointerUp={() => {
        isDragging.current = false;
      }}
      onPointerLeave={() => {
        isDragging.current = false;
        setHovered(false);
      }}
      onPointerMove={(e) => {
        if (!isDragging.current) return;
        const dx = e.clientX - prevMousePos.current.x;
        const dy = e.clientY - prevMousePos.current.y;
        ballRotation.current.y += dx * 0.012;
        ballRotation.current.x += dy * 0.012;
        prevMousePos.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        e.stopPropagation();
        spinImpulse.current = 2.4;
        if (onInteract) onInteract();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'grab';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhysicalMaterial
        map={ballTexture}
        bumpMap={bumpTexture}
        bumpScale={0.035}
        roughness={0.28}
        metalness={0.06}
        clearcoat={0.68}
        clearcoatRoughness={0.16}
        reflectivity={0.65}
      />
    </mesh>
  );
}

/**
 * Authentic 3D Stadium Grass Turf Platform replicating the natural pitch turf
 * from the reference photography under focused stadium floodlights.
 */
function StadiumTurfPodium({ turfTexture }) {
  const ringRef = useRef(null);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z -= delta * 0.06;
  });

  return (
    <group position={[0, -0.74, 0]}>
      {/* 3D Cylindrical Podium Base */}
      <mesh position={[0, -0.035, 0]} receiveShadow>
        <cylinderGeometry args={[1.45, 1.49, 0.07, 64]} />
        <meshStandardMaterial
          color="#06180d"
          roughness={0.65}
          metalness={0.4}
        />
      </mesh>

      {/* Lush Stadium Grass Turf Top */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <circleGeometry args={[1.45, 64]} />
        <meshStandardMaterial
          map={turfTexture}
          roughness={0.88}
          metalness={0.04}
        />
      </mesh>

      {/* Illuminated Emerald Pitch Perimeter Trim */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[1.41, 1.46, 64]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner Tournament Gold Chalk Circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[1.02, 1.05, 48]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Ambient floating stadium sparks and light motes.
 */
function StadiumSparks({ count = 35 }) {
  const pointsRef = useRef(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const u = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const v = Math.cos(i * 39.346 + 11.135) * 24634.6345;
      const w = Math.sin(i * 73.156 + 45.164) * 31415.9265;
      positions[i * 3] = (u - Math.floor(u) - 0.5) * 5.2;
      positions[i * 3 + 1] = (v - Math.floor(v) - 0.5) * 3.8;
      positions[i * 3 + 2] = (w - Math.floor(w) - 0.5) * 3.2;
    }
    return positions;
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.05;
    pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.06;
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
        color="#10b981"
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Main 3D Football Canvas for the Login Experience.
 */
export default function LoginBallScene() {
  const reduced = prefersReducedMotion();
  const [interacted, setInteracted] = useState(false);
  const turfTexture = useMemo(() => getStadiumTurfTexture(), []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <div className="auth-ball-showcase">
      <div className="auth-canvas-container">
        <Canvas
          dpr={[1, 1.75]}
          shadows
          frameloop={reduced ? 'demand' : 'always'}
          camera={{ position: [0, 0.15, 4.4], fov: 42 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          aria-hidden="true"
          className="auth-three-canvas"
        >
          {/* Stadium Floodlights & Atmospheric Lighting */}
          <ambientLight intensity={0.65} color="#f0fdf4" />

          {/* Main Overhead Stadium Floodlight (like in Football images .jpg) */}
          <directionalLight
            position={[3.4, 5.0, 3.2]}
            intensity={2.8}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          {/* Focused Stadium Spotlight on the Ball & Pitch Turf */}
          <spotLight
            position={[1.2, 4.5, 2.2]}
            angle={0.52}
            penumbra={0.68}
            intensity={25}
            color="#ffffff"
            castShadow
          />

          {/* Pitch Turf Emerald Ambient Bounce Light */}
          <directionalLight position={[0, -2.2, 1.0]} intensity={0.9} color="#10b981" />

          {/* Atmospheric Rim Light in Stadium Royal Blue */}
          <directionalLight position={[-3.6, 2.0, -2.0]} intensity={1.2} color="#3b82f6" />

          {/* Tournament Warm Gold Accent */}
          <pointLight position={[-1.8, 1.6, 2.4]} intensity={10} color="#f59e0b" distance={7} />

          <TriondaLoginBall
            reduced={reduced}
            onInteract={() => setInteracted(true)}
          />

          <StadiumTurfPodium turfTexture={turfTexture} />

          {/* Soft Contact Shadow right on the turf surface */}
          <ContactShadows
            position={[0, -0.735, 0]}
            opacity={0.82}
            scale={3.6}
            blur={1.6}
            far={2.2}
            resolution={512}
            color="#021408"
            frames={reduced ? 1 : Infinity}
          />

          {!reduced && <StadiumSparks />}
        </Canvas>
      </div>

      <div className="auth-canvas-hint">
        <span className="auth-hint-pill">
          {interacted
            ? '⚽ Trionda 26 · Drag to rotate 360° · Click for spin burst'
            : '⚽ Official Trionda 2026 Match Ball · Drag to inspect in 3D'}
        </span>
      </div>
    </div>
  );
}
