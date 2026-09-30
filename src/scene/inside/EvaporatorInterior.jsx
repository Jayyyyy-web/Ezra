// Cutaway of the caustic evaporator: weak caustic boils in a tube bundle, the
// water leaves as vapour and 50% caustic runs out of the bottom. With MVR a
// compressor squeezes the vapour and sends it back as the heating medium.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C } from '../colors.js'
import { M } from '../materials.js'
import Particles, { rand } from './Particles.jsx'
import { Part, Pin, Volume } from './Part.jsx'

const R = 1.7
const H = 7
const OPEN = Math.PI * 0.6

export function evapInfo(r) {
  const s = r.settings
  const tph = (r.waterEvap * r.production) / (8760 * (s.utilization / 100))
  const conc = Math.round(r.cell.conc * 100)
  if (r.waterEvap === 0) {
    return {
      title: 'Inside the evaporator',
      sub: 'Standing idle',
      reactions: [['Not needed', 'Mercury cells already make 50% caustic']],
      legend: [],
      stats: [['Water to remove', '0 t/h']],
      parts: {},
      idle: true,
    }
  }
  return {
    title: 'Inside the evaporator',
    sub: s.mvr ? 'Mechanical vapour recompression' : 'Triple-effect, steam heated',
    reactions: [
      ['Concentration', `NaOH ${conc}% → 50%`],
      ['Boiling point', '≈ 140 °C at 50% under vacuum steps'],
    ],
    legend: [
      ['Caustic soda', C.caustic],
      ['Water vapour', C.steam],
      ...(s.mvr ? [['Recompressed vapour', '#ff9a5c']] : [['Steam', '#ff9a5c']]),
    ],
    stats: [
      ['Water boiled off', `${tph.toFixed(1)} t/h`],
      ['Per t of chlorine', `${r.waterEvap.toFixed(2)} t water`],
      s.mvr ? ['Compressor power', `${Math.round(r.aux.caustic - 10)} kWh per t Cl₂`] : ['Steam', `${r.steamT.toFixed(2)} t per t Cl₂`],
      ['Product', '50% NaOH'],
    ],
    parts: {
      tubes: { label: 'Tube bundle', text: 'Caustic flows inside hundreds of nickel tubes. Heat passes through the tube walls and makes it boil.' },
      liquor: { label: 'Caustic', text: `Caustic comes in at ${conc}% and leaves at 50%, the strength customers buy.` },
      vapour: { label: 'Vapour space', text: 'Water boiled out of the caustic collects here as low-pressure vapour.' },
      heat: s.mvr
        ? { label: 'Compressor', text: 'The compressor squeezes the vapour so it gets hotter than the boiling caustic. It then heats the tubes, and the same energy is used again and again.' }
        : { label: 'Steam', text: 'Fresh steam heats the first effect. Its vapour heats the second, and so on, so each tonne of steam boils off about 2.6 t of water.' },
    },
  }
}

