import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../animations/gsapAnimations';

/*
 * The hero ball.
 *
 * Deliberately a small scene: one sphere, three lights and a contact shadow. No
 * HDRI environment - that would mean fetching an .hdr from a CDN at runtime for
 * a single object, which is both a network dependency and a lot of weight for
 * the payoff. Explicit key/fill/rim lighting gives a predictable, controllable
 * look instead.
 *
 * OrbitControls is intentionally absent: it would swallow wheel events and fight
 * the page scroll, which is the last thing a landing hero should do.
 */

/**
 * Equirectangular ball skin, drawn once into a 2D canvas. A hex lattice over an
 * off-white base reads as a contemporary match ball without needing a model or
 * an external texture file.
 */
function useBallTexture() {
  return useMemo(() => {
    const width = 1024;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f4f6f3';
    ctx.fillRect(0, 0, width, height);

    const radius = 34;
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
        // Panels fade toward the poles, where the projection stretches worst.
        const polar = Math.abs(y - height / 2) / (height / 2);
        hexagon(cx, y, radius * (1 - polar * 0.25));
        ctx.fillStyle = '#12181d';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f4f6f3';
        ctx.stroke();
      }
      row += 1;
    }

    // A single accent stripe, matching the club amber.
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(0, height * 0.5 - 4, width, 8);
    ctx.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);
}

function Ball({ reduced }) {
  const meshRef = useRef(null);
  const texture = useBallTexture();
  const { viewport } = useThree();

  // Sized off the viewport so the ball keeps its proportions on any screen.
  const scale = Math.min(1.35, Math.max(0.78, viewport.width / 5.5));

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || reduced) return;

    mesh.rotation.y += delta * 0.28;
    mesh.rotation.z = Math.sin(state.clock.elapsedTime * 0.35) * 0.06;

    // Pointer parallax, eased so it drifts rather than snaps.
    const targetX = state.pointer.y * 0.28;
    const targetY = state.pointer.x * 0.35;
    mesh.rotation.x += (targetX - mesh.rotation.x) * 0.04;
    mesh.position.x += (targetY * 0.35 - mesh.position.x) * 0.04;
    mesh.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.12;
  });

  return (
    <mesh ref={meshRef} castShadow scale={scale}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshStandardMaterial map={texture} roughness={0.44} metalness={0.06} />
    </mesh>
  );
}

export default function HeroScene() {
  const reduced = prefersReducedMotion();

  return (
    <Canvas
      // Capped DPR: retina at full density buys nothing here and costs a lot.
      dpr={[1, 1.75]}
      shadows
      frameloop={reduced ? 'demand' : 'always'}
      camera={{ position: [0, 0.15, 4.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      // Decorative: the hero states everything this conveys in text.
      aria-hidden="true"
    >
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[3.5, 4.5, 3]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, 1.5, -2]} intensity={0.7} color="#7fd7a8" />
      <pointLight position={[-1.5, -1.5, 2.5]} intensity={12} color="#d9a441" distance={9} />

      <Ball reduced={reduced} />

      <ContactShadows
        position={[0, -1.55, 0]}
        opacity={0.55}
        scale={7}
        blur={2.8}
        far={3}
        resolution={512}
        color="#02100a"
        frames={reduced ? 1 : Infinity}
      />
    </Canvas>
  );
}
