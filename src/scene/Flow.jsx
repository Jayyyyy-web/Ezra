// A pipe or conveyor with material flowing along it.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mat } from './materials.js'

function buildPath(points) {
  const path = new THREE.CurvePath()
  for (let i = 0; i < points.length - 1; i++) {
    path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i]), new THREE.Vector3(...points[i + 1])))
  }
  return path
}

export default function Flow({ points, color, speed = 1, count = 14, radius = 0.12, active = true, dim = false }) {
  const path = useMemo(() => buildPath(points), [points])
  const tube = useMemo(() => new THREE.TubeGeometry(path, Math.max(8, points.length * 12), radius, 8, false), [path, radius, points.length])
  const inst = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const offset = useRef(Math.random())
  const length = useMemo(() => path.getLength(), [path])
  const p = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    if (!inst.current) return
    if (active) offset.current = (offset.current + (dt * speed * 4) / length) % 1
    for (let i = 0; i < count; i++) {
      const u = (offset.current + i / count) % 1
      path.getPointAt(u, p)
      dummy.position.copy(p)
      dummy.scale.setScalar(active ? 1 : 0.001)
      dummy.updateMatrix()
      inst.current.setMatrixAt(i, dummy.matrix)
    }
    inst.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <mesh geometry={tube} material={mat('#2c343b', { metalness: 0.6, roughness: 0.35, transparent: true, opacity: dim ? 0.35 : 0.85 })} />
      <instancedMesh ref={inst} args={[null, null, count]} frustumCulled={false}>
        <sphereGeometry args={[radius * 1.35, 10, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={dim ? 0.4 : 1.6} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
