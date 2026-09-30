// Cutaway of one electrolysis cell. The layout changes with the cell technology:
// membrane and ODC cells stand upright either side of a thin membrane, a
// diaphragm cell has a thick porous wall, and a mercury cell lies flat over a
// flowing mercury floor.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../colors.js'
import { M, mat } from '../materials.js'
import Particles, { rand } from './Particles.jsx'
import { Part, Pin, Volume } from './Part.jsx'

const ION = { na: '#ffb35c', cl: '#b9e04a', oh: '#c7a4ff' }

// ---------- panel content ----------
export function cellInfo(r) {
  const s = r.settings
  const c = r.cell
  const elementKA = s.j * (c.elementM2 ?? 2.7)
  const kgPerHour = elementKA * c.ce * 1.323
  const base = {
    title: 'Inside an electrolysis cell',
    sub: c.label,
    legend: [
      ['Sodium ion Na⁺', ION.na],
      ['Chloride ion Cl⁻', ION.cl],
      ...(s.cell === 'mercury' ? [] : [['Hydroxide ion OH⁻', ION.oh]]),
      ['Chlorine gas', C.chlorine],
      [s.cell === 'odc' ? 'Oxygen' : 'Hydrogen gas', s.cell === 'odc' ? C.oxygen : C.hydrogen],
    ],
    stats: [
      [c.perStack > 1 ? 'Current per element' : 'Current per cell', `${elementKA.toFixed(1)} kA`],
      ['Chlorine per hour', `${kgPerHour.toFixed(1)} kg`],
      ['Current efficiency', `${Math.round(c.ce * 100)}%`],
      ['Temperature', s.cell === 'mercury' ? '75 °C' : '88 °C'],
    ],
  }
  const reactions = {
    anode: ['Anode (+)', '2 Cl⁻ → Cl₂ + 2 e⁻'],
    cathode: ['Cathode (−)', '2 H₂O + 2 e⁻ → H₂ + 2 OH⁻'],
    odcCathode: ['Cathode (−)', '½ O₂ + H₂O + 2 e⁻ → 2 OH⁻'],
    hgCathode: ['Cathode (−)', 'Na⁺ + e⁻ + Hg → Na·Hg'],
    decomposer: ['Decomposer', '2 Na·Hg + 2 H₂O → 2 NaOH + H₂ + 2 Hg'],
  }
  if (s.cell === 'mercury') {
    return {
      ...base,
      reactions: [reactions.anode, reactions.hgCathode, reactions.decomposer],
      parts: {
        anode: { label: 'Anodes', text: 'Coated titanium anodes hang a few millimetres above the mercury. Chlorine forms on their undersides and bubbles up through the brine.' },
        mercury: { label: 'Mercury cathode', text: 'A thin sheet of mercury flows along the sloped floor. Sodium dissolves into it as an amalgam instead of reacting with water, so no hydrogen forms in the cell.' },
        brine: { label: 'Brine', text: 'Saturated salt water flows over the mercury. About 15% of its salt is used per pass.' },
        decomposer: { label: 'Decomposer', text: 'The amalgam meets water over graphite. Sodium turns into 50% caustic and hydrogen, and clean mercury is pumped back to the cell.' },
      },
    }
  }
  const parts = {
    anode: { label: 'Anode (+)', text: 'Titanium mesh coated with ruthenium and iridium oxides. Chloride ions give up electrons here and pair up into chlorine gas.' },
    brine: { label: 'Brine side', text: 'Saturated brine at about 300 g/L flows in. It leaves at about 200 g/L as depleted brine that is re-saturated and reused.' },
    caustic: { label: 'Caustic side', text: 'Caustic soda builds up to about 32% on this side of the cell.' },
    separator:
      s.cell === 'diaphragm'
        ? { label: 'Diaphragm', text: 'A porous wall a few millimetres thick. Brine seeps through it, so the caustic that comes out is weak (about 11%) and salty.' }
        : { label: 'Membrane', text: 'A perfluorinated ion-exchange membrane about 0.2 mm thick. It lets sodium ions through but blocks chloride and hydroxide, so the caustic comes out pure.' },
    cathode:
      s.cell === 'odc'
        ? { label: 'Gas diffusion cathode (−)', text: 'A porous silver cathode fed with oxygen from behind. Oxygen is reduced instead of water, so no hydrogen forms, and the cell voltage drops by about 0.9 V.' }
        : { label: 'Cathode (−)', text: 'Nickel mesh. Water is split into hydrogen gas and hydroxide ions.' },
  }
  if (s.cell === 'odc') parts.oxygen = { label: 'Oxygen chamber', text: 'Oxygen from the air separation unit is fed behind the gas diffusion electrode.' }
  return { ...base, reactions: [reactions.anode, s.cell === 'odc' ? reactions.odcCathode : reactions.cathode], parts }
}

