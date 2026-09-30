// Power supply assets. What appears depends on the chosen energy source.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { C, M } from './materials.js'

function Solar({ rows = 5, cols = 6 }) {
  return (
    <group>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <group key={`${r}-${c}`} position={[c * 2.3 - (cols * 2.3) / 2, 0, r * 1.9 - (rows * 1.9) / 2]}>
            <mesh position={[0, 0.5, 0]} material={M.frame()}>
              <boxGeometry args={[0.1, 1, 0.1]} />
            </mesh>
            <mesh position={[0, 1, 0]} rotation={[-0.45, 0, 0]} castShadow material={M.paint('#1e3a6b')}>
              <boxGeometry args={[2.1, 0.06, 1.3]} />
            </mesh>
          </group>
        )),
      )}
    </group>
  )
}

function Turbine({ running, phase = 0, ...p }) {
  const rotor = useRef()
  useFrame((_, dt) => {
    if (rotor.current && running) rotor.current.rotation.z += dt * 1.1
  })
  return (
    <group {...p}>
      <mesh position={[0, 6, 0]} castShadow material={M.paint('#e7ebee')}>
        <cylinderGeometry args={[0.18, 0.35, 12, 14]} />
      </mesh>
      <mesh position={[0, 12.1, 0.3]} castShadow material={M.paint('#e7ebee')}>
        <boxGeometry args={[0.6, 0.6, 1.4]} />
      </mesh>
      <group ref={rotor} position={[0, 12.1, 1.05]} rotation={[0, 0, phase]}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
            <mesh position={[0, 2.4, 0]} castShadow material={M.paint('#f2f4f6')}>
              <boxGeometry args={[0.3, 4.8, 0.08]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function Pylon(p) {
  return (
    <group {...p}>
      <mesh position={[0, 4, 0]} castShadow material={M.frame()}>
        <cylinderGeometry args={[0.15, 0.6, 8, 4]} />
      </mesh>
      <mesh position={[0, 7.2, 0]} material={M.frame()}>
        <boxGeometry args={[3.4, 0.14, 0.14]} />
      </mesh>
      <mesh position={[0, 6.2, 0]} material={M.frame()}>
        <boxGeometry args={[2.4, 0.14, 0.14]} />
      </mesh>
    </group>
  )
}

function Batteries() {
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[i * 1.4, 0.65, 0]} castShadow material={M.paint('#dfe4e8')}>
          <boxGeometry args={[1.1, 1.3, 3]} />
        </mesh>
      ))}
    </group>
  )
}

function Substation() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} receiveShadow material={M.pad()}>
        <boxGeometry args={[6, 0.06, 5]} />
      </mesh>
      {[-1.6, 0, 1.6].map((x) => (
        <mesh key={x} position={[x, 1, 0]} castShadow material={M.steelDark()}>
          <boxGeometry args={[1, 2, 1.4]} />
        </mesh>
      ))}
      <mesh position={[0, 2.3, 0]} material={M.glow(C.power, 0.9)}>
        <boxGeometry args={[4.2, 0.08, 0.08]} />
      </mesh>
    </group>
  )
}

export default function PowerSupply({ source, running }) {
  return (
    <group>
      <group position={[4, 0, 0]}>
        <Substation />
      </group>
      {source === 'grid' && (
        <>
          <Pylon position={[-4, 0, 0]} />
          <Pylon position={[-12, 0, 0]} />
          <Pylon position={[-20, 0, 0]} />
        </>
      )}
      {source === 'solar' && (
        <group position={[-9, 0, 0]}>
          <Solar rows={6} cols={7} />
        </group>
      )}
      {source === 'wind' && (
        <>
          <Turbine running={running} position={[-5, 0, -2]} phase={0.3} />
          <Turbine running={running} position={[-13, 0, 2]} phase={1.2} />
          <Turbine running={running} position={[-21, 0, -1]} phase={2.1} />
        </>
      )}
      {source === 'hybrid' && (
        <>
          <group position={[-9, 0, 1.5]}>
            <Solar rows={4} cols={5} />
          </group>
          <Turbine running={running} position={[-19, 0, -3]} phase={0.6} />
          <Turbine running={running} position={[-19, 0, 5]} phase={1.8} />
          <group position={[-2, 0, -5]}>
            <Batteries />
          </group>
        </>
      )}
    </group>
  )
}
