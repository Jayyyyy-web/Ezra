// The 3D site: ground, process units, flows and camera.
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, Html, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import Backdrop from './Backdrop.jsx'
import { INSIDE } from './inside/index.js'
import * as THREE from 'three'
import { UNITS, field } from '../model/units.js'
import { C, M } from './materials.js'
import Flow from './Flow.jsx'
import PowerSupply from './Energy.jsx'
import {
  BrinePurification,
  CausticEvaporator,
  CellRoom,
  ChlorineDrying,
  Dechlorination,
  GasUnit,
  Liquefaction,
  Rectifiers,
  SaltDome,
  WaterTreatment,
} from './Units3D.jsx'

// label height and selection ring radius for each unit
function metaFor(id, r) {
  const s = r.settings
  switch (id) {
    case 'salt': return { h: 5.2, r: 6.4 }
    case 'brine': return { h: 5.6, r: 6.6 }
    case 'rectifier': return { h: 4.4, r: 5 }
    case 'dechlor': return { h: 7.6, r: 4.6 }
    case 'cells': {
      const shown = Math.max(1, Math.min(18, r.stacks))
      const rows = shown > 9 ? 2 : 1
      const w = Math.ceil(shown / rows) * 1.9 + 3
      const d = rows * 8 + 1.5
      return { h: 6.8, r: Math.hypot(w, d) / 2 + 0.4 }
    }
    case 'chlorine': return { h: 8.2, r: 5.2 }
    case 'liquefy': return { h: 4.8, r: 6.6 }
    case 'caustic': return { h: 5.2, r: 5.2 }
    case 'gas': {
      const h = s.cell === 'odc' ? 10.2 : s.h2Use === 'vent' ? 15.4 : s.h2Use === 'boiler' ? 10.4 : 4.4
      return { h, r: 5.2 }
    }
    case 'water': return { h: 4.4, r: 5.4 }
    case 'power': return { h: 4.5, r: 12, dx: -8 }
    default: return { h: 4, r: 5 }
  }
}

const rack = (x1, x2, z, y, a, b) => [a ?? [x1, 2, z], [x1, y, z], [x2, y, z], b ?? [x2, 2, z]]

