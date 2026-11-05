// World 2: an abstract assembly hall. Three curved rows of desks face the dais; 19 nameplates stand on them.
// Nameplates lean toward the cursor (spring), spin when dragged or flicked (inertia), and rise when picked.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { committees, schedule } from '@/data/conference';
import { C, CLOCK, DESK_H, PLATE, PLATES, ROWS, SCREEN, RAD } from './layout';
import { getUI, pickPlate, rig, useUI } from './store';
import { drawClock, drawScreen, makeCanvasTexture, plateTexture } from './textures';
import { SCENE } from './theme';

/** An annulus sector (r0..r1, ±span°) extruded downward from y = 0 by h. */
function arcSlab(r0: number, r1: number, span: number, h: number, steps = 40) {
  const s = new THREE.Shape();
  const a0 = -span * RAD, a1 = span * RAD;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const x = r1 * Math.sin(a), y = r1 * Math.cos(a);
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / steps;
    s.lineTo(r0 * Math.sin(a), r0 * Math.cos(a));
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(Math.PI / 2); // shape y -> world z, extrusion -> downward
  return g;
}

const firstTime = (i: number) => schedule[i].slots[0].time.split('–')[0].trim();
const dayInfo = (day: number) => {
  const d = schedule[day - 1];
  return { label: d.label, first: firstTime(day - 1), items: d.slots.length, sessions: d.slots.filter((s) => /Committee Session/.test(s.name)).length };
};

