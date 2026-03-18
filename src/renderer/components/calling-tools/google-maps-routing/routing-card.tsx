import { useSetting } from '@/hooks/use-setting'
import { protos } from '@googlemaps/routing'
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin
} from '@vis.gl/react-google-maps'
import { AlertTriangleIcon, ClockIcon, RouteIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Polyline } from './polyline'

function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return ''
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${meters} m`
}

function formatDuration(duration: string | null | undefined): string {
  if (!duration) return ''
  // Duration is in proto3 format: "Xs" where X is seconds
  const seconds = parseInt(duration.replace('s', ''), 10)
  if (isNaN(seconds)) return duration
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

export function GoogleMapsCard({
  toolResult
}: {
  toolResult: [
    protos.google.maps.routing.v2.IComputeRoutesResponse,
    protos.google.maps.routing.v2.IComputeRoutesRequest | undefined,
    object | undefined
  ]
}) {
  const { data: setting } = useSetting()
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
        anchorLeft="50%"
        anchorTop="50%"
        position={position}
      >
        <div style={stepMarkerStyle} />
      </AdvancedMarker>
    )
  })

  if (
    !setting?.googleCloud?.googleApiKey ||
    !route ||
    !route.polyline?.encodedPolyline
  )
    return

  const distance = formatDistance(route.distanceMeters)
  const duration = formatDuration(
    (route.duration as unknown as { seconds?: number } | null)
      ? `${(route.duration as unknown as { seconds?: number })?.seconds ?? 0}s`
      : route.staticDuration?.toString()
  )
  const warnings = route.warnings ?? []

  return (
    <div className="flex flex-col gap-2">
      {(distance || duration) && (
        <div className="flex items-center gap-4 text-sm">
          {distance && (
            <span className="text-muted-foreground flex items-center gap-1">
              <RouteIcon size={13} />
              {distance}
            </span>
          )}
          {duration && (
            <span className="text-muted-foreground flex items-center gap-1">
              <ClockIcon size={13} />
              {duration}
            </span>
          )}
        </div>
      )}

      <APIProvider
        apiKey={setting.googleCloud.googleApiKey}
        libraries={['geometry']}
      >
        <Map
          className="w-fill h-100 rounded-xl [&>div:first-child]:rounded-xl"
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

      {warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          {warnings.map((warning, i) => (
            <div
              key={i}
              className="text-warning-foreground border-warning/30 bg-warning/10 flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 text-xs"
            >
              <AlertTriangleIcon size={12} className="mt-0.5 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