// ---------- shared shell ----------
function Shell({ w = 7, h = 5, d = 2.4 }) {
  const x = w / 2
  const edge = mat('#ff8a3d', { emissive: '#ff8a3d', emissiveIntensity: 0.6 })
  return (
    <group>
      <mesh position={[0, h / 2, -d / 2 - 0.06]} material={M.steelDark()} receiveShadow>
        <boxGeometry args={[w + 0.4, h + 0.3, 0.12]} />
      </mesh>
      <mesh position={[0, -0.05, 0]} material={M.steelDark()} receiveShadow>
        <boxGeometry args={[w + 0.4, 0.1, d + 0.2]} />
      </mesh>
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * (x + 0.12), h / 2, 0]} material={M.steel()} castShadow>
          <boxGeometry args={[0.24, h + 0.3, d + 0.2]} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.1, -0.2]} material={M.steelDark()}>
        <boxGeometry args={[w + 0.4, 0.12, d - 0.2]} />
      </mesh>
      {/* glowing cut line where the front has been sliced away */}
      {[
        [0, 0, w + 0.4, 0.05],
        [0, h + 0.15, w + 0.4, 0.05],
      ].map(([px, py, lw, lh], i) => (
        <mesh key={i} position={[px, py, d / 2 + 0.06]} material={edge}>
          <boxGeometry args={[lw, lh, 0.02]} />
        </mesh>
      ))}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * (x + 0.24), h / 2, d / 2 + 0.06]} material={edge}>
          <boxGeometry args={[0.05, h + 0.3, 0.02]} />
        </mesh>
      ))}
    </group>
  )
}

function Mesh({ x, color, ui, id, h = 4.4, d = 2.2, dark }) {
  const on = ui.focus === id || ui.hover === id
  return (
    <Part id={id} ui={ui}>
      <mesh position={[x, h / 2 + 0.2, 0]}>
        <boxGeometry args={[0.06, h, d]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.35} emissive={on ? '#ffd24a' : '#000'} emissiveIntensity={on ? 0.35 : 0} />
      </mesh>
      <mesh position={[x + (dark ? 0 : 0.035), h / 2 + 0.2, 0]}>
        <planeGeometry args={[d, h, 14, 24]} />
        <meshBasicMaterial color={dark ? '#1b2026' : '#9aa6b0'} wireframe transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </Part>
  )
}

function Pipe({ from, to, color, r = 0.12 }) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const len = a.distanceTo(b)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[r, r, len, 12]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} emissive={color} emissiveIntensity={0.25} />
    </mesh>
  )
}

