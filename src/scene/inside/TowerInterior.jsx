// Cutaway of a chlorine drying tower: wet chlorine rises through packing while
// strong sulfuric acid trickles down and soaks up the water.
import { useMemo } from 'react'
import * as THREE from 'three'
import { C } from '../colors.js'
import { M } from '../materials.js'
import Particles, { rand } from './Particles.jsx'
import { Part, Pin, Volume } from './Part.jsx'

const R = 1.5
const H = 8.5
const OPEN = Math.PI * 0.55 // the slice cut out of the front

export function towerInfo(r) {
  const tph = r.production / (8760 * (r.settings.utilization / 100)) // while running
  const acidKg = 12
  const waterKg = 4.3
  return {
    title: 'Inside the drying tower',
    sub: 'Packed column, 98% sulfuric acid',
    reactions: [
      ['Absorption', 'H₂SO₄ (98%) + H₂O → H₂SO₄ (≈70%)'],
      ['Goal', 'Water in chlorine below 20 ppm'],
    ],
    legend: [
      ['Wet chlorine', '#9fd6a0'],
      ['Dry chlorine', C.chlorine],
      ['Water vapour', '#6fb7ff'],
      ['Sulfuric acid', '#e3b34a'],
    ],
    stats: [
      ['Chlorine through', `${tph.toFixed(1)} t/h`],
      ['Water removed', `${waterKg} kg per t`],
      ['Acid used', `${acidKg} kg per t`],
      ['Spent acid strength', '≈ 70%'],
    ],
    parts: {
      packing: { label: 'Packing', text: 'Beds of ceramic saddles and rings give the gas and acid a huge wetted surface to meet on.' },
      acid: { label: 'Acid distributor', text: 'Spreads 98% sulfuric acid evenly over the packing. Acid is so hungry for water that it dries chlorine almost completely.' },
      gasIn: { label: 'Wet chlorine in', text: 'Chlorine arrives from the coolers at about 15 °C, still carrying a few kilograms of water vapour per tonne.' },
      gasOut: { label: 'Dry chlorine out', text: 'Dry chlorine leaves the top. Dry chlorine barely corrodes carbon steel, so the compressors and tanks downstream can be made of ordinary steel.' },
      demister: { label: 'Demister', text: 'A wire-mesh pad that catches acid mist so it is not carried into the compressors.' },
      sump: { label: 'Spent acid', text: 'Diluted acid collects at the bottom at about 70% and is sold or reconcentrated.' },
    },
  }
}

