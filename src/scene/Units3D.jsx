// Geometry for each unit of the chlorine plant. Each is drawn around its own
// origin; PlantScene places it at the unit's position.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { C, M, mat } from './materials.js'

// ---------- building blocks ----------
function Pad({ w, d }) {
  return (
    <mesh position={[0, 0.03, 0]} receiveShadow material={M.pad()}>
      <boxGeometry args={[w, 0.06, d]} />
    </mesh>
  )
}

function Tank({ r = 1, h = 3, color, band, y = 0, cone = false, ...p }) {
  return (
    <group {...p}>
      <mesh position={[0, y + h / 2, 0]} castShadow receiveShadow material={color ? M.paint(color) : M.steel()}>
        <cylinderGeometry args={[r, r, h, 28]} />
      </mesh>
      {band && (
        <mesh position={[0, y + h * 0.72, 0]} material={M.paint(band)}>
          <cylinderGeometry args={[r * 1.01, r * 1.01, h * 0.12, 28]} />
        </mesh>
      )}
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
  return [-w / 2, w / 2].flatMap((x) =>
    [-d / 2, d / 2].map((z) => (
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
      <mesh position={[0, h + 0.25, 0]} castShadow material={M.roof()}>
        <boxGeometry args={[w + 0.3, 0.5, d + 0.3]} />
      </mesh>
      {Array.from({ length: Math.max(1, Math.floor(w / 2.2)) }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + 1.2 + i * 2.2, h * 0.62, d / 2 + 0.01]} material={M.glow('#9fc6ff', 0.35)}>
          <planeGeometry args={[1.2, 0.5]} />
        </mesh>
      ))}
    </group>
  )
}

// Horizontal pressure vessel with rounded ends
function Bullet({ r = 0.9, len = 5, color, band, ...p }) {
  const m = color ? M.paint(color) : M.steel()
  return (
    <group {...p}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={m}>
        <cylinderGeometry args={[r, r, len, 24]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * len) / 2, 0, 0]} scale={[0.5, 1, 1]} castShadow material={m}>
          <sphereGeometry args={[r, 20, 14]} />
        </mesh>
      ))}
      {band && (
        <mesh rotation={[0, 0, Math.PI / 2]} material={M.paint(band)}>
          <cylinderGeometry args={[r * 1.02, r * 1.02, 0.5, 24]} />
        </mesh>
      )}
    </group>
  )
}

function Stack({ h = 10, r = 0.4, glow, ...p }) {
  return (
    <group {...p}>
      <mesh position={[0, h / 2, 0]} castShadow material={M.steelDark()}>
        <cylinderGeometry args={[r * 0.8, r, h, 16]} />
      </mesh>
      <mesh position={[0, h + 0.1, 0]} material={glow ? M.glow(glow, 1.2) : M.frame()}>
        <cylinderGeometry args={[r * 0.85, r * 0.85, 0.2, 16]} />
      </mesh>
    </group>
  )
}

// ---------- units ----------

export function SaltDome() {
  return (
    <group>
      <Pad w={11} d={9} />
      <mesh position={[-1.2, 0, 0]} castShadow receiveShadow material={M.paint('#c9ced2')}>
        <sphereGeometry args={[3.8, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* open doorway showing salt */}
      <mesh position={[-1.2, 0.9, 3.3]} material={M.paint('#1a1f23')}>
        <boxGeometry args={[2.2, 1.8, 1.2]} />
      </mesh>
      <mesh position={[-1.2, 0.5, 3.6]} castShadow material={M.paint(C.salt)}>
        <coneGeometry args={[1, 1, 16]} />
      </mesh>
      <mesh position={[2.6, 1.2, 0]} rotation={[0, 0, 0.35]} castShadow material={mat(C.salt, { emissive: C.salt, emissiveIntensity: 0.3 })}>
        <boxGeometry args={[3.4, 0.25, 0.8]} />
      </mesh>
      <Tank position={[4.2, 0, 0]} r={1} h={2.4} />
    </group>
  )
}

export function BrinePurification() {
  return (
    <group>
      <Pad w={12} d={8} />
      <group position={[-3.2, 0, -0.6]}>
        <mesh position={[0, 0.7, 0]} castShadow receiveShadow material={M.steelDark()}>
          <cylinderGeometry args={[2.3, 2.3, 1.4, 36, 1, true]} />
        </mesh>
        <mesh position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat(C.brine, { roughness: 0.2, metalness: 0.1 })}>
          <circleGeometry args={[2.25, 36]} />
        </mesh>
        <mesh position={[0, 1.5, 0]} material={M.frame()}>
          <boxGeometry args={[4.6, 0.12, 0.3]} />
        </mesh>
      </group>
      {[0.8, 2.4].map((x) => (
        <Tank key={x} position={[x, 0, -1.8]} r={0.7} h={1.8} />
      ))}
      {[0.6, 1.6, 2.6, 3.6].map((x, i) => (
        <mesh key={x} position={[x, 2.2, 1.9]} castShadow material={i % 2 ? M.steel() : M.paint('#dfe6ea')}>
          <cylinderGeometry args={[0.36, 0.36, 4.4, 18]} />
        </mesh>
      ))}
    </group>
  )
}

