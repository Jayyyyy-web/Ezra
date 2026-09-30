// The 3D site: ground, process units, flows and camera.
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { UNITS } from '../model/units.js'
import { C, M } from './materials.js'
import Flow from './Flow.jsx'
import PowerSupply from './Energy.jsx'
import {
  CathodeKiln,
  Crystallizer,
  FilterDryer,
  Finishing,
  Kiln,
  Leach,
  OreYard,
  PrecursorReactors,
  Purify,
  Salts,
  SulfateRecovery,
  WaterTreatment,
} from './Units3D.jsx'

// label height and selection ring radius for each unit
const META = {
  ore: { h: 4, r: 6 },
  kiln: { h: 4.2, r: 8.4 },
  leach: { h: 5, r: 5.4 },
  purify: { h: 6, r: 4.4 },
  crystallizer: { h: 8.5, r: 4.4 },
  salts: { h: 4.6, r: 5.4 },
  pcam: { h: 6, r: 5 },
  filter: { h: 5.2, r: 4.8 },
  cam: { h: 4, r: 9.6 },
  finish: { h: 5.6, r: 6 },
  sulfate: { h: 6.4, r: 5.6 },
  water: { h: 4.5, r: 6.6 },
  power: { h: 4.5, r: 12, dx: -8 },
}

const rack = (x1, x2, z, y, a, b) => [a ?? [x1, 2, z], [x1, y, z], [x2, y, z], b ?? [x2, 2, z]]

