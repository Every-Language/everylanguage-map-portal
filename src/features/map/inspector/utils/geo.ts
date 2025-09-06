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
    const walk = (coords: unknown) => {
      if (typeof coords[0] === 'number') {
        pushCoord(nums, coords as number[])
      } else {
        for (const c of coords as unknown[]) walk(c)
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