export function Dechlorination() {
  return (
    <group>
      <Pad w={8} d={6} />
      <mesh position={[-1.4, 3.2, 0]} castShadow material={M.paint('#dfe6ea')}>
        <cylinderGeometry args={[0.7, 0.7, 6.4, 20]} />
      </mesh>
      <Tank position={[1.4, 0, -0.6]} r={1.1} h={2} color="#9fb9c2" />
      <mesh position={[1.4, 0.8, 1.9]} castShadow material={M.paint('#3c7ad6')}>
        <boxGeometry args={[1.2, 1.2, 1]} />
      </mesh>
    </group>
  )
}

function Transformer(p) {
  return (
    <group {...p}>
      <mesh position={[0, 1.1, 0]} castShadow material={M.paint('#5f6d62')}>
        <boxGeometry args={[1.8, 2.2, 1.4]} />
      </mesh>
      {[-0.5, 0, 0.5].map((x) => (
        <mesh key={x} position={[x, 2.6, 0]} material={M.paint('#c9b17a')}>
          <cylinderGeometry args={[0.08, 0.12, 0.8, 8]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 1.1, s * 0.8]} material={M.frame()}>
          <boxGeometry args={[1.6, 1.8, 0.14]} />
        </mesh>
      ))}
    </group>
  )
}

export function Rectifiers() {
  return (
    <group>
      <Pad w={9} d={7} />
      {[-2.8, 0, 2.8].map((x) => (
        <Transformer key={x} position={[x, 0, -1.6]} />
      ))}
      <Building w={7} d={2.4} h={2.6} position={[0, 0, 1.8]} />
      <mesh position={[0, 3.3, 1.8]} material={M.glow(C.power, 1.4)}>
        <boxGeometry args={[6.6, 0.1, 0.1]} />
      </mesh>
    </group>
  )
}

// ---------- the cell room ----------

const PLATES = 28

