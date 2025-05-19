import { useSettings } from '@/hooks/use-settings'
import { protos } from '@googlemaps/routing'
import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  APIProvider,
  Map,
  Pin
} from '@vis.gl/react-google-maps'
import { useMemo } from 'react'
import { Polyline } from './polyline'

export function GoogleMapsCard({
  toolResult
}: {
  toolResult: [
    protos.google.maps.routing.v2.IComputeRoutesResponse,
    protos.google.maps.routing.v2.IComputeRoutesRequest | undefined,
    object | undefined
  ]
}) {
  const { data: settings } = useSettings()
  const route: protos.google.maps.routing.v2.IRoute | undefined = useMemo(
    () => toolResult?.[0]?.routes?.[0],
    [toolResult]
  )

  const stepMarkerStyle = {
    backgroundColor: '#333333',
    borderColor: '#000000',
    width: 8,
    height: 8,
    border: `1px solid`,
    borderRadius: '50%'
  }

  const stepMarkers = route?.legs?.[0]?.steps?.slice(1).map((step, index) => {
    const position = {
      lat: step?.startLocation?.latLng?.latitude ?? 0,
      lng: step?.startLocation?.latLng?.longitude ?? 0
    }

    return (
      <AdvancedMarker
        key={`${index}-start`}
        anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
        position={position}
      >
        <div style={stepMarkerStyle} />
      </AdvancedMarker>
    )
  })

  if (
    !settings?.googleCloud?.googleApiKey ||
    !route ||
    !route.polyline?.encodedPolyline
  )
    return

  return (
    <APIProvider
      apiKey={settings.googleCloud.googleApiKey}
      libraries={['geometry']}
    >
      <Map
        className="w-fill h-[400px] rounded-xl [&>div:first-child]:rounded-xl"
        style={{ borderRadius: 16 }}
        defaultCenter={{ lat: 35.693958, lng: 139.742692 }}
        defaultZoom={3}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        mapId="123"
      >
        <AdvancedMarker
          position={{
            lat: route?.legs?.[0]?.startLocation?.latLng?.latitude ?? 0,
            lng: route?.legs?.[0]?.startLocation?.latLng?.longitude ?? 0
          }}
        >
          <Pin glyph="A" />
        </AdvancedMarker>
        <AdvancedMarker
          position={{
            lat: route?.legs?.[0]?.endLocation?.latLng?.latitude ?? 0,
            lng: route?.legs?.[0]?.endLocation?.latLng?.longitude ?? 0
          }}
        >
          <Pin
            background={'#0f9d58'}
            borderColor={'#006425'}
            glyphColor={'#60d98f'}
            glyph="B"
          />
        </AdvancedMarker>
        <Polyline encodedPath={route?.polyline?.encodedPolyline} />
        {stepMarkers}
      </Map>
    </APIProvider>
  )
}
