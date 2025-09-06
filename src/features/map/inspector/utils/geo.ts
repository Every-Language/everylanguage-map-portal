export type AnyGeoJSON = GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry

export function parseGeoJsonString(input: string | null | undefined): AnyGeoJSON | null {
  if (!input) return null
  try {
    const obj = JSON.parse(input)
    return obj
  } catch {
    return null
  }
}

export function bboxOf(geo: AnyGeoJSON): [number, number, number, number] | null {
  const pushCoord = (acc: number[], coord: number[]) => {
    acc.push(coord[0], coord[1])
  }
  const nums: number[] = []

  const visit = (g: AnyGeoJSON) => {
    if ((g as GeoJSON.Feature).type === 'Feature') {
      visit((g as GeoJSON.Feature).geometry)
      return
    }
    if ((g as GeoJSON.FeatureCollection).type === 'FeatureCollection') {
      for (const f of (g as GeoJSON.FeatureCollection).features) visit(f)
      return
    }
    const geom = g as GeoJSON.Geometry
    const walk = (coords: unknown): void => {
      if (Array.isArray(coords)) {
        if (coords.length > 0 && typeof coords[0] === 'number') {
          pushCoord(nums, coords as number[])
          return
        }
        for (const c of coords) walk(c)
      }
    }
    // @ts-expect-error coordinates shape varies by geometry type
    walk(geom.coordinates)
  }

  visit(geo)
  if (nums.length < 4) return null
  const lons = nums.filter((_, i) => i % 2 === 0)
  const lats = nums.filter((_, i) => i % 2 === 1)
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
}

export function unionBbox(boxes: Array<[number, number, number, number]>): [number, number, number, number] | null {
  if (!boxes.length) return null
  let [minX, minY, maxX, maxY] = boxes[0]
  for (let i = 1; i < boxes.length; i++) {
    const b = boxes[i]
    minX = Math.min(minX, b[0])
    minY = Math.min(minY, b[1])
    maxX = Math.max(maxX, b[2])
    maxY = Math.max(maxY, b[3])
  }
  return [minX, minY, maxX, maxY]
}

// Normalize a bbox for camera operations. Returns a safe box and a flag if a fallback (flyTo) is recommended.
export function normalizeBboxForMap(
  bbox: [number, number, number, number]
): { box: [number, number, number, number]; recommendFlyTo?: boolean } {
  let [minX, minY, maxX, maxY] = bbox
  // Clamp latitudes to avoid poles issues
  minY = Math.max(-85, Math.min(85, minY))
  maxY = Math.max(-85, Math.min(85, maxY))
  // If width > 180, likely crosses anti-meridian → prefer flyTo fallback
  const width = maxX - minX
  if (width > 180) {
    return { box: [minX, minY, maxX, maxY], recommendFlyTo: true }
  }
  // If min==max both axes, expand slightly so fitBounds works
  if (minX === maxX) {
    minX -= 0.0005
    maxX += 0.0005
  }
  if (minY === maxY) {
    minY -= 0.0005
    maxY += 0.0005
  }
  return { box: [minX, minY, maxX, maxY] }
}

export function centerOfBbox(bbox: [number, number, number, number]): [number, number] {
  const [minX, minY, maxX, maxY] = bbox
  return [(minX + maxX) / 2, (minY + maxY) / 2]
}


