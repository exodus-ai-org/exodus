import { protos } from '@googlemaps/places'
import { useEffect, useState } from 'react'
import { PlacesAccordion } from './places-accordion'

export function GoogleMapsPlacesCard({ toolResult }: { toolResult: string }) {
  const [dataSource, setDataSource] = useState<
    protos.google.maps.places.v1.IPlace[] | null
  >(null)
  useEffect(() => {
    try {
      setDataSource(JSON.parse(toolResult)[0].places)
    } catch {
      // Do nothing...
    }
  }, [toolResult])

  if (!dataSource) return null

  return <PlacesAccordion places={dataSource} />
}
