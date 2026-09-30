// Tiny particle system on an InstancedMesh: each particle has its own state,
// advanced by `step` every frame. Used for bubbles, ions, droplets and vapour.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Particles({ count, init, step, color, size = 0.06, glow = 1.4, running = true, rate = 1, opacity = 1 }) {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const state = useMemo(() => Array.from({ length: count }, (_, i) => init(i, true)), [count, init])

  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    const d = Math.min(dt, 0.05) * (running ? rate : 0)
    for (let i = 0; i < count; i++) {
      const p = state[i]
      if (d > 0) step(p, d, i)
      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.setScalar(p.hidden ? 0.0001 : (p.s ?? 1))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[null, null, count]} frustumCulled={false}>
      <sphereGeometry args={[size, 10, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={glow}
        roughness={0.3}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity >= 1}
      />
    </instancedMesh>
  )
}

export const rand = (a, b) => a + Math.random() * (b - a)
