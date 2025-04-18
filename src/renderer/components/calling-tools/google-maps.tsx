import { useSetting } from '@/hooks/use-setting'
import { Loader } from '@googlemaps/js-api-loader'
import { protos } from '@googlemaps/routing'
import { useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

export function GoogleMaps({ toolResult }: { toolResult: string }) {
  const { data: settings } = useSetting()
  const [dataSource, setDataSource] = useState<
    | [
        protos.google.maps.routing.v2.IComputeRoutesResponse,
        protos.google.maps.routing.v2.IComputeRoutesRequest | undefined,
        object | undefined
      ]
    | null
  >(null)

  const mapRef = useRef<HTMLDivElement | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(
    null
  )

  useEffect(() => {
    try {
      setDataSource(JSON.parse(toolResult))
    } catch {
      // Do nothing...
    }
  }, [toolResult])

  useEffect(() => {
    if (!dataSource) return
    if (!settings?.googleApiKey) return
    if (!mapRef.current) return

    const loader = new Loader({
      apiKey: settings.googleApiKey,
      version: 'weekly',
      libraries: ['geometry']
      // libraries: ['geometry', 'marker']
    })

    loader.load().then(() => {
      const map = new window.google.maps.Map(mapRef.current as HTMLDivElement, {
        center: { lat: 35.693958, lng: 139.742692 },
        zoom: 1
        // mapId: window.google.maps.Map.DEMO_MAP_ID
      })

      const route: protos.google.maps.routing.v2.IRoute | undefined =
        dataSource?.[0]?.routes?.[0]

      const routePath = window.google.maps.geometry.encoding.decodePath(
        route?.polyline?.encodedPolyline ?? ''
      )

      const bluePolyline = new google.maps.Polyline({
        path: routePath,
        strokeColor: '#4285F4',
        strokeOpacity: 1,
        strokeWeight: 8,
        zIndex: 2
      })
      bluePolyline.setMap(map)

      new google.maps.Marker({
        position: routePath[0],
        label: {
          text: 'A',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px'
        },
        map
      })

      new google.maps.Marker({
        position: routePath[routePath.length - 1],
        label: {
          text: 'B',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px'
        },
        map
      })

      // new google.maps.marker.AdvancedMarkerElement({
      //   position: routePath[0],
      //   content: new google.maps.marker.PinElement({
      //     glyph: 'A',
      //     background: '#1a73e8',
      //     glyphColor: 'white'
      //   }).element,
      //   map
      // })

      // new google.maps.marker.AdvancedMarkerElement({
      //   position: routePath[routePath.length - 1],
      //   content: new google.maps.marker.PinElement({
      //     glyph: 'B',
      //     background: '#1a73e8',
      //     glyphColor: 'white'
      //   }).element,
      //   map
      // })

      const bounds = new google.maps.LatLngBounds()
      routePath.forEach((latLng) => bounds.extend(latLng))
      map.fitBounds(bounds)
    })

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null)
        directionsRendererRef.current = null
      }
    }
  }, [dataSource, settings?.googleApiKey])

  return (
    <ErrorBoundary fallback={null}>
      {dataSource && (
        <div ref={mapRef} className="h-[400px] w-full rounded-xl" />
      )}
    </ErrorBoundary>
  )
}
