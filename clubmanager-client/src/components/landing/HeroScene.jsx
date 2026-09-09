import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../animations/gsapAnimations';

import { HERO_PLAYERS } from './heroPlayersData';

/**
 * Generates an equirectangular gold/amber ball texture for the companion match ball.
 */
function useBallTexture() {
  return useMemo(() => {
    const width = 512;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = '#f7faf8';
    ctx.fillRect(0, 0, width, height);

    const radius = 24;
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
        hexagon(cx, y, radius * (1 - polar * 0.25));
        ctx.fillStyle = '#11191f';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f4f6f3';
        ctx.stroke();
      }
      row += 1;
    }

    ctx.fillStyle = '#d9a441';
    ctx.fillRect(0, height * 0.5 - 3, width, 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

/**
 * Individual 3D Holographic Player Card with curved frame, glowing border,
 * smooth 3D carousel physics, and pointer interaction.
 */
function PlayerCardMesh({ player, index, activeIndex, onSelect, texture, reduced }) {
  const groupRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  // Offset relative to the active card (0 = center, 1 = right, 2 = left)
  const offset = (index - activeIndex + 3) % 3;

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    if (reduced) {
      if (offset === 0) {
        group.position.set(0, 0.1, 0.65);
        group.rotation.set(0, 0, 0);
        group.scale.set(1.05, 1.05, 1.05);
      } else if (offset === 1) {
        group.position.set(1.95, -0.12, -0.45);
        group.rotation.set(0, -0.38, 0);
        group.scale.set(0.88, 0.88, 0.88);
      } else {
        group.position.set(-1.95, -0.12, -0.45);
        group.rotation.set(0, 0.38, 0);
        group.scale.set(0.88, 0.88, 0.88);
      }
      return;
    }

    // Target positions in 3D space
    let targetX = 0;
    let targetY = 0.1;
    let targetZ = 0.65;
    let targetRotY = 0;
    let targetScale = 1.05;

    if (offset === 1) {
      targetX = 1.95;
      targetY = -0.12;
      targetZ = -0.45;
      targetRotY = -0.38;
      targetScale = 0.88;
    } else if (offset === 2) {
      targetX = -1.95;
      targetY = -0.12;
      targetZ = -0.45;
      targetRotY = 0.38;
      targetScale = 0.88;
    }

    if (hovered && offset !== 0) {
      targetZ += 0.25;
      targetScale += 0.05;
    }

    // Smooth spring interpolation
    group.position.x += (targetX - group.position.x) * 0.08;
    group.position.y += (targetY - group.position.y) * 0.08;
    group.position.z += (targetZ - group.position.z) * 0.08;
    group.rotation.y += (targetRotY - group.rotation.y) * 0.08;
    group.scale.x += (targetScale - group.scale.x) * 0.08;
    group.scale.y += (targetScale - group.scale.y) * 0.08;
    group.scale.z += (targetScale - group.scale.z) * 0.08;

    // Harmonic floating bob
    group.position.y += Math.sin(state.clock.elapsedTime * 1.6 + index * 2.1) * 0.003;
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(index);
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
        <planeGeometry args={[2.0, 2.7, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.25}
          metalness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer Glowing Border Frame */}
      <mesh position={[0, 0, -0.006]}>
        <planeGeometry args={[2.06, 2.76]} />
        <meshBasicMaterial
          color={player.color}
          transparent
          opacity={offset === 0 ? 0.95 : 0.4}
        />
      </mesh>

      {/* Back Plate / Metallic Frame */}
      <mesh position={[0, 0, -0.015]}>
        <planeGeometry args={[2.08, 2.78]} />
        <meshStandardMaterial
          color="#0a120e"
          roughness={0.55}
          metalness={0.5}
        />
      </mesh>
    </group>
  );
}

/**
 * Companion 3D Match Ball sitting proudly in the stadium foreground.
 */
function CompanionBall({ reduced }) {
  const meshRef = useRef(null);
  const texture = useBallTexture();

  useFrame((state, delta) => {
    if (!meshRef.current || reduced) return;
    meshRef.current.rotation.y += delta * 0.5;
    meshRef.current.position.y = -1.35 + Math.sin(state.clock.elapsedTime * 1.8) * 0.04;
  });

  return (
    <mesh ref={meshRef} position={[1.75, -1.35, 1.2]} scale={0.38} castShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial map={texture} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

/**
 * Floating stadium sparks / motes swirling around the players.
 */
function StadiumSparks({ count = 40 }) {
  const pointsRef = useRef(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const u = Math.sin(i * 17.13 + 51.2) * 43758.5453;
      const v = Math.cos(i * 29.84 + 17.5) * 24634.6345;
      const w = Math.sin(i * 81.65 + 33.1) * 31415.9265;
      positions[i * 3] = (u - Math.floor(u) - 0.5) * 7.5;
      positions[i * 3 + 1] = (v - Math.floor(v) - 0.5) * 5;
      positions[i * 3 + 2] = (w - Math.floor(w) - 0.5) * 4;
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
        size={0.05}
        color="#d9a441"
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Glowing tactical radar pitch rings below the 3D stage.
 */
function StadiumPitchPedestal() {
  const ringRef = useRef(null);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z -= delta * 0.08;
  });

  return (
    <group position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ringRef}>
        <ringGeometry args={[2.4, 2.45, 64]} />
        <meshBasicMaterial color="#2f9e6a" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <ringGeometry args={[1.8, 1.84, 48]} />
        <meshBasicMaterial color="#d9a441" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Main 3D Card Scene Group with mouse parallax tracking.
 */
function CardTrioStage({ activeIndex, onSelect, textures, reduced }) {
  const stageRef = useRef(null);
  const { viewport } = useThree();

  // Responsive scale proportional to viewport width
  const responsiveScale = Math.min(1.05, Math.max(0.68, viewport.width / 7.2));

  useFrame((state) => {
    const stage = stageRef.current;
    if (!stage || reduced) return;

    // Pointer parallax tracking
    const targetRotY = state.pointer.x * 0.22;
    const targetRotX = -state.pointer.y * 0.14;

    stage.rotation.y += (targetRotY - stage.rotation.y) * 0.05;
    stage.rotation.x += (targetRotX - stage.rotation.x) * 0.05;
  });

  return (
    <group ref={stageRef} scale={responsiveScale} position={[0, 0.15, 0]}>
      {HERO_PLAYERS.map((player, idx) => (
        <PlayerCardMesh
          key={player.id}
          player={player}
          index={idx}
          activeIndex={activeIndex}
          onSelect={onSelect}
          texture={textures[idx]}
          reduced={reduced}
        />
      ))}

      <CompanionBall reduced={reduced} />
      <StadiumPitchPedestal />
      {!reduced && <StadiumSparks />}
    </group>
  );
}

/**
 * Top-Level Hero Scene Canvas.
 */
export default function HeroScene({ activeIndex = 0, onSelectPlayer }) {
  const reduced = prefersReducedMotion();

  // Preload textures
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return HERO_PLAYERS.map((player) => {
      const tex = loader.load(player.image);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      return tex;
    });
  }, []);

  // Cleanup cursor on unmount
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
      camera={{ position: [0, 0.2, 5.4], fov: 44 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden="true"
    >
      {/* Stadium Floodlighting */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[4, 5, 4]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, 2, -2]} intensity={1.1} color="#34d399" />
      <pointLight position={[0, 2.5, 3]} intensity={15} color="#f59e0b" distance={8} />

      <CardTrioStage
        activeIndex={activeIndex}
        onSelect={onSelectPlayer}
        textures={textures}
        reduced={reduced}
      />

      <ContactShadows
        position={[0, -1.52, 0]}
        opacity={0.65}
        scale={8.5}
        blur={2.8}
        far={3.5}
        resolution={512}
        color="#010e08"
        frames={reduced ? 1 : Infinity}
      />
    </Canvas>
  );
}
