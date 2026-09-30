// Shared bits for the inside views: clickable parts and their floating labels.
import { Html } from '@react-three/drei'

export function Part({ id, ui, children }) {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        ui.setFocus(id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        ui.setHover(id)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        ui.setHover(null)
        document.body.style.cursor = ''
      }}
    >
      {children}
    </group>
  )
}

export function Pin({ id, label, position, ui }) {
  const on = ui.focus === id || ui.hover === id
  return (
    <Html position={position} center zIndexRange={[30, 0]}>
      <button
        type="button"
        className={`pin${on ? ' is-on' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          ui.setFocus(id)
        }}
        onPointerEnter={() => ui.setHover(id)}
        onPointerLeave={() => ui.setHover(null)}
      >
        {label}
      </button>
    </Html>
  )
}

// A translucent block of liquid or gas
export function Volume({ from, to, color, opacity = 0.22, emissive = 0.15 }) {
  const size = [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
  const pos = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]
  return (
    <mesh position={pos} renderOrder={2}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} transparent opacity={opacity} depthWrite={false} roughness={0.1} />
    </mesh>
  )
}
