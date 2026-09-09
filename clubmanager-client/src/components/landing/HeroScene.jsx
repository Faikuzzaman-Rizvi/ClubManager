import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../animations/gsapAnimations';

import { HERO_PLAYERS } from './heroPlayersData';
import {
  getTriondaBallTexture,
  getTriondaBallBumpTexture,
  getStadiumTurfTexture,
} from './triondaBallTexture';

/**
 * Individual 3D Holographic Player Card.
 * Proportioned to FUT/trading card ratio (1.75 x 2.35).
 * Neatly aligned, non-overlapping, and grounded just above the pitch podium.
 */
function PlayerCardMesh({
  player,
  index,
  activeIndex,
  isBallMode,
  onSelect,
  texture,
  reduced,
}) {
  const groupRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  // Active player card index (0: Messi, 1: Ronaldo, 2: Neymar)
  const activePlayerCardIdx = isBallMode ? 0 : activeIndex - 1;
  const offset = (index - activePlayerCardIdx + 3) % 3;

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    let targetX = 0;
    let targetY = 0.22;
    let targetZ = 0.4;
    let targetRotY = 0;
    let targetScale = 1.0;

    if (isBallMode) {
      // Symmetrical stadium backdrop fan framing the central match ball
      if (index === 0) {
        // Messi elevated centrally behind the ball as the hero jumbotron
        targetX = 0;
        targetY = 0.54;
        targetZ = -0.75;
        targetRotY = 0;
        targetScale = 0.8;
      } else if (index === 1) {
        // Ronaldo flanked cleanly to the right of the ball
        targetX = 1.76;
        targetY = 0.36;
        targetZ = -0.65;
        targetRotY = -0.24;
        targetScale = 0.74;
      } else {
        // Neymar flanked cleanly to the left of the ball
        targetX = -1.76;
        targetY = 0.36;
        targetZ = -0.65;
        targetRotY = 0.24;
        targetScale = 0.74;
      }
    } else if (offset === 0) {
      // Active player card front & center
      targetX = 0;
      targetY = 0.22;
      targetZ = 0.4;
      targetRotY = 0;
      targetScale = 1.0;
    } else if (offset === 1) {
      // Right flank card
      targetX = 1.72;
      targetY = 0.1;
      targetZ = -0.22;
      targetRotY = -0.26;
      targetScale = 0.84;
    } else if (offset === 2) {
      // Left flank card
      targetX = -1.72;
      targetY = 0.1;
      targetZ = -0.22;
      targetRotY = 0.26;
      targetScale = 0.84;
    }

    if (hovered && (!isBallMode ? offset !== 0 : true)) {
      targetZ += 0.2;
      targetScale += 0.04;
    }

    if (reduced) {
      group.position.set(targetX, targetY, targetZ);
      group.rotation.set(0, targetRotY, 0);
      group.scale.set(targetScale, targetScale, targetScale);
      return;
    }

    // Smooth spring interpolation
    group.position.x += (targetX - group.position.x) * 0.09;
    group.position.y += (targetY - group.position.y) * 0.09;
    group.position.z += (targetZ - group.position.z) * 0.09;
    group.rotation.y += (targetRotY - group.rotation.y) * 0.09;
    group.scale.x += (targetScale - group.scale.x) * 0.09;
    group.scale.y += (targetScale - group.scale.y) * 0.09;
    group.scale.z += (targetScale - group.scale.z) * 0.09;

    // Harmonic floating bob
    group.position.y += Math.sin(state.clock.elapsedTime * 1.5 + index * 2.1) * 0.0025;
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(index + 1);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Front Face: High-Res Action Portrait */}
      <mesh castShadow receiveShadow>
        <planeGeometry args={[1.75, 2.35, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.24}
          metalness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer Glowing Border Frame */}
      <mesh position={[0, 0, -0.006]}>
        <planeGeometry args={[1.81, 2.41]} />
        <meshBasicMaterial
          color={player.color}
          transparent
          opacity={(!isBallMode && offset === 0) ? 0.95 : 0.42}
        />
      </mesh>

      {/* Back Plate / Metallic Frame */}
      <mesh position={[0, 0, -0.015]}>
        <planeGeometry args={[1.83, 2.43]} />
        <meshStandardMaterial
          color="#06130b"
          roughness={0.55}
          metalness={0.5}
        />
      </mesh>
    </group>
  );
}

