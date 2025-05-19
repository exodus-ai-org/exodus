import { protos } from '@googlemaps/places'
import { PlacesAccordion } from './places-accordion'

export function GoogleMapsPlacesCard({
  toolResult
}: {
  toolResult: [
    protos.google.maps.places.v1.ISearchTextResponse,
    protos.google.maps.places.v1.ISearchTextRequest | undefined,
    object | undefined
  ]
}) {
  return !toolResult[0].places ? (
    <div className="-mt-4" />
  ) : (
    <PlacesAccordion places={toolResult[0].places} />
  )
}
