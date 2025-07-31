import { LazyLoadImage } from '@/components/lazy-load-image'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSettings } from '@/hooks/use-settings'
import { protos } from '@googlemaps/places'
import { Globe, MapPin, Phone, Star } from 'lucide-react'
import Zoom from 'react-medium-image-zoom'

interface RestaurantAccordionProps {
  places: protos.google.maps.places.v1.IPlace[]
  className?: string
}

export function PlacesAccordion({
  places,
  className = ''
}: RestaurantAccordionProps) {
  const { data: settings } = useSettings()

  const parseImg = (photo?: protos.google.maps.places.v1.IPhoto) => {
    if (!settings || !photo || !settings.googleCloud?.googleApiKey)
      return 'https://maps.gstatic.com/tactile/pane/result-no-thumbnail-2x.png'
    const base = 'https://places.googleapis.com/v1/'

    return (
      base +
      photo.name +
      '/media' +
      `?maxWidthPx=1600&key=${settings.googleCloud.googleApiKey}`
    )
  }

  return (
    <Card className="p-0">
      <CardContent className="p-0">
        <Accordion type="single" collapsible className={`w-full ${className}`}>
          {places
            .toSorted((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
            .map((place) => (
              <AccordionItem
                key={place.id}
                value={place.id ?? ''}
                className="overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex w-full items-center text-left">
                    <div className="relative mr-4 h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
                      <LazyLoadImage
                        src={parseImg(place.photos?.[0])}
                        alt={place.displayName?.text ?? ''}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="max-w-96 truncate text-lg font-semibold">
                        {place.displayName?.text ?? ''}
                      </h3>
                      <div className="mt-1 flex items-center">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="ml-1 text-sm font-medium">
                            {typeof place.rating === 'number' &&
                            Number.isInteger(place.rating)
                              ? place.rating.toFixed(1)
                              : place.rating}
                          </span>
                          {place.userRatingCount ? (
                            <span className="ml-1 text-sm text-gray-500">
                              ({place.userRatingCount})
                            </span>
                          ) : null}
                        </div>
                        {place.primaryTypeDisplayName?.text ? (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {place.primaryTypeDisplayName.text}
                          </Badge>
                        ) : null}

                        {place.regularOpeningHours?.openNow && (
                          <Badge
                            variant="outline"
                            className="ml-2 border-green-200 bg-green-50 text-xs text-green-700"
                          >
                            Open
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-0 pb-0">
                  <div className="border-t px-4 pt-4">
                    <div className="mb-4 space-y-2 text-sm">
                      <div className="flex items-start">
                        <MapPin className="mt-0.5 mr-2 h-4 w-4 flex-shrink-0 text-gray-500" />

                        <a
                          className="text-blue-500 hover:underline"
                          href={
                            place.googleMapsUri ||
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.formattedAddress ?? '')}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {place.formattedAddress}
                        </a>
                      </div>

                      {place.websiteUri && (
                        <div className="flex items-center">
                          <Globe className="mr-2 h-4 w-4 text-gray-500" />
                          <a
                            href={place.websiteUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-blue-500 hover:underline"
                          >
                            {place.websiteUri.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}

                      {place.internationalPhoneNumber && (
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4 text-gray-500" />
                          <span className="text-gray-500">
                            {place.internationalPhoneNumber}
                          </span>
                        </div>
                      )}
                    </div>

                    <Tabs defaultValue="photos" className="w-full">
                      <TabsList className="mb-4 grid w-full grid-cols-3">
                        <TabsTrigger value="photos">Photos</TabsTrigger>
                        <TabsTrigger value="reviews">Reviews</TabsTrigger>
                        <TabsTrigger value="hours">Opening Hours</TabsTrigger>
                      </TabsList>

                      <TabsContent value="photos">
                        {place.photos && place.photos.length > 0 ? (
                          <div className="mb-4 grid grid-cols-5 gap-2">
                            {place.photos.map((photo, index) => (
                              <div
                                key={index}
                                className="relative aspect-square overflow-hidden rounded-md"
                              >
                                <Zoom>
                                  <LazyLoadImage
                                    src={parseImg(photo)}
                                    alt={`${place.displayName?.text} photo ${index + 1}`}
                                  />
                                </Zoom>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="col-span-3 py-4 text-center text-gray-500">
                            No photos yet
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="reviews">
                        <div className="mb-4 space-y-3">
                          {place.reviews && place.reviews.length > 0 ? (
                            place.reviews.map((review, index) => (
                              <div
                                key={index}
                                className="rounded-lg border p-3"
                              >
                                <div className="mb-2 flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    {review.authorAttribution?.photoUri && (
                                      <AvatarImage
                                        src={review.authorAttribution.photoUri}
                                        alt={
                                          review.authorAttribution
                                            ?.displayName ?? ''
                                        }
                                      />
                                    )}
                                    <AvatarFallback>
                                      {review.authorAttribution?.displayName?.charAt(
                                        0
                                      ) || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="text-sm font-medium">
                                      {review.authorAttribution?.displayName}
                                    </div>
                                    <div className="flex items-center">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-3 w-3 ${i < (review?.rating || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
                                        />
                                      ))}
                                      <span className="ml-1 text-xs text-gray-500">
                                        {review.relativePublishTimeDescription}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {review.text?.text}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="py-4 text-center text-gray-500">
                              No comments yet
                            </p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="hours">
                        {place.regularOpeningHours?.weekdayDescriptions ? (
                          <div className="mb-4 space-y-1 text-sm">
                            {place.regularOpeningHours.weekdayDescriptions.map(
                              (description, index) => {
                                const [day, timeInfo] = description.split(': ')

                                return (
                                  <div
                                    key={index}
                                    className="flex justify-between rounded px-2 py-1.5"
                                  >
                                    <span>{day}</span>
                                    <span>{timeInfo}</span>
                                  </div>
                                )
                              }
                            )}
                          </div>
                        ) : (
                          <p className="mb-4 py-4 text-center text-gray-500">
                            No opening hours yet
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}