function Selectable({ unit, selected, hovered, onSelect, onHover, showLabel, children }) {
  const meta = META[unit.id]
  const ring = useRef()
  useFrame((state) => {
    if (!ring.current) return
    const on = selected || hovered
    ring.current.visible = on
    ring.current.material.opacity = selected ? 0.55 + Math.sin(state.clock.elapsedTime * 3) * 0.2 : 0.3
  })
  return (
    <group position={unit.pos}>
      <group
        onClick={(e) => {
          e.stopPropagation()
          onSelect(unit.id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(unit.id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          onHover(null)
          document.body.style.cursor = ''
        }}
      >
        {children}
      </group>
      <mesh ref={ring} position={[meta.dx ?? 0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[meta.r - 0.25, meta.r, 64]} />
        <meshBasicMaterial color={C.select} transparent opacity={0.4} toneMapped={false} />
      </mesh>
      {showLabel && (
        <Html position={[meta.dx ?? 0, meta.h, 0]} center zIndexRange={[20, 0]}>
          <button
            type="button"
            className={`tag${selected ? ' is-on' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(unit.id)
            }}
            onPointerEnter={() => onHover(unit.id)}
            onPointerLeave={() => onHover(null)}
          >
            {unit.name}
          </button>
        </Html>
      )}
    </group>
  )
}

function Focus({ target, controls }) {
  const goal = useRef(new THREE.Vector3(2, 0, 2))
  const active = useRef(false)
  useEffect(() => {
    if (target) {
      goal.current.set(target[0], 1, target[2])
      active.current = true
    }
  }, [target])
  useFrame(() => {
    const c = controls.current
    if (!c || !active.current) return
    c.target.lerp(goal.current, 0.08)
    c.update()
    if (c.target.distanceTo(goal.current) < 0.05) active.current = false
  })
  return null
}

// Portrait screens see less of the wide site, so pull the camera back.
function FitToScreen() {
  const { camera, size } = useThree()
  const aspect = size.width / size.height
  const portrait = aspect < 1.3
  useEffect(() => {
    const k = portrait ? Math.min(2.1, 1.3 / aspect) : 1
    camera.position.set(8 * k, 46 * k, 60 * k)
    camera.updateProjectionMatrix()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, portrait])
  return null
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color={C.ground} roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[260, 260]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#27313a"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#33404b"
        fadeDistance={140}
        infiniteGrid={false}
      />
      {/* roads */}
      {[
        [0, -14, 80, 3],
        [0, 13.5, 80, 3],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.02, z]} receiveShadow material={M.paint(C.road)}>
          <boxGeometry args={[w, 0.04, d]} />
        </mesh>
      ))}
      <mesh position={[31.2, 0.02, 12]} material={M.paint(C.road)}>
        <boxGeometry args={[3, 0.04, 52]} />
      </mesh>
      {/* residue stack beside the leach area */}
      <mesh position={[-6, 1.1, -18]} castShadow receiveShadow material={M.paint('#8a8170')}>
        <coneGeometry args={[3.4, 2.2, 28]} />
      </mesh>
    </group>
  )
}

function Flows({ s, running }) {
  const speed = running ? 0.6 + (s.utilization / 100) * 0.8 : 0
  const list = useMemo(() => {
    const f = [
      // lithium line
      { c: C.ore, p: [[-24.2, 1.3, -8], [-23.4, 1.9, -8]], n: 6 },
      { c: C.ore, p: rack(-9.8, -6, -4.6, 3.8, [-9.8, 2.4, -8], [-6, 1.6, -6]) },
      { c: C.lithium, p: rack(-3.2, 1.5, -4.6, 3.8, [-3.2, 3.3, -8.8], [1.5, 1.9, -6.2]) },
      { c: C.lithium, p: rack(1.5, 7.9, -4.6, 5.4, [1.5, 5, -8.6], [7.9, 7.5, -8]) },
      { c: C.lithium, p: [[7.9, 7.5, -8], [7.9, 7.5, -2.8], [10.2, 7.5, -2.8], [10.2, 1.6, -0.8]], n: 18 },
      // precursor line
      { c: C.nickel, p: rack(-9.4, -4.5, 4.8, 3.4, [-9.4, 2.8, 8], [-4.5, 3.4, 7.1]) },
      { c: C.precursor, p: rack(0.5, 5.8, 4.8, 4.6, [0.5, 3.4, 7.1], [5.8, 2.4, 7.4]) },
      { c: C.precursor, p: [[8.9, 1.4, 9.8], [9.6, 3, 9.8], [9.6, 3, 2.8], [10.2, 1.6, 0.8]], n: 16 },
      // cathode out
      { c: C.cathode, p: [[25.3, 1, 0], [27.3, 1, 0]], n: 6, r: 0.16 },
      // by-products
      { c: C.sulfate, p: [[1.5, 2.6, -5.8], [1.5, 5.2, -5.8], [1.5, 5.2, 17], [-0.2, 3.6, 19]], n: 22, dim: !s.sulfateRecovery },
      { c: C.sulfate, p: [[7, 1.4, 10.6], [7, 3.2, 10.6], [7, 3.2, 19], [4.6, 1.2, 19.5]], n: 12, dim: !s.sulfateRecovery },
      { c: '#8a8170', p: [[-6, 1.2, -9.6], [-6, 2.4, -13], [-6, 2.4, -16]], n: 8 },
      // water
      { c: C.water, p: [[-12.8, 1, 19], [-13.6, 4.2, 19], [-13.6, 4.2, -4.6], [-8.8, 4.2, -4.6], [-8.8, 3.4, -8.8]], n: 26 },
      { c: C.water, p: [[-12.8, 1, 18], [-12.2, 3.8, 14], [-12.2, 3.8, 10], [-12, 2.8, 8]], n: 10 },
      // power
      { c: C.power, p: [[-22, 2.4, 17], [-22, 6.2, 17], [-22, 6.2, 2.6], [18, 6.2, 2.6], [18, 2.5, 0.8]], n: 34, r: 0.07 },
    ]
    if (s.electricKiln) f.push({ c: C.power, p: [[-22, 6.2, -4], [-17, 6.2, -4], [-17, 3.2, -7]], n: 8, r: 0.07 })
    return f
  }, [s.sulfateRecovery, s.electricKiln])

  return list.map((f, i) => (
    <Flow key={i} points={f.p} color={f.c} speed={speed} count={f.n ?? 14} radius={f.r ?? 0.12} active={running} dim={f.dim} />
  ))
}

export default function PlantScene({ result, selected, hovered, onSelect, onHover, showLabels, running }) {
  const s = result.settings
  const controls = useRef()
  const trains = Math.min(6, Math.ceil(s.capacity / 10000))
  const lines = Math.min(3, Math.ceil(s.capacity / 20000))
  const target = selected ? UNITS.find((u) => u.id === selected)?.pos : null

  const body = (id) => {
    switch (id) {
      case 'ore': return <OreYard />
      case 'kiln': return <Kiln settings={s} running={running} />
      case 'leach': return <Leach />
      case 'purify': return <Purify />
      case 'crystallizer': return <Crystallizer settings={s} />
      case 'salts': return <Salts />
      case 'pcam': return <PrecursorReactors trains={trains} running={running} />
      case 'filter': return <FilterDryer />
      case 'cam': return <CathodeKiln lines={lines} running={running} />
      case 'finish': return <Finishing running={running} />
      case 'sulfate': return <SulfateRecovery settings={s} />
      case 'water': return <WaterTreatment settings={s} />
      case 'power': return <PowerSupply source={s.energy} running={running} />
      default: return null
    }
  }

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [8, 46, 60], fov: 38, near: 0.5, far: 500 }}
      onPointerMissed={() => onSelect(null)}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0d1216']} />
      <fog attach="fog" args={['#0d1216', 90, 190]} />
      <hemisphereLight args={['#c4d2de', '#262e35', 1.6]} />
      <FitToScreen />
      <directionalLight
        position={[30, 45, 22]}
        intensity={2.4}
        color="#fff0da"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.0004}
      />
      <Ground />
      {UNITS.map((u) => (
        <Selectable
          key={u.id}
          unit={u}
          selected={selected === u.id}
          hovered={hovered === u.id}
          onSelect={onSelect}
          onHover={onHover}
          showLabel={showLabels}
        >
          {body(u.id)}
        </Selectable>
      ))}
      <Flows s={s} running={running} />
      <OrbitControls
        ref={controls}
        makeDefault
        target={[-4, 0, 3]}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={12}
        maxDistance={180}
        enableDamping
      />
      <Focus target={target} controls={controls} />
    </Canvas>
  )
}