/* ------------------------------------------------------------------ one nameplate */
type Spin = { a: number; v: number; drag: boolean; lift: number };
function Placard({ spot, map, spins }: { spot: (typeof PLATES)[number]; map: THREE.Texture; spins: Spin[] }) {
  const pivot = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  useCursor(hover, 'grab');
  const picked = useUI((u) => u.picked) === spot.i;
  const mats = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: SCENE.plate, roughness: 0.7 });
    const back = new THREE.MeshStandardMaterial({ color: SCENE.plateBack, roughness: 0.8 });
    // the face carries its own texture as emissive and skips tone mapping, so the sand fill reads as sand (ACES pushed it to copper)
    const front = new THREE.MeshStandardMaterial({ map, emissiveMap: map, roughness: 0.55, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.42, toneMapped: false });
    return [side, side, side, side, front, back];
  }, [map]);
  const glow = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const s = spins[spot.i];
    if (!s.drag) {
      if (Math.abs(s.v) > 2.2) s.v *= Math.exp(-1.4 * d); // free spin with friction
      else {
        const wrapped = Math.atan2(Math.sin(s.a), Math.cos(s.a)); // nearest "facing the dais"
        s.v += (-wrapped * 22 - s.v * 6.5) * d;
      }
      s.a += s.v * d;
    }
    const target = (picked ? 0.24 : 0) + (hover ? 0.07 : 0);
    s.lift += (target - s.lift) * (1 - Math.exp(-8 * d));
    const p = pivot.current;
    if (p) {
      p.position.y = s.lift;
      // Lusion-like: every plate leans a little toward the cursor
      p.rotation.y = s.a + rig.pointer.x * 0.22;
      p.rotation.x = -0.16 - rig.pointer.y * 0.08;
    }
    (mats[4] as THREE.MeshStandardMaterial).emissiveIntensity += ((picked ? 0.62 : 0.42) - (mats[4] as THREE.MeshStandardMaterial).emissiveIntensity) * 0.15;
    if (glow.current) {
      (glow.current.material as THREE.MeshBasicMaterial).opacity = Math.min(1, s.lift * 6);
      glow.current.visible = s.lift > 0.01; // no draw call when unlit
    }
  });

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const s = spins[spot.i];
    s.drag = true;
    let lastX = e.clientX, lastT = performance.now(), moved = 0;
    const move = (ev: PointerEvent) => {
      const now = performance.now();
      const dx = ev.clientX - lastX;
      const dtt = Math.max(1, now - lastT) / 1000;
      s.a += dx * 0.014;
      s.v = (dx * 0.014) / dtt;
      moved += Math.abs(dx);
      lastX = ev.clientX; lastT = now;
    };
    const up = () => {
      s.drag = false;
      if (performance.now() - lastT > 90) s.v *= 0.2; // held still before release: no flick
      if (moved < 6) pickPlate(spot.i);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <group position={[spot.x, spot.y, spot.z]} rotation={[0, spot.ry, 0]}>
      <group ref={pivot}>
        <mesh
          material={mats}
          onPointerDown={down}
          onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
          onPointerOut={() => setHover(false)}
        >
          <boxGeometry args={[PLATE.w, PLATE.h, PLATE.d]} />
        </mesh>
      </group>
      {/* a terracotta light strip on the desk under the picked plate (solid; it only fades while rising) */}
      <mesh ref={glow} position={[0, -PLATE.h / 2 - 0.004, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PLATE.w * 1.1, 0.05]} />
        <meshBasicMaterial color={SCENE.plateLit} transparent opacity={0} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ the hall */
export function Hall() {
  const lite = rig.lite;
  // 2x the old resolution on desktop so the plates stay sharp at dpr 2; phones keep 1x (geometry, not resolution, is cut)
  const maps = useMemo(() => committees.map((c) => plateTexture(c, lite ? 1 : 1.5)), [lite]);
  const spins = useMemo<Spin[]>(() => committees.map(() => ({ a: 0, v: 0, drag: false, lift: 0 })), []);
  const geo = useMemo(() => ROWS.map((row, k) => ({
    tier: row.y > 0 ? arcSlab(row.r - 0.9, row.r + 0.9, row.span + 7, row.y) : null,
    top: arcSlab(row.r - 0.3, row.r + 0.3, row.span + 5, 0.06),
    k,
  })), []);
  const rings = useRef<THREE.Group>(null);

  // live textures: the rostrum screen shows the picked day, the dais clock shows the floor timer
  const screen = useMemo(() => makeCanvasTexture(lite ? 1024 : 2048, lite ? 397 : 794), [lite]);
  const clock = useMemo(() => makeCanvasTexture(512, 256), []);
  const day = useUI((u) => u.day);
  const timer = useUI((u) => u.timer);
  const timerState = useUI((u) => u.timerState);
  useEffect(() => { drawScreen(screen.canvas, dayInfo(day)); screen.texture.needsUpdate = true; }, [day, screen]);
  useEffect(() => { drawClock(clock.canvas, timer, timerState); clock.texture.needsUpdate = true; }, [timer, timerState, clock]);

  // the picked plate also reads well on phones: the camera follows it (see layout.plateKey)
  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    rig.plateFocus += (getUI().picked - rig.plateFocus) * (1 - Math.exp(-3 * d));
    if (rings.current) rings.current.rotation.z = state.clock.elapsedTime * 0.03;
  });

  const bars = useMemo(() => {
    const out: { x: number; z: number; ry: number }[] = [];
    const n = lite ? 18 : 28;
    for (let i = 0; i < n; i++) {
      const a = -150 * RAD + (300 * RAD * i) / (n - 1);
      out.push({ x: C[0] + 12.5 * Math.sin(a), z: C[2] + 3 + 12.5 * Math.cos(a), ry: a });
    }
    return out;
  }, [lite]);

  // the light bars are one instanced draw call
  const barRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const im = barRef.current;
    if (!im) return;
    const m = new THREE.Matrix4();
    bars.forEach((b, i) => { m.makeRotationY(b.ry).setPosition(b.x, 3.2, b.z); im.setMatrixAt(i, m); });
    im.instanceMatrix.needsUpdate = true;
  }, [bars]);

  return (
    <group name="world-hall">
      <ambientLight intensity={0.55} color={SCENE.ambient} />
      <directionalLight position={[4, 12, 8]} intensity={1.5} color={SCENE.key} />
      <pointLight position={[0, 3.6, -9.4]} intensity={28} distance={16} decay={2} color={SCENE.daisLight} />
      <pointLight position={[0, 3.2, -6]} intensity={7} distance={9} decay={2} color={SCENE.warmLight} />

      {/* floor and its inlaid rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3]}>
        <circleGeometry args={[26, lite ? 40 : 72]} />
        <meshStandardMaterial color={SCENE.floor} roughness={0.92} metalness={0.05} />
      </mesh>
      {[3.4, 10.2, 11.4].map((r, i) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[C[0], 0.004, C[2]]}>
          <ringGeometry args={[r - 0.015, r + 0.015, lite ? 64 : 128]} />
          <meshBasicMaterial color={i === 0 ? SCENE.ringInner : SCENE.ringOuter} toneMapped={false} />
        </mesh>
      ))}

      {/* tiers, desks and desk fronts */}
      {geo.map((g) => {
        const row = ROWS[g.k];
        return (
          <group key={g.k} position={[C[0], 0, C[2]]}>
            {g.tier && (
              <mesh geometry={g.tier} position={[0, row.y, 0]}>
                <meshStandardMaterial color={SCENE.tier} roughness={0.9} />
              </mesh>
            )}
            <mesh geometry={g.top} position={[0, row.y + DESK_H, 0]}>
              <meshStandardMaterial color={SCENE.deskTop} roughness={0.6} />
            </mesh>
            <mesh position={[0, row.y + (DESK_H - 0.06) / 2, 0]}>
              <cylinderGeometry args={[row.r - 0.3, row.r - 0.3, DESK_H - 0.06, lite ? 32 : 64, 1, true, -(row.span + 5) * RAD, 2 * (row.span + 5) * RAD]} />
              <meshStandardMaterial color={SCENE.deskFront} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}

      {PLATES.map((p) => <Placard key={p.i} spot={p} map={maps[p.i]} spins={spins} />)}

      {/* the dais: maroon front, a gold host line, the chair's desk and its clock */}
      <group position={[C[0], 0, C[2]]}>
        <mesh position={[0, 0.3, -0.6]}>
          <boxGeometry args={[9.5, 0.6, 3]} />
          <meshStandardMaterial color={SCENE.daisBody} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.3, 0.91]}>
          <boxGeometry args={[9.5, 0.6, 0.02]} />
          <meshStandardMaterial color={SCENE.daisFront} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.605, 0.92]}>
          <boxGeometry args={[9.5, 0.02, 0.03]} />
          <meshBasicMaterial color={SCENE.hostLine} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.36, 0]}>
          <boxGeometry args={[6.4, 0.07, 1.0]} />
          <meshStandardMaterial color={SCENE.chairDesk} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.97, 0.49]}>
          <boxGeometry args={[6.4, 0.74, 0.04]} />
          <meshStandardMaterial color={SCENE.daisFront} roughness={0.7} />
        </mesh>
      </group>
      <mesh position={[CLOCK.x, CLOCK.y, CLOCK.z]} rotation={[-0.2, -0.12, 0]}>
        <boxGeometry args={[0.96, 0.48, 0.07]} />
        {[0, 1, 2, 3].map((k) => <meshStandardMaterial key={k} attach={`material-${k}`} color={SCENE.clockBody} />)}
        <meshBasicMaterial attach="material-4" map={clock.texture} toneMapped={false} />
        <meshStandardMaterial attach="material-5" color={SCENE.clockBody} />
      </mesh>

      {/* back wall, its rings and the rostrum screen */}
      <mesh position={[0, 7, -11.2]}>
        <planeGeometry args={[34, 16]} />
        <meshStandardMaterial color={SCENE.wall} roughness={0.95} />
      </mesh>
      <group ref={rings} position={[0, 6.6, -11.1]}>
        {[2.4, 3.2, 4.0, 4.8].map((r, i) => (
          <mesh key={r}>
            <ringGeometry args={[r - 0.02, r + 0.02, lite ? 64 : 128, 1, 0, i === 3 ? Math.PI * 1.7 : Math.PI * 2]} />
            <meshBasicMaterial color={SCENE.wallRings[i]} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh position={[SCREEN.x, SCREEN.y, SCREEN.z]}>
        <planeGeometry args={[SCREEN.w, SCREEN.h]} />
        <meshBasicMaterial map={screen.texture} toneMapped={false} />
      </mesh>

      {/* a ring of tall light bars around the hall, and the ceiling ring seen from the aerial stop */}
      <instancedMesh ref={barRef} args={[undefined, undefined, bars.length]}>
        <boxGeometry args={[0.06, 6.4, 0.06]} />
        <meshBasicMaterial color={SCENE.lightBars} toneMapped={false} />
      </instancedMesh>
      <mesh position={[0, 8.2, -3.2]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[9.5, 0.035, 8, lite ? 96 : 160]} />
        <meshBasicMaterial color={SCENE.ceilingRing} toneMapped={false} />
      </mesh>
    </group>
  );
}