function Selectable({ unit, meta, name, selected, hovered, onSelect, onHover, onEnter, showLabel, children }) {
  const inside = Boolean(INSIDE[unit.id])
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
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (inside) onEnter(unit.id)
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
        <Html position={[meta.dx ?? 0, meta.h, 0]} center zIndexRange={[8, 0]}>
          <button
            type="button"
            className={`tag${selected ? ' is-on' : ''}${inside ? ' has-inside' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(unit.id)
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              if (inside) onEnter(unit.id)
            }}
            onPointerEnter={() => onHover(unit.id)}
            onPointerLeave={() => onHover(null)}
          >
            {name}
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

// Frame the site in the part of the screen the floating panels leave open:
// pull the camera back when that gap is narrow, and shift the picture so the
// site sits in the middle of the gap rather than behind a panel.
function FitToScreen({ insets }) {
  const { camera, size } = useThree()
  const left = insets?.left ?? 0
  const right = insets?.right ?? 0
  useEffect(() => {
    const visible = Math.max(200, size.width - left - right)
    const aspect = visible / size.height
    const k = aspect < 1.45 ? Math.min(2.1, 1.45 / aspect) : 1
    camera.position.set(8 * k, 46 * k, 60 * k)
    const shift = (left - right) / 2
    if (shift) camera.setViewOffset(size.width, size.height, -shift, 0, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height, left, right])
  return null
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[700, 700]} />
        <meshStandardMaterial color={C.ground} roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[260, 260]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#1a232b"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#24313c"
        fadeDistance={170}
        infiniteGrid={false}
      />
      {/* roads */}
      {[
        [0, -17.5, 84, 3],
        [0, 17.6, 84, 2.6],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.02, z]} receiveShadow material={M.paint(C.road)}>
          <boxGeometry args={[w, 0.04, d]} />
        </mesh>
      ))}
      <mesh position={[37.5, 0.02, 0]} material={M.paint(C.road)}>
        <boxGeometry args={[3, 0.04, 38]} />
      </mesh>
    </group>
  )
}

function Flows({ r, running }) {
  const s = r.settings
  const speed = running ? 0.6 + (s.utilization / 100) * 0.8 : 0
  const odc = s.cell === 'odc'
  const needEvap = r.waterEvap > 0
  const list = useMemo(() => {
    const depleted = '#4aa3b3'
    const f = [
      // brine loop
      { c: C.salt, p: [[-29.4, 1.6, -7], [-27.6, 2.3, -7]], n: 6 },
      { c: C.brine, p: [[-26.8, 2.4, -7], [-26.8, 3.8, -7], [-22.2, 3.8, -7], [-22.2, 1.6, -7.4]], n: 10 },
      { c: C.brine, p: [[-16, 3.6, -5.1], [-16, 4.8, -5.1], [-16, 4.8, 0], [-6.6, 4.8, 0], [-6.6, 2.2, 0]], n: 18 },
      { c: depleted, p: [[-6.6, 1.4, 2], [-10.5, 3.2, 2], [-10.5, 3.2, 5], [-17.4, 3.2, 5], [-18.6, 2.3, 4.4]], n: 14 },
      { c: depleted, p: [[-21.4, 6.6, 5], [-26.8, 6.6, 5], [-26.8, 6.6, -5.4], [-26.8, 2.8, -6.4]], n: 16 },
      // chlorine
      { c: C.chlorine, p: [[4, 2.3, -4], [4, 6, -4], [12.5, 6, -4], [12.5, 6, -10], [14.6, 4.2, -10]], n: 18 },
      { c: C.chlorine, p: [[19.5, 6.9, -10.4], [19.5, 7.4, -12.4], [26, 7.4, -12.4], [26, 3.2, -12.4]], n: 12 },
      // caustic
      { c: C.caustic, p: [[4, 1, 4], [11, 3.4, 4], [11, 3.4, 9.2], [14.6, 2.4, 9.2]], n: 12 },
      { c: C.caustic, p: [[17.6, 2.2, 9.2], [18.6, 3.6, 10.6], [19.8, 3.6, 11.2]], n: 5 },
      // water and power
      { c: C.water, p: [[-4, 1.4, 19.4], [-4, 4.2, 19.4], [-4, 4.2, 9.6], [-2, 2.4, 8.4]], n: 12 },
      { c: C.power, p: [[-24, 2.4, 20], [-24, 6.2, 20], [-24, 6.2, 13.2], [-16.4, 6.2, 13.2], [-15.8, 2.9, 11.4]], n: 22, r: 0.07 },
      { c: C.power, p: [[-10.2, 3.3, 14.8], [-8.4, 3.3, 14.8], [-8.4, 1, 9.4], [-6.6, 0.8, 8.4]], n: 10, r: 0.11 },
    ]
    // hydrogen goes out to its use, oxygen comes in from the air separation unit
    const gasPath = [[4, 2.3, 4], [4, 6.6, 4], [24.4, 6.6, 4], [24.4, 6.6, 10], [27.4, 2.6, 10]]
    f.push(odc ? { c: C.oxygen, p: [...gasPath].reverse(), n: 20 } : { c: C.hydrogen, p: gasPath, n: 20, dim: s.h2Use === 'vent' })
    if (needEvap && !s.mvr) f.push({ c: C.steam, p: [[29, 2.6, 7.6], [24.8, 4.4, 7.6], [17.2, 4.4, 7.6], [16.4, 3.2, 8.8]], n: 10, dim: true, r: 0.09 })
    return f
  }, [odc, needEvap, s.mvr, s.h2Use])

  return list.map((f, i) => (
    <Flow key={`${s.cell}-${i}`} points={f.p} color={f.c} speed={speed} count={f.n ?? 14} radius={f.r ?? 0.12} active={running} dim={f.dim} />
  ))
}

export default function PlantScene({ result, selected, hovered, onSelect, onHover, onEnter, showLabels, running, glow = true, insets }) {
  const s = result.settings
  const controls = useRef()
  const target = selected ? UNITS.find((u) => u.id === selected)?.pos : null

  const body = (id) => {
    switch (id) {
      case 'salt': return <SaltDome />
      case 'brine': return <BrinePurification />
      case 'rectifier': return <Rectifiers />
      case 'cells': return <CellRoom cell={s.cell} stacks={result.stacks} />
      case 'dechlor': return <Dechlorination />
      case 'chlorine': return <ChlorineDrying />
      case 'liquefy': return <Liquefaction running={running} />
      case 'caustic': return <CausticEvaporator mvr={s.mvr} needed={result.waterEvap > 0} />
      case 'gas': return <GasUnit cell={s.cell} h2Use={s.h2Use} running={running} />
      case 'water': return <WaterTreatment />
      case 'power': return <PowerSupply source={s.energy} running={running} />
      default: return null
    }
  }

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [8, 46, 60], fov: 38, near: 0.5, far: 1000 }}
      onPointerMissed={() => onSelect(null)}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#03050a']} />
      <fog attach="fog" args={['#0a1119', 110, 290]} />
      <hemisphereLight args={['#9fb4cc', '#161c22', 1.25]} />
      <FitToScreen insets={insets} />
      <Backdrop />
      {/* warm site floodlights */}
      {[[-20, 9, -2], [8, 10, -12], [8, 10, 12], [28, 9, 0]].map((p, i) => (
        <pointLight key={i} position={p} intensity={60} distance={34} decay={1.6} color="#ffcf9a" />
      ))}
      <directionalLight
        position={[-40, 60, -30]}
        intensity={1.5}
        color="#cfdcff"
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
          meta={metaFor(u.id, result)}
          name={field(u.name, result)}
          selected={selected === u.id}
          hovered={hovered === u.id}
          onSelect={onSelect}
          onHover={onHover}
          onEnter={onEnter}
          showLabel={showLabels}
        >
          {body(u.id)}
        </Selectable>
      ))}
      <Flows r={result} running={running} />
      <OrbitControls
        ref={controls}
        makeDefault
        target={[-4, 0, 3]}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={12}
        maxDistance={200}
        enableDamping
      />
      <Focus target={target} controls={controls} />
      <EffectComposer multisampling={0} enabled={glow}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.95} luminanceSmoothing={0.2} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.3} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  )
}
