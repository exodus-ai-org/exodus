import { useSetting } from '@/hooks/use-setting'
import { Loader } from '@googlemaps/js-api-loader'
import { protos } from '@googlemaps/routing'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

export function GoogleMapView({
  data
}: {
  data: [
    protos.google.maps.routing.v2.IComputeRoutesResponse,
    protos.google.maps.routing.v2.IComputeRoutesRequest | undefined,
    object | undefined
  ]
}) {
  const { data: settings } = useSetting()

  const mapRef = useRef<HTMLDivElement | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(
    null
  )

  useEffect(() => {
    if (!settings?.googleApiKey) return
    if (!mapRef.current) return

    const loader = new Loader({
      apiKey: settings.googleApiKey,
      version: 'weekly'
    })

    loader.load().then(() => {
      const map = new window.google.maps.Map(mapRef.current as HTMLDivElement, {
        center: { lat: 35.693958, lng: 139.742692 },
        zoom: 13
      })

      const { startLocation, endLocation } =
        data?.[0]?.routes?.[0]?.legs?.[0] ?? {}
      const origin = {
        lat: startLocation?.latLng?.latitude ?? 0,
        lng: startLocation?.latLng?.longitude ?? 0
      }
      const destination = {
        lat: endLocation?.latLng?.latitude ?? 0,
        lng: endLocation?.latLng?.longitude ?? 0
      }

      const directionsService = new window.google.maps.DirectionsService()
      const directionsRenderer = new window.google.maps.DirectionsRenderer()
      directionsRenderer.setMap(map)
      directionsRendererRef.current = directionsRenderer

      directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(result)
          } else {
            toast.error('Directions request failed due to ' + status)
          }
        }
      )
    })

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null)
        directionsRendererRef.current = null
      }
    }
  }, [data, settings?.googleApiKey])

  return <div ref={mapRef} className="h-[400px] w-full rounded-xl" />
}