/**
 * Authentic Adidas FIFA 2026 Trionda Match Ball.
 * Positions are calculated to sit naturally on the turf platform surface at y = -0.96.
 */
function TriondaMatchBall({ isFocused, onSelect, reduced }) {
  const meshRef = useRef(null);
  const isDragging = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const ballRotation = useRef({ x: 0.18, y: 0.82 });
  const [hovered, setHovered] = useState(false);

  const ballTexture = useMemo(() => getTriondaBallTexture(), []);
  const bumpTexture = useMemo(() => getTriondaBallBumpTexture(), []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let targetX, targetY, targetZ, targetScale;

    if (isFocused) {
      // Center stage showcase position directly on the turf
      targetX = 0;
      targetScale = 0.58;
      // Platform is at -0.96; center = -0.96 + 0.58 = -0.38
      targetY = -0.38 + Math.sin(state.clock.elapsedTime * 1.4) * 0.015;
      targetZ = 0.82;
    } else {
      // Foreground right sideline position resting on the turf
      targetX = 1.55;
      targetScale = 0.38;
      // Platform is at -0.96; center = -0.96 + 0.38 = -0.58
      targetY = -0.58 + Math.sin(state.clock.elapsedTime * 1.5) * 0.012;
      targetZ = 1.05;
    }

    if (hovered && !isFocused) {
      targetScale += 0.03;
      targetY += 0.03;
    }

    if (reduced) {
      mesh.position.set(targetX, targetY, targetZ);
      mesh.scale.set(targetScale, targetScale, targetScale);
      return;
    }

    mesh.position.x += (targetX - mesh.position.x) * 0.09;
    mesh.position.y += (targetY - mesh.position.y) * 0.09;
    mesh.position.z += (targetZ - mesh.position.z) * 0.09;

    mesh.scale.x += (targetScale - mesh.scale.x) * 0.09;
    mesh.scale.y += (targetScale - mesh.scale.y) * 0.09;
    mesh.scale.z += (targetScale - mesh.scale.z) * 0.09;

    // Smooth idle spin unless being dragged
    if (!isDragging.current) {
      ballRotation.current.y += delta * (isFocused ? 0.32 : 0.45);
      ballRotation.current.x = 0.18 + Math.sin(state.clock.elapsedTime * 0.7) * 0.05;
    }

    mesh.rotation.y = ballRotation.current.y;
    mesh.rotation.x = ballRotation.current.x;
  });

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      position={[1.55, -0.58, 1.05]}
      scale={0.38}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        isDragging.current = true;
        prevMousePos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
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
 * Authentic 3D Stadium Grass Pitch Podium.
 * Concentrically aligned with the cards and ball at y = -0.96.
 */