// ---------- upright cells: membrane, ODC, diaphragm ----------
function UprightCell({ r, running, ui }) {
  const s = r.settings
  const odc = s.cell === 'odc'
  const dia = s.cell === 'diaphragm'
  const load = s.j / r.cell.j[1] // 0..1 how hard the cell is driven
  const rate = 0.45 + load * 1.2
  const sepOn = ui.focus === 'separator' || ui.hover === 'separator'

  // anode sits just left of the separator, cathode just right
  const ax = -0.32
  const cx = odc ? 0.6 : 0.32
  const liquidTop = 4.3

  const cl2 = useMemo(
    () => ({
      init: () => ({ x: rand(-1.3, ax - 0.08), y: rand(0.2, liquidTop), z: rand(-1, 1), v: rand(0.8, 1.6), s: 0.6 }),
      step: (p, d) => {
        p.y += p.v * d
        p.s = 0.5 + (p.y / liquidTop) * 0.9
        p.x += Math.sin(p.y * 3 + p.z) * d * 0.15
        if (p.y > liquidTop) Object.assign(p, { y: 0.25, x: rand(-1.3, ax - 0.08), z: rand(-1, 1) })
      },
    }),
    [ax],
  )
  const h2 = useMemo(
    () => ({
      init: () => ({ x: rand(cx + 0.08, 1.4), y: rand(0.2, liquidTop), z: rand(-1, 1), v: rand(1, 1.9), s: 0.5 }),
      step: (p, d) => {
        p.y += p.v * d
        p.s = 0.4 + (p.y / liquidTop) * 0.7
        if (p.y > liquidTop) Object.assign(p, { y: 0.25, x: rand(cx + 0.08, 1.4), z: rand(-1, 1) })
      },
    }),
    [cx],
  )
  // sodium ions drift from the brine, through the separator, into the caustic
  const na = useMemo(
    () => ({
      init: () => ({ x: rand(-3.2, 3.2), y: rand(0.4, 4), z: rand(-1, 1), v: rand(0.5, 0.9) }),
      step: (p, d) => {
        const inWall = Math.abs(p.x) < (dia ? 0.2 : 0.06)
        p.x += p.v * d * (inWall ? 0.35 : 1)
        if (p.x > 3.2) Object.assign(p, { x: -3.2, y: rand(0.4, 4), z: rand(-1, 1) })
      },
    }),
    [dia],
  )
  // chloride ions head for the anode and disappear there (they become chlorine)
  const cl = useMemo(
    () => ({
      init: () => ({ x: rand(-3.2, ax), y: rand(0.4, 4), z: rand(-1, 1), v: rand(0.4, 0.8) }),
      step: (p, d) => {
        p.x += p.v * d
        if (p.x > ax - 0.02) Object.assign(p, { x: -3.2, y: rand(0.4, 4), z: rand(-1, 1) })
      },
    }),
    [ax],
  )
  // hydroxide ions form at the cathode and spread into the caustic
  const oh = useMemo(
    () => ({
      init: () => ({ x: rand(cx, 3.2), y: rand(0.4, 4), z: rand(-1, 1), v: rand(0.3, 0.6) }),
      step: (p, d) => {
        p.x += p.v * d
        if (p.x > 3.3) Object.assign(p, { x: cx + 0.05, y: rand(0.4, 4), z: rand(-1, 1) })
      },
    }),
    [cx],
  )
  const o2 = useMemo(
    () => ({
      init: () => ({ x: rand(0.9, 3.3), y: rand(0.4, 4.2), z: rand(-1, 1), v: rand(0.5, 1) }),
      step: (p, d) => {
        p.x -= p.v * d
        if (p.x < cx + 0.12) Object.assign(p, { x: 3.3, y: rand(0.4, 4.2), z: rand(-1, 1) })
      },
    }),
    [cx],
  )

  const nBubbles = Math.round(40 + load * 90)

  return (
    <group>
      <Shell />
      {/* liquids */}
      <Part id="brine" ui={ui}>
        <Volume from={[-3.45, 0.02, -1.15]} to={[-0.07, liquidTop, 1.15]} color={C.brine} opacity={ui.focus === 'brine' ? 0.3 : 0.13} />
      </Part>
      <Part id="caustic" ui={ui}>
        <Volume
          from={[odc ? 0.07 : dia ? 0.14 : 0.07, 0.02, -1.15]}
          to={[odc ? cx - 0.08 : 3.45, liquidTop, 1.15]}
          color={dia ? '#8f9cf0' : C.caustic}
          opacity={ui.focus === 'caustic' ? 0.32 : 0.15}
        />
      </Part>
      <Volume from={[-3.45, liquidTop, -1.15]} to={[-0.07, 4.95, 1.15]} color={C.chlorine} opacity={0.08} />
      {odc ? (
        <Part id="oxygen" ui={ui}>
          <Volume from={[cx + 0.1, 0.02, -1.15]} to={[3.45, 4.95, 1.15]} color={C.oxygen} opacity={ui.focus === 'oxygen' ? 0.2 : 0.07} />
        </Part>
      ) : (
        <Volume from={[0.07, liquidTop, -1.15]} to={[3.45, 4.95, 1.15]} color={C.hydrogen} opacity={0.07} />
      )}

      {/* separator */}
      <Part id="separator" ui={ui}>
        <mesh position={[0, 2.5, 0]}>
          <boxGeometry args={[dia ? 0.26 : 0.03, 4.9, 2.3]} />
          <meshStandardMaterial
            color={dia ? '#9aa3a0' : '#f0c25a'}
            emissive={sepOn ? '#ffd24a' : dia ? '#000' : '#f0a93a'}
            emissiveIntensity={sepOn ? 0.6 : dia ? 0 : 0.25}
            transparent={!dia}
            opacity={dia ? 1 : 0.55}
            roughness={dia ? 0.95 : 0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Part>

      <Mesh id="anode" x={ax} color="#6f7f94" ui={ui} />
      {odc ? (
        <Part id="cathode" ui={ui}>
          <mesh position={[cx, 2.4, 0]}>
            <boxGeometry args={[0.14, 4.6, 2.25]} />
            <meshStandardMaterial
              color="#c9ced4"
              metalness={0.6}
              roughness={0.7}
              emissive={ui.focus === 'cathode' || ui.hover === 'cathode' ? '#ffd24a' : '#000'}
              emissiveIntensity={0.35}
            />
          </mesh>
        </Part>
      ) : (
        <Mesh id="cathode" x={cx} color="#aeb7bf" ui={ui} />
      )}

      {/* pipes: brine in, chlorine out, caustic out, hydrogen out or oxygen in */}
      <Pipe from={[-2.6, -0.6, 0]} to={[-2.6, 0.1, 0]} color={C.brine} />
      <Pipe from={[-2.2, 4.9, 0]} to={[-2.2, 6, 0]} color={C.chlorine} r={0.16} />
      <Pipe from={[2.6, 4.9, 0]} to={[2.6, 6, 0]} color={odc ? C.oxygen : C.hydrogen} r={0.14} />
      <Pipe from={[dia ? 2.6 : odc ? 0.35 : 1.8, -0.6, 0]} to={[dia ? 2.6 : odc ? 0.35 : 1.8, 0.1, 0]} color={C.caustic} />
      {/* busbars */}
      <mesh position={[-3.75, 2.5, 0]} material={M.glow('#ff5a4a', 0.5)}>
        <boxGeometry args={[0.08, 1.2, 0.6]} />
      </mesh>
      <mesh position={[3.75, 2.5, 0]} material={M.glow('#4a8cff', 0.5)}>
        <boxGeometry args={[0.08, 1.2, 0.6]} />
      </mesh>

      <Particles count={nBubbles} {...cl2} color={C.chlorine} size={0.07} glow={0.9} running={running} rate={rate} opacity={0.85} />
      {!odc && <Particles count={Math.round(nBubbles * 1.1)} {...h2} color={C.hydrogen} size={0.055} glow={0.9} running={running} rate={rate} opacity={0.85} />}
      {odc && <Particles count={40} {...o2} color={C.oxygen} size={0.05} glow={1.2} running={running} rate={rate} />}
      <Particles count={26} {...na} color={ION.na} size={0.06} glow={2} running={running} rate={rate} />
      <Particles count={20} {...cl} color={ION.cl} size={0.05} glow={1.6} running={running} rate={rate} />
      <Particles count={odc ? 10 : 22} {...oh} color={ION.oh} size={0.05} glow={1.6} running={running} rate={rate} />

      <Pin id="anode" label="Anode +" position={[ax - 0.4, 5.4, 1]} ui={ui} />
      <Pin id="separator" label={dia ? 'Diaphragm' : 'Membrane'} position={[0, 5.6, 1.1]} ui={ui} />
      <Pin id="cathode" label="Cathode −" position={[cx + 0.5, 5.4, 1]} ui={ui} />
      <Pin id="brine" label="Brine" position={[-2.3, 1.2, 1.2]} ui={ui} />
      <Pin id="caustic" label="Caustic" position={[odc ? 0.35 : 2.3, 1.2, 1.2]} ui={ui} />
      {odc && <Pin id="oxygen" label="Oxygen" position={[2.3, 3, 1.2]} ui={ui} />}
    </group>
  )
}

// ---------- mercury cell ----------
function MercuryCell({ r, running, ui }) {
  const load = r.settings.j / r.cell.j[1]
  const rate = 0.45 + load * 1.2
  const hg = useRef()
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = 128
    cv.height = 8
    const g = cv.getContext('2d')
    for (let i = 0; i < 128; i++) {
      const v = 170 + Math.round(Math.sin(i * 0.3) * 40 + Math.sin(i * 1.7) * 20)
      g.fillStyle = `rgb(${v},${v + 6},${v + 12})`
      g.fillRect(i, 0, 1, 8)
    }
    const t = new THREE.CanvasTexture(cv)
    t.wrapS = THREE.RepeatWrapping
    t.repeat.set(3, 1)
    return t
  }, [])
  useFrame((_, dt) => {
    if (running) tex.offset.x -= dt * 0.15 * rate
  })
  const anodes = [-2.4, -0.8, 0.8, 2.4]
  const cl2 = useMemo(
    () => ({
      init: () => ({ x: anodes[Math.floor(Math.random() * 4)] + rand(-0.55, 0.55), y: rand(0.5, 3.4), z: rand(-0.9, 0.9), v: rand(0.8, 1.4) }),
      step: (p, d) => {
        p.y += p.v * d
        if (p.y > 3.4) Object.assign(p, { y: 0.45, x: anodes[Math.floor(Math.random() * 4)] + rand(-0.55, 0.55) })
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  // sodium ions sink into the mercury, then ride along it as amalgam
  const na = useMemo(
    () => ({
      init: () => ({ x: rand(-3, 3), y: rand(0.3, 2.4), z: rand(-0.9, 0.9), v: rand(0.5, 0.9), inHg: false }),
      step: (p, d) => {
        if (!p.inHg) {
          p.y -= p.v * d
          if (p.y < 0.28) p.inHg = true
        } else {
          p.y = 0.24
          p.x += 0.9 * d
          if (p.x > 4.4) Object.assign(p, { x: rand(-3, 3), y: 2.4, inHg: false })
        }
      },
    }),
    [],
  )
  const h2 = useMemo(
    () => ({
      init: () => ({ x: rand(4.7, 5.3), y: rand(0.3, 4), z: rand(-0.4, 0.4), v: rand(0.8, 1.4) }),
      step: (p, d) => {
        p.y += p.v * d
        if (p.y > 4.2) p.y = 0.3
      },
    }),
    [],
  )
  const on = (id) => ui.focus === id || ui.hover === id
  return (
    <group>
      {/* trough */}
      <mesh position={[0, -0.05, 0]} material={M.steelDark()}>
        <boxGeometry args={[7.6, 0.1, 2.4]} />
      </mesh>
      <mesh position={[0, 1.2, -1.25]} material={M.steelDark()}>
        <boxGeometry args={[7.6, 2.5, 0.1]} />
      </mesh>
      <Part id="mercury" ui={ui}>
        <mesh ref={hg} position={[0, 0.18, 0]}>
          <boxGeometry args={[7.4, 0.14, 2.3]} />
          <meshStandardMaterial map={tex} metalness={1} roughness={0.08} emissive={on('mercury') ? '#ffd24a' : '#8f99a3'} emissiveIntensity={on('mercury') ? 0.4 : 0.15} />
        </mesh>
      </Part>
      <Part id="brine" ui={ui}>
        <Volume from={[-3.7, 0.25, -1.15]} to={[3.7, 2.3, 1.15]} color={C.brine} opacity={ui.focus === 'brine' ? 0.32 : 0.18} />
      </Part>
      <Volume from={[-3.7, 2.3, -1.15]} to={[3.7, 3.5, 1.15]} color={C.chlorine} opacity={0.08} />
      <Part id="anode" ui={ui}>
        {anodes.map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 0.6, 0]}>
              <boxGeometry args={[1.3, 0.12, 2]} />
              <meshStandardMaterial color="#56657a" metalness={0.7} roughness={0.4} emissive={on('anode') ? '#ffd24a' : '#000'} emissiveIntensity={0.35} />
            </mesh>
            <mesh position={[0, 2.2, 0]} material={M.steel()}>
              <cylinderGeometry args={[0.08, 0.08, 3.1, 8]} />
            </mesh>
          </group>
        ))}
      </Part>
      <mesh position={[0, 3.8, -0.2]} material={M.glow('#ff5a4a', 1)}>
        <boxGeometry args={[7, 0.1, 0.3]} />
      </mesh>
      {/* decomposer */}
      <Part id="decomposer" ui={ui}>
        <mesh position={[5, 2.1, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 4.2, 20, 1, true, Math.PI * 0.1, Math.PI * 1.4]} />
          <meshStandardMaterial color="#8d969e" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} emissive={on('decomposer') ? '#ffd24a' : '#000'} emissiveIntensity={0.3} />
        </mesh>
        <Volume from={[4.4, 0, -0.5]} to={[5.6, 2.2, 0.5]} color={C.caustic} opacity={0.25} />
      </Part>
      <Pipe from={[3.7, 0.2, 0]} to={[4.4, 0.2, 0]} color={C.mercury} r={0.1} />
      <Pipe from={[5, 4.2, 0]} to={[5, 5.2, 0]} color={C.hydrogen} r={0.12} />
      <Pipe from={[-1, 3.5, 0]} to={[-1, 4.8, 0]} color={C.chlorine} r={0.16} />

      <Particles count={Math.round(40 + load * 80)} {...cl2} color={C.chlorine} size={0.07} glow={0.9} running={running} rate={rate} opacity={0.85} />
      <Particles count={30} {...na} color={ION.na} size={0.06} glow={2} running={running} rate={rate} />
      <Particles count={30} {...h2} color={C.hydrogen} size={0.05} glow={1} running={running} rate={rate} />

      <Pin id="anode" label="Anodes +" position={[-2.4, 4.3, 1]} ui={ui} />
      <Pin id="mercury" label="Mercury −" position={[0.8, -0.4, 1.3]} ui={ui} />
      <Pin id="brine" label="Brine" position={[-3, 1.6, 1.3]} ui={ui} />
      <Pin id="decomposer" label="Decomposer" position={[5, 5.6, 0.6]} ui={ui} />
    </group>
  )
}

export default function CellInterior({ r, running, ui }) {
  return r.settings.cell === 'mercury' ? <MercuryCell r={r} running={running} ui={ui} /> : <UprightCell r={r} running={running} ui={ui} />
}
