// Shared colours and materials for the 3D site.
import * as THREE from 'three'

import { C } from './colors.js'
export { C }

const cache = new Map()
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts)
  if (!cache.has(key)) {
    cache.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25, ...opts }),
    )
  }
  return cache.get(key)
}

export const M = {
  steel: () => mat(C.steel, { metalness: 0.7, roughness: 0.32 }),
  steelDark: () => mat(C.steelDark, { metalness: 0.6, roughness: 0.4 }),
  frame: () => mat(C.frame, { metalness: 0.5, roughness: 0.5 }),
  wall: () => mat(C.wall, { metalness: 0.2, roughness: 0.7 }),
  roof: () => mat(C.roof, { metalness: 0.3, roughness: 0.6 }),
  pad: () => mat(C.pad, { metalness: 0, roughness: 0.95 }),
  glow: (c, i = 2) => mat(c, { emissive: c, emissiveIntensity: i, roughness: 0.4, metalness: 0 }),
  paint: (c) => mat(c, { metalness: 0.15, roughness: 0.5 }),
}