function Packing({ y0, y1, n, ui }) {
  const on = ui.focus === 'packing' || ui.hover === 'packing'
  const matrices = useMemo(() => {
    const out = []
    const d = new THREE.Object3D()
    for (let i = 0; i < n; i++) {
      let a
      do a = rand(0, Math.PI * 2)
      while (Math.abs(((a - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < OPEN / 2 && Math.random() < 0.9)
      const rr = Math.sqrt(Math.random()) * (R - 0.15)
      d.position.set(Math.cos(a) * rr, rand(y0, y1), Math.sin(a) * rr)
      d.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3))
      d.updateMatrix()
      out.push(d.matrix.clone())
    }
    return out
  }, [y0, y1, n])
  return (
    <Part id="packing" ui={ui}>
      <instancedMesh
        args={[null, null, n]}
        ref={(m) => {
          if (!m) return
          matrices.forEach((mx, i) => m.setMatrixAt(i, mx))
          m.instanceMatrix.needsUpdate = true
        }}
      >
        <torusGeometry args={[0.09, 0.035, 6, 10]} />
        <meshStandardMaterial color="#cfc6b6" roughness={0.8} emissive={on ? '#ffd24a' : '#000'} emissiveIntensity={on ? 0.3 : 0} />
      </instancedMesh>
    </Part>
  )
}

export default function TowerInterior({ r, running, ui }) {
  const rate = 0.6 + (r.settings.utilization / 100) * 0.6
  // gas rises from the side inlet to the top outlet, losing its water as it goes
  const gas = useMemo(
    () => ({
      init: () => ({ x: rand(-1.2, 1.2), y: rand(0.8, H - 0.6), z: rand(-1.2, 0.4), v: rand(0.7, 1.2) }),
      step: (p, d) => {
        p.y += p.v * d
        p.x += Math.sin(p.y * 4 + p.z * 3) * d * 0.4
        if (p.y > H - 0.5) Object.assign(p, { y: 0.9, x: rand(-1.2, 1.2), z: rand(-1.2, 0.4) })
      },
    }),
    [],
  )
  const water = useMemo(
    () => ({
      init: () => ({ x: rand(-1.1, 1.1), y: rand(0.8, 4), z: rand(-1.1, 0.4), v: rand(0.7, 1.1) }),
      step: (p, d) => {
        p.y += p.v * d
        // water vapour is caught by the acid in the lower bed
        p.hidden = p.y > 3.9
        if (p.y > 5.2) Object.assign(p, { y: 0.9, x: rand(-1.1, 1.1) })
      },
    }),
    [],
  )
  const acid = useMemo(
    () => ({
      init: () => ({ x: rand(-1.2, 1.2), y: rand(0.6, 7), z: rand(-1.2, 0.4), v: rand(1.4, 2.2) }),
      step: (p, d) => {
        p.y -= p.v * d
        if (p.y < 0.6) Object.assign(p, { y: 7, x: rand(-1.2, 1.2), z: rand(-1.2, 0.4) })
      },
    }),
    [],
  )
  const on = (id) => ui.focus === id || ui.hover === id
  return (
    <group position={[0, -0.6, 0]}>
      {/* shell with the front sliced open */}
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[R, R, H, 48, 1, true, OPEN / 2, Math.PI * 2 - OPEN]} />
        <meshStandardMaterial color="#aab3bb" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0]} material={M.steelDark()}>
        <cylinderGeometry args={[R, R, 0.1, 48]} />
      </mesh>
      <mesh position={[0, H, 0]} material={M.steelDark()}>
        <sphereGeometry args={[R, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      <Packing y0={1.3} y1={3.4} n={420} ui={ui} />
      <Packing y0={4.3} y1={6.3} n={400} ui={ui} />

      {/* acid distributors */}
      <Part id="acid" ui={ui}>
        {[3.8, 6.8].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[R - 0.1, R - 0.1, 0.06, 36]} />
            <meshStandardMaterial color="#8c7c5f" metalness={0.4} roughness={0.5} emissive={on('acid') ? '#ffd24a' : '#000'} emissiveIntensity={0.3} />
          </mesh>
        ))}
      </Part>
      <Part id="demister" ui={ui}>
        <mesh position={[0, 7.5, 0]}>
          <cylinderGeometry args={[R - 0.05, R - 0.05, 0.3, 36, 2]} />
          <meshBasicMaterial color={on('demister') ? '#ffd24a' : '#9aa3aa'} wireframe />
        </mesh>
      </Part>
      <Part id="sump" ui={ui}>
        <Volume from={[-1.05, 0.05, -1.05]} to={[1.05, 0.6, 1.05]} color="#8a6a2a" opacity={on('sump') ? 0.7 : 0.5} emissive={0.3} />
      </Part>

      {/* nozzles */}
      <Part id="gasIn" ui={ui}>
        <mesh position={[-2.2, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.28, 0.28, 1.6, 16]} />
          <meshStandardMaterial color="#9fd6a0" emissive="#9fd6a0" emissiveIntensity={on('gasIn') ? 0.9 : 0.3} />
        </mesh>
      </Part>
      <Part id="gasOut" ui={ui}>
        <mesh position={[0, H + 1.9, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 1.6, 16]} />
          <meshStandardMaterial color={C.chlorine} emissive={C.chlorine} emissiveIntensity={on('gasOut') ? 1 : 0.4} />
        </mesh>
      </Part>
      <mesh position={[2.2, 6.9, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 1.6, 12]} />
        <meshStandardMaterial color="#e3b34a" emissive="#e3b34a" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[2.2, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 1.6, 12]} />
        <meshStandardMaterial color="#8a6a2a" emissive="#8a6a2a" emissiveIntensity={0.4} />
      </mesh>

      <Particles count={160} {...gas} color={C.chlorine} size={0.06} glow={1} running={running} rate={rate} opacity={0.85} />
      <Particles count={70} {...water} color="#6fb7ff" size={0.04} glow={1.8} running={running} rate={rate} />
      <Particles count={140} {...acid} color="#e3b34a" size={0.04} glow={1.4} running={running} rate={rate} />

      <Pin id="gasOut" label="Dry Cl₂ out" position={[0, H + 3, 0]} ui={ui} />
      <Pin id="demister" label="Demister" position={[-2.3, 7.5, 1]} ui={ui} />
      <Pin id="acid" label="98% acid in" position={[3.3, 6.9, 0]} ui={ui} />
      <Pin id="packing" label="Packing" position={[-2.5, 5.2, 1]} ui={ui} />
      <Pin id="gasIn" label="Wet Cl₂ in" position={[-3.4, 0.9, 0]} ui={ui} />
      <Pin id="sump" label="Spent acid" position={[3.2, 0.3, 0]} ui={ui} />
    </group>
  )
}
