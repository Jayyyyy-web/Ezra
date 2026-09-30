// Geometry for each process unit. Each is drawn around its own origin;
// PlantScene places it at the unit's position.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { C, M } from './materials.js'

const TAU = Math.PI * 2

function Pad({ w, d }) {
  return (
    <mesh position={[0, 0.03, 0]} receiveShadow material={M.pad()}>
      <boxGeometry args={[w, 0.06, d]} />
    </mesh>
  )
}

function Tank({ r = 1, h = 3, color, y = 0, cone = false, ...p }) {
  return (
    <group {...p}>
      <mesh position={[0, y + h / 2, 0]} castShadow receiveShadow material={color ? M.paint(color) : M.steel()}>
        <cylinderGeometry args={[r, r, h, 28]} />
      </mesh>
      <mesh position={[0, y + h + 0.18, 0]} castShadow material={M.steelDark()}>
        <cylinderGeometry args={[r * 0.35, r, 0.36, 28]} />
      </mesh>
      {cone && (
        <mesh position={[0, y - 0.6, 0]} rotation={[Math.PI, 0, 0]} castShadow material={M.steel()}>
          <coneGeometry args={[r, 1.2, 28]} />
        </mesh>
      )}
    </group>
  )
}

function Legs({ w, d, h }) {
  const xs = [-w / 2, w / 2]
  const zs = [-d / 2, d / 2]
  return xs.flatMap((x) =>
    zs.map((z) => (
      <mesh key={`${x}${z}`} position={[x, h / 2, z]} castShadow material={M.frame()}>
        <boxGeometry args={[0.18, h, 0.18]} />
      </mesh>
    )),
  )
}

function Building({ w, d, h, ...p }) {
  return (
    <group {...p}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow material={M.wall()}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      <mesh position={[0, h + 0.5, 0]} rotation={[0, 0, 0]} castShadow material={M.roof()}>
        <boxGeometry args={[w + 0.3, 1, d + 0.3]} />
      </mesh>
      {Array.from({ length: Math.floor(w / 2.2) }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + 1.2 + i * 2.2, h * 0.62, d / 2 + 0.01]} material={M.glow('#9fc6ff', 0.35)}>
          <planeGeometry args={[1.2, 0.5]} />
        </mesh>
      ))}
    </group>
  )
}

// ---------- units ----------

export function OreYard() {
  return (
    <group>
      <Pad w={9} d={8} />
      {[
        [-2.2, -1.6, 2.2],
        [1.8, -1.2, 1.8],
        [-0.8, 2, 1.6],
      ].map(([x, z, h], i) => (
        <mesh key={i} position={[x, h / 2, z]} castShadow receiveShadow material={M.paint(C.ore)}>
          <coneGeometry args={[h * 1.25, h, 24]} />
        </mesh>
      ))}
      <mesh position={[3.4, 0.9, 0]} rotation={[0, 0, -0.18]} castShadow material={M.frame()}>
        <boxGeometry args={[4, 0.3, 0.9]} />
      </mesh>
    </group>
  )
}

export function Kiln({ settings, running }) {
  const drum = useRef()
  useFrame((_, dt) => {
    if (drum.current && running) drum.current.rotation.x += dt * 0.6
  })
  return (
    <group>
      <Pad w={15} d={6} />
      <group position={[0, 1.9, 0]} rotation={[0, 0, 0.04]}>
        <group ref={drum}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={M.steel()}>
            <cylinderGeometry args={[1.05, 1.05, 12, 32]} />
          </mesh>
          {[-4, 0, 4].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow material={M.steelDark()}>
              <torusGeometry args={[1.15, 0.12, 10, 32]} />
            </mesh>
          ))}
        </group>
        {/* hot end glow */}
        <mesh position={[6.05, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={M.glow(C.heat, 2.4)}>
          <cylinderGeometry args={[0.8, 0.8, 0.1, 24]} />
        </mesh>
      </group>
      {[-4, 0, 4].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]} castShadow material={M.frame()}>
          <boxGeometry args={[0.6, 0.9, 2.4]} />
        </mesh>
      ))}
      {/* firing hood */}
      <mesh position={[6.8, 1.9, 0]} castShadow material={M.wall()}>
        <boxGeometry args={[1.4, 3, 2.6]} />
      </mesh>
      {!settings.electricKiln && (
        <group position={[6.8, 0, -2]}>
          <mesh position={[0, 4.5, 0]} castShadow material={M.steelDark()}>
            <cylinderGeometry args={[0.35, 0.45, 9, 16]} />
          </mesh>
          <mesh position={[0, 9.1, 0]} material={M.glow('#c24b2d', 0.8)}>
            <cylinderGeometry args={[0.37, 0.37, 0.25, 16]} />
          </mesh>
        </group>
      )}
      {settings.electricKiln && (
        <mesh position={[6.8, 3.6, 0]} material={M.glow(C.power, 1.2)}>
          <boxGeometry args={[1.5, 0.12, 2.7]} />
        </mesh>
      )}
    </group>
  )
}

