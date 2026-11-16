"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type TreeItem = { id: string; texture: THREE.Texture };

// ---- Tree shape -------------------------------------------------------------
// Five stacked cones. Cards and lights sit on the outer envelope of these cones.
const TIERS = Array.from({ length: 5 }, (_, k) => ({
  base: 0.6 + k * 1.7,
  height: 3.0,
  radius: 4.2 * (1 - k / 5.5),
}));
const TOP = TIERS[4].base + TIERS[4].height; // ≈ 10.4

function foliageRadius(y: number): number {
  let r = 0;
  for (const t of TIERS) {
    if (y >= t.base && y <= t.base + t.height) r = Math.max(r, t.radius * (1 - (y - t.base) / t.height));
  }
  return r;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const Y_MIN = 1.0;
const Y_MAX = 9.3;

/** Spread n points over the cone: golden-angle spiral, denser near the wide bottom. */
function spiral(n: number, offset = 0, lift = 0.12) {
  const pts: { pos: THREE.Vector3; angle: number }[] = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const y = Y_MIN + (Y_MAX - Y_MIN) * (1 - Math.sqrt(1 - u));
    const angle = i * GOLDEN_ANGLE + offset;
    const r = foliageRadius(y) + lift;
    pts.push({ pos: new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r), angle });
  }
  return pts;
}

/** Card size shrinks as photos are added so the tree never turns into a solid wall. */
function cardSize(n: number) {
  return Math.min(1.1, Math.max(0.42, Math.sqrt(105 / Math.max(n, 1))));
}