function MembraneStacks({ positions, odc }) {
  const plates = useRef()
  const total = positions.length * PLATES
  useEffect(() => {
    if (!plates.current) return
    const d = new THREE.Object3D()
    const col = new THREE.Color()
    let i = 0
    positions.forEach(([x, z]) => {
      for (let k = 0; k < PLATES; k++) {
        d.position.set(x, 1.15, z - 2.9 + (k * 5.8) / (PLATES - 1))
        d.updateMatrix()
        plates.current.setMatrixAt(i, d.matrix)
        plates.current.setColorAt(i, col.set(k % 2 ? '#8e9aa3' : odc ? '#4d6f9a' : '#b1a189'))
        i++
      }
    })
    plates.current.instanceMatrix.needsUpdate = true
    if (plates.current.instanceColor) plates.current.instanceColor.needsUpdate = true
  }, [positions, odc])

  return (
    <group>
      <instancedMesh ref={plates} args={[null, null, total]} castShadow>
        <boxGeometry args={[1.25, 1.5, 0.14]} />
        <meshStandardMaterial roughness={0.45} metalness={0.5} />
      </instancedMesh>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* frame rails and end plates */}
          <mesh position={[0, 0.3, 0]} castShadow material={M.frame()}>
            <boxGeometry args={[1.4, 0.3, 6.6]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, 1.15, s * 3.2]} castShadow material={M.steelDark()}>
              <boxGeometry args={[1.5, 1.8, 0.35]} />
            </mesh>
          ))}
          {/* headers: chlorine out (top), brine in */}
          <mesh position={[0.45, 2.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.paint(C.chlorine)}>
            <cylinderGeometry args={[0.1, 0.1, 6.2, 10]} />
          </mesh>
          <mesh position={[-0.45, 2.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.paint(odc ? C.oxygen : C.hydrogen)}>
            <cylinderGeometry args={[0.1, 0.1, 6.2, 10]} />
          </mesh>
          {/* busbar */}
          <mesh position={[0, 0.55, 3.55]} material={M.glow(C.power, 0.9)}>
            <boxGeometry args={[0.9, 0.12, 0.4]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function DiaphragmCells({ positions }) {
  return positions.map(([x, z], i) => (
    <group key={i} position={[x, 0, z]}>
      {[-2, 0, 2].map((dz) => (
        <group key={dz} position={[0, 0, dz]}>
          <mesh position={[0, 0.9, 0]} castShadow material={M.paint('#6c7a70')}>
            <boxGeometry args={[1.4, 1.4, 1.5]} />
          </mesh>
          <mesh position={[0, 1.75, 0]} castShadow material={M.paint('#c9ced2')}>
            <boxGeometry args={[1.2, 0.3, 1.3]} />
          </mesh>
          <mesh position={[0.45, 2.1, 0]} material={M.paint(C.chlorine)}>
            <cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.8, 0.5, 0]} material={M.glow('#c97a3d', 0.6)}>
        <boxGeometry args={[0.12, 0.25, 6]} />
      </mesh>
    </group>
  ))
}

function MercuryCells({ positions }) {
  return positions.map(([x, z], i) => (
    <group key={i} position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]} castShadow material={M.steelDark()} rotation={[0.03, 0, 0]}>
        <boxGeometry args={[1.5, 0.6, 6.4]} />
      </mesh>
      <mesh
        position={[0, 0.87, 0]}
        rotation={[-Math.PI / 2 + 0.03, 0, 0]}
        material={mat(C.mercury, { metalness: 1, roughness: 0.08, emissive: C.mercury, emissiveIntensity: 0.25 })}
      >
        <planeGeometry args={[1.2, 6.2]} />
      </mesh>
      {/* decomposer where amalgam gives up sodium */}
      <mesh position={[0, 1.3, 3.8]} castShadow material={M.steel()}>
        <cylinderGeometry args={[0.35, 0.35, 2.4, 14]} />
      </mesh>
    </group>
  ))
}

export function CellRoom({ cell, stacks }) {
  const shown = Math.max(1, Math.min(18, stacks))
  const rows = shown > 9 ? 2 : 1
  const cols = Math.ceil(shown / rows)
  const dx = 1.9
  const positions = useMemo(() => {
    const p = []
    for (let i = 0; i < shown; i++) {
      const r = Math.floor(i / cols)
      const c = i % cols
      p.push([(c - (cols - 1) / 2) * dx, rows === 1 ? 0 : (r === 0 ? -4 : 4)])
    }
    return p
  }, [shown, rows, cols])
  const w = cols * dx + 3
  const d = rows * 8 + 1.5
  const odc = cell === 'odc'

  return (
    <group>
      <Pad w={w} d={d} />
      {/* open steel hall so the cells stay visible */}
      {[-w / 2, w / 2].flatMap((x) =>
        [-d / 2, 0, d / 2].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 2.6, z]} castShadow material={M.frame()}>
            <boxGeometry args={[0.3, 5.2, 0.3]} />
          </mesh>
        )),
      )}
      {[-d / 2, 0, d / 2].map((z) => (
        <mesh key={z} position={[0, 5.3, z]} castShadow material={M.frame()}>
          <boxGeometry args={[w + 0.3, 0.3, 0.3]} />
        </mesh>
      ))}
      {[-w / 2, w / 2].map((x) => (
        <mesh key={x} position={[x, 5.3, 0]} material={M.frame()}>
          <boxGeometry args={[0.3, 0.3, d]} />
        </mesh>
      ))}
      {(cell === 'membrane' || odc) && <MembraneStacks positions={positions} odc={odc} />}
      {cell === 'diaphragm' && <DiaphragmCells positions={positions} />}
      {cell === 'mercury' && <MercuryCells positions={positions} />}
    </group>
  )
}

export function ChlorineDrying() {
  return (
    <group>
      <Pad w={9} d={7} />
      <Tank position={[-2.6, 0, 0]} r={0.9} h={4.2} color="#dfe6ea" />
      {[-0.3, 1.5].map((x) => (
        <mesh key={x} position={[x, 3.4, -0.4]} castShadow material={M.paint('#d8dde0')}>
          <cylinderGeometry args={[0.6, 0.6, 6.8, 20]} />
        </mesh>
      ))}
      <Tank position={[3, 0, 1.4]} r={0.7} h={1.6} color="#8c7c5f" />
    </group>
  )
}

export function Liquefaction({ running }) {
  const car = useRef()
  useFrame((state) => {
    if (!car.current) return
    const t = running ? state.clock.elapsedTime : 0
    car.current.position.x = -6 + ((t * 1.5) % 26)
  })
  return (
    <group>
      <Pad w={11} d={9} />
      <Building w={4} d={3} h={3} position={[-3, 0, -2]} />
      {[-0.2, 1.8].map((z) => (
        <group key={z}>
          <Bullet position={[2.2, 1.3, z]} r={0.8} len={4.2} color="#e7ebee" band={C.chlorine} />
          <Legs w={3} d={0.8} h={0.6} />
        </group>
      ))}
      {/* rail siding with a moving tank car */}
      <mesh position={[4, 0.06, 3.9]} material={M.frame()}>
        <boxGeometry args={[26, 0.1, 1.4]} />
      </mesh>
      <group ref={car} position={[0, 0, 3.9]}>
        <Bullet position={[0, 1.2, 0]} r={0.65} len={3} color="#f0f2f4" band={C.chlorine} />
        <mesh position={[0, 0.4, 0]} material={M.frame()}>
          <boxGeometry args={[3.6, 0.3, 1.1]} />
        </mesh>
      </group>
    </group>
  )
}