export function Leach() {
  return (
    <group>
      <Pad w={9} d={6} />
      {[-2.8, 0, 2.8].map((x) => (
        <Tank key={x} position={[x, 0, -0.8]} r={1.1} h={3} />
      ))}
      <group position={[0, 0, 2]}>
        <Legs w={6} d={1.2} h={1.2} />
        <mesh position={[0, 1.3, 0]} castShadow material={M.steelDark()}>
          <boxGeometry args={[6.4, 0.25, 1.4]} />
        </mesh>
      </group>
    </group>
  )
}

export function Purify() {
  return (
    <group>
      <Pad w={6} d={6} />
      {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
        <mesh key={x} position={[x, 2.4, -0.6]} castShadow material={i % 2 ? M.steel() : M.paint('#dfe6ea')}>
          <cylinderGeometry args={[0.38, 0.38, 4.8, 18]} />
        </mesh>
      ))}
      <Tank position={[0, 0, 1.8]} r={0.9} h={1.6} color="#dfe6ea" />
    </group>
  )
}

export function Crystallizer({ settings }) {
  return (
    <group>
      <Pad w={6} d={6} />
      <Tank position={[-0.6, 1.5, 0]} r={1.3} h={5.5} cone />
      <group position={[-0.6, 0, 0]}>
        <Legs w={1.8} d={1.8} h={1.5} />
      </group>
      {settings.heatRecovery ? (
        <mesh position={[1.9, 0.8, 1]} castShadow material={M.paint('#3c7ad6')}>
          <boxGeometry args={[1.5, 1.6, 1.8]} />
        </mesh>
      ) : (
        <mesh position={[1.9, 1.2, 1]} rotation={[0, 0, Math.PI / 2]} castShadow material={M.steelDark()}>
          <cylinderGeometry args={[0.6, 0.6, 2, 16]} />
        </mesh>
      )}
    </group>
  )
}

export function Salts() {
  const tanks = [
    [-2.6, C.nickel],
    [0, C.manganese],
    [2.6, C.cobalt],
  ]
  return (
    <group>
      <Pad w={9} d={6} />
      {tanks.map(([x, c]) => (
        <Tank key={x} position={[x, 0, 0]} r={1} h={2.6} color={c} />
      ))}
    </group>
  )
}

function Reactor({ running, ...p }) {
  const shaft = useRef()
  useFrame((_, dt) => {
    if (shaft.current && running) shaft.current.rotation.y += dt * 4
  })
  return (
    <group {...p}>
      <Tank r={0.95} h={3.2} />
      <mesh position={[0, 3.9, 0]} castShadow material={M.paint('#3c7ad6')}>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
      </mesh>
      <group ref={shaft} position={[0, 4.35, 0]}>
        <mesh material={M.steelDark()}>
          <boxGeometry args={[1, 0.08, 0.14]} />
        </mesh>
      </group>
    </group>
  )
}

export function PrecursorReactors({ trains, running }) {
  const n = Math.max(1, trains)
  const spacing = 2.4
  return (
    <group>
      <Pad w={Math.max(6, n * spacing + 2)} d={6} />
      {Array.from({ length: n }).map((_, i) => (
        <group key={i} position={[(i - (n - 1) / 2) * spacing, 0, 0]}>
          <Reactor running={running} position={[0, 0, -0.9]} />
          <Reactor running={running} position={[0, 0, 1.4]} />
        </group>
      ))}
    </group>
  )
}

export function FilterDryer() {
  return (
    <group>
      <Pad w={7} d={6} />
      <Building w={4} d={3.4} h={3} position={[-1, 0, -0.6]} />
      <mesh position={[1.9, 1.2, 1.8]} rotation={[0, 0, Math.PI / 2]} castShadow material={M.steel()}>
        <cylinderGeometry args={[0.75, 0.75, 3.2, 20]} />
      </mesh>
    </group>
  )
}