export default function EvaporatorInterior({ r, running, ui }) {
  const mvr = r.settings.mvr
  const idle = r.waterEvap === 0
  const rate = idle ? 0 : 0.7 + (r.settings.utilization / 100) * 0.5
  const fan = useRef()
  useFrame((_, dt) => {
    if (fan.current && running && !idle) fan.current.rotation.x += dt * 8
  })
  const tubes = useMemo(() => {
    const out = []
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 * 7.3
      const rr = 0.25 + (i / 60) * (R - 0.45)
      const x = Math.cos(a) * rr
      const z = Math.sin(a) * rr
      if (z > 0.35 && Math.abs(x) < 1.2) continue // keep the cut face clear
      out.push([x, z])
    }
    return out
  }, [])
  const vapour = useMemo(
    () => ({
      init: () => ({ x: rand(-1.3, 1.3), y: rand(1, H - 0.4), z: rand(-1.3, 0.3), v: rand(0.9, 1.6) }),
      step: (p, d) => {
        p.y += p.v * d
        p.s = p.y > 4.4 ? 1.3 : 0.8
        if (p.y > H - 0.3) Object.assign(p, { y: 1.1, x: rand(-1.3, 1.3), z: rand(-1.3, 0.3) })
      },
    }),
    [],
  )
  // heating medium loop: from the top, through the compressor or steam line, into the shell
  const loop = useMemo(() => {
    const path = new THREE.CatmullRomCurve3(
      [
        [0, H + 0.6, 0],
        [0, H + 1.4, 0],
        [2.4, H + 1.4, 0],
        [3.2, H - 0.5, 0],
        [3.2, 3, 0],
        [R + 0.1, 3, 0],
      ].map((p) => new THREE.Vector3(...p)),
      false,
      'catmullrom',
      0.1,
    )
    const steamPath = new THREE.CatmullRomCurve3([[5, 3, 0], [R + 0.1, 3, 0]].map((p) => new THREE.Vector3(...p)))
    const cur = mvr ? path : steamPath
    return {
      init: (i) => ({ u: i / 40, x: 0, y: 0, z: 0 }),
      step: (p, d) => {
        p.u = (p.u + d * 0.18) % 1
        const v = cur.getPointAt(p.u)
        p.x = v.x
        p.y = v.y
        p.z = v.z
      },
      tube: new THREE.TubeGeometry(cur, 64, 0.22, 10, false),
    }
  }, [mvr])
  const on = (id) => ui.focus === id || ui.hover === id

  return (
    <group position={[-0.8, -0.6, 0]}>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[R, R, H, 48, 1, true, OPEN / 2, Math.PI * 2 - OPEN]} />
        <meshStandardMaterial color="#aab3bb" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, H, 0]} material={M.steelDark()}>
        <sphereGeometry args={[R, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]} material={M.steelDark()}>
        <coneGeometry args={[R, 1.2, 36, 1, true]} />
      </mesh>

      <Part id="tubes" ui={ui}>
        {tubes.map(([x, z], i) => (
          <mesh key={i} position={[x, 2.8, z]}>
            <cylinderGeometry args={[0.05, 0.05, 3.4, 8]} />
            <meshStandardMaterial color="#c3ccd3" metalness={0.8} roughness={0.3} emissive={on('tubes') ? '#ffd24a' : '#000'} emissiveIntensity={0.4} />
          </mesh>
        ))}
        {[1.1, 4.5].map((y) => (
          <mesh key={y} position={[0, y, 0]} material={M.steelDark()}>
            <cylinderGeometry args={[R - 0.05, R - 0.05, 0.08, 40]} />
          </mesh>
        ))}
      </Part>
      <Part id="liquor" ui={ui}>
        <Volume from={[-1.25, 0.2, -1.25]} to={[1.25, idle ? 2 : 3.9, 1.25]} color={C.caustic} opacity={on('liquor') ? 0.42 : 0.26} emissive={0.35} />
      </Part>
      <Part id="vapour" ui={ui}>
        <Volume from={[-1.2, 4.6, -1.2]} to={[1.2, H - 0.1, 1.2]} color={C.steam} opacity={on('vapour') ? 0.2 : 0.06} />
      </Part>

      {!idle && (
        <Part id="heat" ui={ui}>
          <mesh geometry={loop.tube}>
            <meshStandardMaterial color="#6a7784" metalness={0.6} roughness={0.35} transparent opacity={0.65} emissive={on('heat') ? '#ffd24a' : '#000'} emissiveIntensity={0.3} />
          </mesh>
          {mvr && (
            <group position={[2.4, H + 1.4, 0]}>
              <mesh material={M.paint('#3c7ad6')}>
                <boxGeometry args={[1.2, 1.2, 1.2]} />
              </mesh>
              <group ref={fan} position={[0.62, 0, 0]}>
                {[0, 1, 2, 3].map((k) => (
                  <mesh key={k} rotation={[(k * Math.PI) / 2, 0, 0]} position={[0, 0, 0]}>
                    <boxGeometry args={[0.04, 0.9, 0.16]} />
                    <meshStandardMaterial color="#e7ebee" />
                  </mesh>
                ))}
              </group>
            </group>
          )}
          <Particles count={40} init={loop.init} step={loop.step} color="#ff9a5c" size={0.07} glow={1.8} running={running} rate={rate} />
        </Part>
      )}

      {!idle && <Particles count={120} {...vapour} color={C.steam} size={0.07} glow={0.8} running={running} rate={rate} opacity={0.7} />}

      <Pin id="vapour" label="Vapour" position={[-2.4, 5.8, 1]} ui={ui} />
      <Pin id="tubes" label="Tube bundle" position={[-2.6, 3, 1]} ui={ui} />
      <Pin id="liquor" label="Caustic" position={[-2.3, 1, 1]} ui={ui} />
      {!idle && <Pin id="heat" label={mvr ? 'Compressor' : 'Steam in'} position={mvr ? [2.4, H + 2.5, 0] : [4.2, 3.7, 0]} ui={ui} />}
    </group>
  )
}