// ---- Photo cards ------------------------------------------------------------
function PhotoCards({ items }: { items: TreeItem[] }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const meshes = useRef(new Map<string, THREE.Mesh>());
  const placed = useRef(new WeakSet<THREE.Mesh>());

  const slots = useMemo(() => {
    const size = cardSize(items.length);
    const dummy = new THREE.Object3D();
    return spiral(items.length, 0, 0.22).map(({ pos }, i) => {
      dummy.position.copy(pos);
      dummy.lookAt(pos.x * 2, pos.y + 0.6, pos.z * 2);
      dummy.rotateZ(Math.sin(i * 12.9898) * 0.25); // slight, stable tilt per card
      return { pos, quat: dummy.quaternion.clone(), size };
    });
  }, [items.length]);

  // One frame callback for all cards: ease toward their slot (slots move when photos are added).
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 3);
    items.forEach((item, i) => {
      const m = meshes.current.get(item.id);
      const s = slots[i];
      if (!m || !s) return;
      m.position.lerp(s.pos, k);
      m.quaternion.slerp(s.quat, k);
      m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, s.size, k));
    });
  });

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <>
      {items.map((item, i) => (
        <mesh
          key={item.id}
          geometry={geometry}
          scale={0.001}
          ref={(m) => {
            if (!m) return void meshes.current.delete(item.id);
            meshes.current.set(item.id, m);
            // Place new cards on their slot once (they then pop in via scale); after that useFrame eases them.
            if (!placed.current.has(m) && slots[i]) {
              m.position.copy(slots[i].pos);
              m.quaternion.copy(slots[i].quat);
              placed.current.add(m);
            }
          }}
        >
          <meshBasicMaterial map={item.texture} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

// ---- Decorations ------------------------------------------------------------
function Foliage() {
  return (
    <>
      {TIERS.map((t, k) => (
        <mesh key={k} position={[0, t.base + t.height / 2, 0]}>
          <coneGeometry args={[t.radius, t.height, 28, 1]} />
          <meshStandardMaterial color={k % 2 ? "#0d6b3c" : "#0a5a32"} roughness={0.85} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.45, 0.55, 0.7, 12]} />
        <meshStandardMaterial color="#5b3a1e" roughness={1} />
      </mesh>
    </>
  );
}

const LIGHT_COLORS = ["#ffd166", "#ff6b6b", "#4dabf7", "#69db7c", "#ffffff"].map((c) => new THREE.Color(c));

function TwinkleLights({ count = 220 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () =>
      spiral(count, 1.3, 0.05).map(({ pos }, i) => ({
        pos,
        color: LIGHT_COLORS[i % LIGHT_COLORS.length],
        speed: 1.5 + ((i * 7919) % 100) / 40,
        phase: (i * 104729) % 628 / 100,
      })),
    [count],
  );

  useEffect(() => {
    const mesh = ref.current!;
    const m = new THREE.Matrix4();
    data.forEach((d, i) => {
      mesh.setMatrixAt(i, m.makeTranslation(d.pos.x, d.pos.y, d.pos.z));
      mesh.setColorAt(i, d.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    // instanceColor was just created; recompile so the shader uses per-instance colours.
    (mesh.material as THREE.Material).needsUpdate = true;
  }, [data]);

  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      const glow = 0.25 + 0.75 * Math.max(0, Math.sin(t * d.speed + d.phase));
      mesh.setColorAt(i, tmp.copy(d.color).multiplyScalar(glow));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

const BAUBLE_COLORS = ["#c92a2a", "#f2c94c", "#d0d5dd", "#1c7ed6"].map((c) => new THREE.Color(c));

function Baubles({ count = 46 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const mesh = ref.current!;
    const m = new THREE.Matrix4();
    spiral(count, 2.1, 0.12).forEach(({ pos }, i) => {
      mesh.setMatrixAt(i, m.makeTranslation(pos.x, pos.y - 0.15, pos.z));
      mesh.setColorAt(i, BAUBLE_COLORS[i % BAUBLE_COLORS.length]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    (mesh.material as THREE.Material).needsUpdate = true;
  }, [count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial metalness={0.6} roughness={0.25} />
    </instancedMesh>
  );
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,240,180,1)");
  g.addColorStop(0.25, "rgba(255,215,90,0.55)");
  g.addColorStop(1, "rgba(255,200,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function Star() {
  const star = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Sprite>(null);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.38 : 0.9;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 });
    g.center();
    return g;
  }, []);
  const haloMap = useMemo(() => glowTexture(), []);

  useFrame(({ clock }, dt) => {
    if (star.current) star.current.rotation.y += dt * 0.6;
    if (halo.current) halo.current.scale.setScalar(4 + Math.sin(clock.elapsedTime * 2) * 0.4);
  });

  return (
    <group position={[0, TOP + 0.35, 0]}>
      <mesh ref={star} geometry={geometry}>
        <meshStandardMaterial color="#ffd43b" emissive="#ffb700" emissiveIntensity={1.6} metalness={0.4} roughness={0.3} />
      </mesh>
      <sprite ref={halo} scale={4}>
        <spriteMaterial map={haloMap} blending={THREE.AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
      </sprite>
      <pointLight color="#ffd27a" intensity={6} distance={10} />
    </group>
  );
}

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

function Snow({ count = 1600 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    // Seeded so renders stay pure; the pattern doesn't need to differ between loads.
    let seed = 42;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 34;
      positions[i * 3 + 1] = rand() * 18;
      positions[i * 3 + 2] = (rand() - 0.5) * 24;
      speeds[i] = 0.4 + rand() * 0.8;
    }
    return { positions, speeds };
  }, [count]);
  const map = useMemo(() => dotTexture(), []);

  useFrame(({ clock }, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i] * dt;
      arr[i * 3] += Math.sin(t * 0.7 + i) * 0.15 * dt; // gentle drift
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 18;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial map={map} size={0.14} transparent depthWrite={false} opacity={0.9} sizeAttenuation />
    </points>
  );
}

function Spinner({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.12; // one turn ≈ 52 s
  });
  return <group ref={ref}>{children}</group>;
}

function CameraAim() {
  const camera = useThree((s) => s.camera);
  useEffect(() => camera.lookAt(0, 5.4, 0), [camera]);
  return null;
}

function FpsMeter({ onFps }: { onFps: (fps: number) => void }) {
  const acc = useRef({ frames: 0, time: 0 });
  useFrame((_, dt) => {
    acc.current.frames++;
    acc.current.time += dt;
    if (acc.current.time >= 0.5) {
      onFps(Math.round(acc.current.frames / acc.current.time));
      acc.current = { frames: 0, time: 0 };
    }
  });
  return null;
}

export function TreeScene({ items, onFps }: { items: TreeItem[]; onFps?: (fps: number) => void }) {
  return (
    <Canvas camera={{ position: [0, 5.6, 17], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <color attach="background" args={["#050816"]} />
      <fog attach="fog" args={["#050816", 20, 42]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 12, 8]} intensity={1.3} />
      <CameraAim />
      <Spinner>
        <Foliage />
        <Baubles />
        <TwinkleLights />
        <PhotoCards items={items} />
      </Spinner>
      <Star />
      <Snow />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[30, 48]} />
        <meshStandardMaterial color="#c9d3e3" roughness={1} />
      </mesh>
      {onFps && <FpsMeter onFps={onFps} />}
    </Canvas>
  );
}