export function CathodeKiln({ lines, running }) {
  const n = Math.max(1, lines)
  return (
    <group>
      <Pad w={17} d={Math.max(6, n * 3.4 + 2)} />
      {Array.from({ length: n }).map((_, i) => (
        <KilnLine key={i} running={running} z={(i - (n - 1) / 2) * 3.4} />
      ))}
    </group>
  )
}

function KilnLine({ z, running }) {
  const saggers = useRef()
  const count = 12
  useFrame((state) => {
    if (!saggers.current) return
    const t = running ? state.clock.elapsedTime : 0
    saggers.current.children.forEach((m, i) => {
      const u = ((t * 0.06 + i / count) % 1) * 16 - 8
      m.position.x = u
      m.visible = u < -6.8 || u > 6.8
    })
  })
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow material={M.wall()}>
        <boxGeometry args={[13.6, 2, 2.2]} />
      </mesh>
      {/* glow slits along the hot zone */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.5, 1.2, s * 1.105]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} material={M.glow(C.heat, 2.2)}>
          <planeGeometry args={[9, 0.22]} />
        </mesh>
      ))}
      <mesh position={[0, 0.55, 0]} material={M.frame()}>
        <boxGeometry args={[16, 0.2, 1.1]} />
      </mesh>
      <group ref={saggers}>
        {Array.from({ length: count }).map((_, i) => (
          <mesh key={i} position={[0, 0.85, 0]} castShadow material={M.paint('#b9a58f')}>
            <boxGeometry args={[0.7, 0.4, 0.7]} />
          </mesh>
        ))}
      </group>
      {/* oxygen feed */}
      <mesh position={[-2, 2.6, 0]} material={M.paint('#9fd6ff')}>
        <cylinderGeometry args={[0.12, 0.12, 0.6, 10]} />
      </mesh>
    </group>
  )
}

export function Finishing({ running }) {
  const truck = useRef()
  useFrame((state) => {
    if (!truck.current) return
    const t = running ? state.clock.elapsedTime : 0
    truck.current.position.z = 6 + ((t * 1.8) % 26)
  })
  return (
    <group>
      <Pad w={9} d={8} />
      <Building w={6.5} d={5} h={3.4} position={[0, 0, -0.5]} />
      {[-2.4, -0.8].map((x) => (
        <Tank key={x} position={[x, 0, 3.2]} r={0.6} h={3} />
      ))}
      <group ref={truck} position={[2.2, 0, 6]}>
        <mesh position={[0, 0.9, 0]} castShadow material={M.paint('#e8ecef')}>
          <boxGeometry args={[1.5, 1.4, 3.4]} />
        </mesh>
        <mesh position={[0, 0.75, -2.1]} castShadow material={M.paint(C.cathode)}>
          <boxGeometry args={[1.5, 1.2, 1]} />
        </mesh>
      </group>
    </group>
  )
}

export function SulfateRecovery({ settings }) {
  return (
    <group>
      <Pad w={9} d={7} />
      <Tank position={[-2.4, 1.2, 0]} r={1.1} h={4} cone />
      <group position={[-2.4, 0, 0]}>
        <Legs w={1.6} d={1.6} h={1.2} />
      </group>
      {settings.sulfateRecovery ? (
        <mesh position={[1.8, 0.9, 0.5]} castShadow receiveShadow material={M.paint(C.sulfate)}>
          <coneGeometry args={[2.2, 1.8, 24]} />
        </mesh>
      ) : (
        <mesh position={[1.8, 0.08, 0.5]} rotation={[-Math.PI / 2, 0, 0]} material={M.paint('#6e8a8f')}>
          <planeGeometry args={[4, 4]} />
        </mesh>
      )}
    </group>
  )
}

export function WaterTreatment({ settings }) {
  const k = settings.waterRecycle / 100
  return (
    <group>
      <Pad w={11} d={7} />
      {[-2.8, 1.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow material={M.steelDark()}>
            <cylinderGeometry args={[1.8, 1.8, 1, 32, 1, true]} />
          </mesh>
          <mesh position={[0, 0.85, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.paint(C.water)}>
            <circleGeometry args={[1.75, 32]} />
          </mesh>
        </group>
      ))}
      <Building w={2.8} d={2.4} h={2.4} position={[4.2, 0, 0]} />
      {/* recycle gauge */}
      <mesh position={[4.2, 3.6 + k * 0.8, 1.25]} material={M.glow(C.water, 1.5)}>
        <boxGeometry args={[0.4, k * 1.6, 0.05]} />
      </mesh>
    </group>
  )
}

export { TAU }