function StadiumGrassTurf({ turfTexture }) {
  const ringRef = useRef(null);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z -= delta * 0.05;
  });

  return (
    <group position={[0, -0.96, 0]}>
      {/* 3D Cylindrical Podium Base */}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[2.42, 2.46, 0.08, 64]} />
        <meshStandardMaterial
          color="#06180d"
          roughness={0.65}
          metalness={0.4}
        />
      </mesh>

      {/* Lush Stadium Grass Turf Top */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <circleGeometry args={[2.42, 64]} />
        <meshStandardMaterial
          map={turfTexture}
          roughness={0.88}
          metalness={0.04}
        />
      </mesh>

      {/* Illuminated Emerald Pitch Perimeter Trim */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[2.37, 2.43, 64]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner Tournament Gold Chalk Arc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[1.72, 1.75, 64]} />
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
 * Floating stadium sparks / light particles.
 */
function StadiumSparks({ count = 40 }) {
  const pointsRef = useRef(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const u = Math.sin(i * 17.13 + 51.2) * 43758.5453;
      const v = Math.cos(i * 29.84 + 17.5) * 24634.6345;
      const w = Math.sin(i * 81.65 + 33.1) * 31415.9265;
      positions[i * 3] = (u - Math.floor(u) - 0.5) * 6.5;
      positions[i * 3 + 1] = (v - Math.floor(v) - 0.5) * 4.5;
      positions[i * 3 + 2] = (w - Math.floor(w) - 0.5) * 3.5;
    }
    return positions;
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.04;
    pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
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
 * Main 3D Stage with responsive scaling, pointer parallax, and the Trionda match ball.
 */
function CardTrioStage({ activeIndex, onSelect, textures, turfTexture, reduced }) {
  const stageRef = useRef(null);
  const { viewport } = useThree();

  const isBallMode = activeIndex === 0;
  const responsiveScale = Math.min(1.05, Math.max(0.68, viewport.width / 7.0));
  const playerCards = useMemo(() => HERO_PLAYERS.filter((p) => !p.isBall), []);

  useFrame((state) => {
    const stage = stageRef.current;
    if (!stage || reduced) return;

    // Subtle pointer parallax tracking
    const targetRotY = state.pointer.x * 0.14;
    const targetRotX = -state.pointer.y * 0.08;

    stage.rotation.y += (targetRotY - stage.rotation.y) * 0.05;
    stage.rotation.x += (targetRotX - stage.rotation.x) * 0.05;
  });

  return (
    <group ref={stageRef} scale={responsiveScale} position={[0, 0.06, 0]}>
      {playerCards.map((player, idx) => (
        <PlayerCardMesh
          key={player.id}
          player={player}
          index={idx}
          activeIndex={activeIndex}
          isBallMode={isBallMode}
          onSelect={onSelect}
          texture={textures[idx]}
          reduced={reduced}
        />
      ))}

      <TriondaMatchBall
        isFocused={isBallMode}
        onSelect={() => onSelect(0)}
        reduced={reduced}
      />

      <StadiumGrassTurf turfTexture={turfTexture} />

      {/* Realistic contact shadow directly onto the turf surface at y = -0.955 */}
      <ContactShadows
        position={[0, -0.955, 0]}
        opacity={0.82}
        scale={5.4}
        blur={1.8}
        far={2.8}
        resolution={512}
        color="#021408"
        frames={reduced ? 1 : Infinity}
      />

      {!reduced && <StadiumSparks />}
    </group>
  );
}

/**
 * Top-Level Hero Scene Canvas with cinematic stadium floodlights.
 */
export default function HeroScene({ activeIndex = 0, onSelectPlayer }) {
  const reduced = prefersReducedMotion();

  const playerCards = useMemo(() => HERO_PLAYERS.filter((p) => !p.isBall), []);
  const turfTexture = useMemo(() => getStadiumTurfTexture(), []);

  // Preload player Action Portrait textures
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return playerCards.map((player) => {
      const tex = loader.load(player.image);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      return tex;
    });
  }, [playerCards]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      frameloop={reduced ? 'demand' : 'always'}
      camera={{ position: [0, 0.32, 5.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden="true"
    >
      {/* Stadium Floodlighting */}
      <ambientLight intensity={0.65} color="#f0fdf4" />

      {/* Main Overhead Stadium Floodlight */}
      <directionalLight
        position={[3.2, 5.0, 3.2]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Focused Stadium Spotlight on the Trionda Ball & Pitch */}
      <spotLight
        position={[1.2, 4.5, 2.0]}
        angle={0.52}
        penumbra={0.65}
        intensity={24}
        color="#ffffff"
        castShadow
      />

      {/* Pitch Turf Emerald Ambient Bounce Light */}
      <directionalLight position={[0, -2.0, 1.0]} intensity={0.9} color="#10b981" />

      {/* Atmospheric Rim Light in Stadium Royal Blue */}
      <directionalLight position={[-3.5, 2.0, -2.0]} intensity={1.2} color="#3b82f6" />

      {/* Tournament Warm Gold Accent */}
      <pointLight position={[0, 2.2, 2.5]} intensity={10} color="#f59e0b" distance={7} />

      <CardTrioStage
        activeIndex={activeIndex}
        onSelect={onSelectPlayer}
        textures={textures}
        turfTexture={turfTexture}
        reduced={reduced}
      />
    </Canvas>
  );
}
