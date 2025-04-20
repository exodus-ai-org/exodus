import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { useEffect, useState } from 'react'

type PolylineCustomProps = {
  encodedPath?: string
}

export type PolylineProps = google.maps.PolylineOptions & PolylineCustomProps

export const Polyline = (props: PolylineProps) => {
  const { encodedPath, ...polylineOptions } = props

  const map = useMap()
  const geometryLibrary = useMapsLibrary('geometry')
  const mapsLibrary = useMapsLibrary('maps')

  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null)

  // create poyline once available
  useEffect(() => {
    if (!mapsLibrary) return

    setPolyline(
      new mapsLibrary.Polyline({
        strokeColor: '#4285F4',
        strokeOpacity: 1,
        strokeWeight: 8,
        zIndex: 2
      })
    )
  }, [mapsLibrary])

  // update options when changed
  useEffect(() => {
    if (!polyline) return

    polyline.setOptions(polylineOptions)
  }, [polyline, polylineOptions])

  // decode and update polyline with encodedPath
  useEffect(() => {
    if (!map || !encodedPath || !geometryLibrary || !polyline) return

    const routePath = geometryLibrary.encoding.decodePath(encodedPath)
    polyline.setPath(routePath)

    const bounds = new google.maps.LatLngBounds()
    routePath.forEach((latLng) => bounds.extend(latLng))
    map.fitBounds(bounds)
  }, [polyline, encodedPath, geometryLibrary, map])

  // add polyline to map
  useEffect(() => {
    if (!map || !polyline) return

    polyline.setMap(map)

    return () => polyline.setMap(null)
  }, [map, polyline])

  return <></>
}