export function CausticEvaporator({ mvr, needed }) {
  return (
    <group>
      <Pad w={9} d={7} />
      {needed && !mvr && [-2.8, -1.2, 0.4].map((x) => <Tank key={x} position={[x, 1, -0.8]} r={0.65} h={3.6} cone />)}
      {needed && mvr && (
        <>
          <Tank position={[-1.6, 1, -0.8]} r={0.9} h={4} cone />
          <mesh position={[0.4, 0.8, -1.4]} castShadow material={M.paint('#3c7ad6')}>
            <boxGeometry args={[1.4, 1.6, 1.4]} />
          </mesh>
        </>
      )}
      {!needed && (
        <mesh position={[-1.2, 0.8, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow material={M.steel()}>
          <cylinderGeometry args={[0.5, 0.5, 2.6, 16]} />
        </mesh>
      )}
      {[1.8, 3.4].map((x) => (
        <Tank key={x} position={[x, 0, 1.2]} r={0.75} h={3.2} color="#e7ebee" band={C.caustic} />
      ))}
    </group>
  )
}

export function GasUnit({ cell, h2Use, running }) {
  const rotor = useRef()
  useFrame((_, dt) => {
    if (rotor.current && running) rotor.current.rotation.y += dt * 2
  })
  if (cell === 'odc') {
    return (
      <group>
        <Pad w={9} d={7} />
        <mesh position={[-2, 4.5, 0]} castShadow material={M.paint('#dfe4e8')}>
          <boxGeometry args={[2, 9, 2]} />
        </mesh>
        <mesh position={[-2, 9.1, 0]} material={M.glow(C.oxygen, 0.8)}>
          <boxGeometry args={[2.05, 0.2, 2.05]} />
        </mesh>
        <Building w={3.4} d={2.6} h={2.4} position={[1.6, 0, -1.2]} />
        <Tank position={[2, 0, 2]} r={0.7} h={3} color="#e7ebee" band={C.oxygen} />
      </group>
    )
  }
  return (
    <group>
      <Pad w={9} d={7} />
      {h2Use === 'fuelcell' &&
        [-2.4, -0.8, 0.8, 2.4].map((x) => (
          <group key={x} position={[x, 0, -0.6]}>
            <mesh position={[0, 1.3, 0]} castShadow material={M.paint('#e4e8eb')}>
              <boxGeometry args={[1.3, 2.6, 4]} />
            </mesh>
            <mesh position={[0, 2.62, 0]} material={M.glow(C.hydrogen, 0.7)}>
              <boxGeometry args={[1.1, 0.06, 3.6]} />
            </mesh>
          </group>
        ))}
      {h2Use === 'boiler' && (
        <>
          <Building w={4.4} d={3.4} h={3.6} position={[-1, 0, -0.4]} />
          <Stack position={[2.4, 0, -1.2]} h={9} r={0.45} glow={C.heat} />
        </>
      )}
      {h2Use === 'sell' && (
        <>
          <group ref={rotor} position={[-2.6, 1.2, -1.4]}>
            <mesh castShadow material={M.paint('#3c7ad6')}>
              <boxGeometry args={[1.4, 1.4, 1.4]} />
            </mesh>
          </group>
          {[-0.4, 1.8].map((z) => (
            <group key={z} position={[1.2, 0, z]}>
              {[-0.35, 0.35].map((y) => (
                <Bullet key={y} position={[0, 1.4 + y, 0]} r={0.3} len={4.6} color={C.hydrogen} />
              ))}
              <mesh position={[0, 0.5, 0]} material={M.frame()}>
                <boxGeometry args={[5, 0.3, 1]} />
              </mesh>
            </group>
          ))}
        </>
      )}
      {h2Use === 'vent' && <Stack position={[0, 0, 0]} h={14} r={0.35} glow={C.hydrogen} />}
    </group>
  )
}

export function WaterTreatment() {
  return (
    <group>
      <Pad w={10} d={6} />
      <Building w={4.2} d={3} h={3} position={[-2.4, 0, 0]} />
      {[1.4, 2.8].map((x) => (
        <Tank key={x} position={[x, 0, -0.8]} r={0.6} h={2.8} color="#dfe6ea" />
      ))}
      <mesh position={[2.1, 0.6, 1.8]} castShadow material={M.paint(C.water)}>
        <boxGeometry args={[3, 1.2, 1.2]} />
      </mesh>
    </group>
  )
}
