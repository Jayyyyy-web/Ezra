// Night-time surroundings for the site: sky dome, stars, hills and far-off lights.
import { useMemo } from 'react'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const skyFrag = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 glow;
  uniform vec3 glowDir;
  void main() {
    float h = clamp(vDir.y, -0.2, 1.0);
    vec3 col = mix(horizon, zenith, pow(smoothstep(-0.02, 0.55, h), 0.7));
    // warm city-and-dusk glow low on one side of the horizon
    float side = max(dot(normalize(vec3(vDir.x, 0.0, vDir.z)), glowDir), 0.0);
    float band = exp(-abs(h) * 9.0);
    col += glow * band * pow(side, 3.0) * 0.9;
    // faint cool band all around the horizon
    col += vec3(0.02, 0.05, 0.08) * band;
    gl_FragColor = vec4(col, 1.0);
  }
`

function SkyDome() {
  const uniforms = useMemo(
    () => ({
      zenith: { value: new THREE.Color('#020306') },
      horizon: { value: new THREE.Color('#0c1622') },
      glow: { value: new THREE.Color('#5a3322') },
      glowDir: { value: new THREE.Vector3(-0.6, 0, -0.8).normalize() },
    }),
    [],
  )
  return (
    <mesh renderOrder={-10}>
      <sphereGeometry args={[420, 48, 24]} />
      <shaderMaterial side={THREE.BackSide} depthWrite={false} fog={false} uniforms={uniforms} vertexShader={skyVert} fragmentShader={skyFrag} />
    </mesh>
  )
}

// cheap deterministic noise so the hills look the same every load
function ridge(a, seed) {
  return (
    Math.sin(a * 3 + seed) * 0.5 +
    Math.sin(a * 7.3 + seed * 2.1) * 0.25 +
    Math.sin(a * 17.1 + seed * 0.7) * 0.12 +
    Math.sin(a * 41 + seed * 3.3) * 0.05
  )
}

function Hills({ radius, height, seed, color }) {
  const geo = useMemo(() => {
    const n = 220
    const pos = []
    const idx = []
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      const h = height * (0.55 + 0.45 * ridge(a, seed)) + 4
      const x = Math.cos(a) * radius
      const z = Math.sin(a) * radius
      pos.push(x, -4, z, x, h, z)
      if (i < n) {
        const b = i * 2
        idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    return g
  }, [radius, height, seed])
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} fog={false} />
    </mesh>
  )
}

function FarLights() {
  const geo = useMemo(() => {
    const pts = []
    const cols = []
    const c = new THREE.Color()
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 520; i++) {
      // cluster lights on the warm side, like a town beyond the plant
      const a = -2.2 + (rnd() - 0.5) * 1.7 + (rnd() < 0.25 ? (rnd() - 0.5) * 5 : 0)
      const r = 190 + rnd() * 25
      pts.push(Math.cos(a) * r, 0.5 + rnd() * 5, Math.sin(a) * r)
      c.set(rnd() < 0.7 ? '#ffc98a' : '#cfe3ff').multiplyScalar(1.6 + rnd() * 1.4)
      cols.push(c.r, c.g, c.b)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
    return g
  }, [])
  return (
    <points geometry={geo}>
      <pointsMaterial size={1.3} vertexColors sizeAttenuation fog={false} toneMapped={false} />
    </points>
  )
}

export default function Backdrop() {
  return (
    <group>
      <SkyDome />
      <Stars radius={300} depth={80} count={3500} factor={5} saturation={0.1} fade speed={0.4} />
      <mesh position={[-160, 120, -260]}>
        <sphereGeometry args={[7, 24, 16]} />
        <meshBasicMaterial color="#dfe6f0" fog={false} toneMapped={false} />
      </mesh>
      <FarLights />
      <Hills radius={260} height={26} seed={1.3} color="#0a1017" />
      <Hills radius={320} height={42} seed={4.1} color="#05080c" />
    </group>
  )
}
