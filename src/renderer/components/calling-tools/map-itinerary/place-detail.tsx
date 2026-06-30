import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  GlobeIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  XIcon
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem
} from '@/components/ui/carousel'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

import { buildPlacePhotoUrl, type ItineraryPlace } from './types'

type PlaceDetailProps = {
  place: ItineraryPlace
  dayLabel: string
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

function formatReviewCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toString()
}

type Tab = 'overview' | 'reviews' | 'hours'

/** Floating overlay on the right side of the map mirroring Claude's
 *  itinerary detail panel: hero photo (carousel if Places returned more),
 *  day/time badge, name, rating, contact info, notes, reviews, hours,
 *  and prev/next pagination. */
export function PlaceDetail({
  place,
  dayLabel,
  index,
  total,
  onPrev,
  onNext,
  onClose
}: PlaceDetailProps) {
  const { data: settings } = useSettings()
  const apiKey = settings?.googleCloud?.googleApiKey
  const [tab, setTab] = useState<Tab>('overview')
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [photoIdx, setPhotoIdx] = useState(0)

  const photoUrls = useMemo(() => {
    if (!apiKey || !place.photoNames?.length) return []
    return place.photoNames
      .map((n) => buildPlacePhotoUrl(n, apiKey, 800))
      .filter((u): u is string => !!u)
  }, [apiKey, place.photoNames])

  // Track the carousel's current slide index for the "1/N" counter.
  useEffect(() => {
    if (!carouselApi) return
    setPhotoIdx(carouselApi.selectedScrollSnap())
    const onSelect = () => setPhotoIdx(carouselApi.selectedScrollSnap())
    carouselApi.on('select', onSelect)
    return () => {
      carouselApi.off('select', onSelect)
    }
  }, [carouselApi])

  // Reset internal state when the place changes via prev/next, so a stale
  // photo index or sub-tab doesn't leak into the new place.
  const placeKey = `${place.lat}-${place.lng}-${place.name}`
  const [lastKey, setLastKey] = useState(placeKey)
  if (lastKey !== placeKey) {
    setLastKey(placeKey)
    setTab('overview')
    setPhotoIdx(0)
    // Snap the carousel back to the first slide instantly (no animation,
    // since the place itself just changed underneath).
    carouselApi?.scrollTo(0, true)
  }

  const hasReviews = (place.reviews?.length ?? 0) > 0
  const hasHours = (place.openingHours?.length ?? 0) > 0

  return (
    <div className="border-border bg-card/95 absolute top-3 right-3 bottom-3 z-10 flex w-80 flex-col overflow-hidden rounded-2xl border shadow-xl backdrop-blur">
      {/* Hero — shadcn Carousel cycling through Places photos when we have
          more than one; falls back to a tinted gradient when we have none. */}
      <div className="bg-muted relative h-36 shrink-0 overflow-hidden">
        {photoUrls.length > 0 ? (
          <Carousel
            setApi={setCarouselApi}
            opts={{ loop: photoUrls.length > 1 }}
            className="size-full"
          >
            <CarouselContent className="ml-0">
              {photoUrls.map((url, i) => (
                <CarouselItem key={i} className="pl-0">
                  <img
                    src={url}
                    alt={place.name}
                    loading="lazy"
                    className="h-36 w-full object-cover"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            {photoUrls.length > 1 && (
              // Dot indicators — clickable, active dot widens to a pill.
              // Navigation: swipe / drag / arrow keys / clicking dots.
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/45 px-2 py-1 backdrop-blur-sm">
                {photoUrls.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to photo ${i + 1}`}
                    aria-current={i === photoIdx ? 'true' : undefined}
                    onClick={() => carouselApi?.scrollTo(i)}
                    className={cn(
                      'h-1.5 rounded-full bg-white transition-all',
                      i === photoIdx
                        ? 'w-4 opacity-100'
                        : 'w-1.5 opacity-50 hover:opacity-80'
                    )}
                  />
                ))}
              </div>
            )}
          </Carousel>
        ) : (
          <div className="from-primary/20 to-muted size-full bg-gradient-to-br" />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail panel"
          className="bg-background/80 text-foreground hover:bg-background absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-full shadow-sm backdrop-blur transition-colors"
        >
          <XIcon size={14} />
        </button>
      </div>

      {/* Header strip — day · time, name, rating + type chip */}
      <div className="border-border space-y-1.5 border-b px-4 pt-3 pb-3">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span>{dayLabel}</span>
          {place.timeLabel && (
            <>
              <span aria-hidden>·</span>
              <span>{place.timeLabel}</span>
            </>
          )}
          {place.openNow !== undefined && (
            <>
              <span aria-hidden>·</span>
              <span
                className={cn(
                  'font-medium',
                  place.openNow
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                )}
              >
                {place.openNow ? 'Open' : 'Closed'}
              </span>
            </>
          )}
        </div>
        <h3 className="text-foreground text-base leading-tight font-semibold">
          {place.name}
        </h3>
        {(place.rating !== undefined || place.type) && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            {place.rating !== undefined && (
              <span className="flex items-center gap-1">
                <span className="text-foreground font-medium">
                  {place.rating.toFixed(1)}
                </span>
                <StarIcon size={11} className="fill-amber-500 text-amber-500" />
                {place.reviewCount !== undefined && (
                  <span>({formatReviewCount(place.reviewCount)})</span>
                )}
              </span>
            )}
            {place.rating !== undefined && place.type && (
              <span aria-hidden>·</span>
            )}
            {place.type && <span>{place.type}</span>}
          </div>
        )}
      </div>

      {/* Tabs — only the Reviews and Hours tabs are gated on whether we have
          that data; Overview is always present. */}
      {(hasReviews || hasHours) && (
        <div
          role="tablist"
          aria-label="Place sections"
          className="border-border flex shrink-0 border-b text-xs"
        >
          {/* react-doctor/js-combine-iterations: false positive — literal 3-item array, extra pass is negligible */}
          {(
            [
              { id: 'overview', label: 'Overview', enabled: true },
              { id: 'reviews', label: 'Reviews', enabled: hasReviews },
              { id: 'hours', label: 'Hours', enabled: hasHours }
            ] as const
          )
            .filter((t) => t.enabled)
            .map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex-1 px-3 py-2 font-medium transition-colors',
                  tab === t.id
                    ? 'text-foreground border-foreground border-b-2'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {tab === 'overview' && (
          <>
            {place.note && (
              <div className="bg-muted/40 rounded-lg p-2.5">
                <div className="text-muted-foreground mb-1 text-[10px] tracking-widest uppercase">
                  Notes
                </div>
                <p className="text-foreground text-xs leading-relaxed">
                  {place.note}
                </p>
              </div>
            )}
            <ContactRow
              icon={<MapPinIcon size={12} />}
              text={place.address}
              href={
                place.googleMapsUri ??
                `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
              }
            />
            <ContactRow
              icon={<PhoneIcon size={12} />}
              text={place.phone}
              href={
                place.phone
                  ? `tel:${place.phone.replace(/\s+/g, '')}`
                  : undefined
              }
              monospace
            />
            <ContactRow
              icon={<GlobeIcon size={12} />}
              text={place.websiteUri?.replace(/^https?:\/\//, '')}
              href={place.websiteUri}
              truncate
            />
          </>
        )}

        {tab === 'reviews' && hasReviews && (
          <div className="space-y-2.5">
            {place.reviews!.map((r, i) => (
              <article
                key={i}
                className="border-border rounded-lg border p-2.5"
              >
                <div className="mb-1 flex items-center gap-2">
                  {r.authorPhotoUrl ? (
                    <img
                      src={r.authorPhotoUrl}
                      alt=""
                      loading="lazy"
                      className="bg-muted size-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full text-[10px] font-medium">
                      {r.author?.charAt(0)?.toUpperCase() ?? '·'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate text-xs font-medium">
                      {r.author ?? 'Anonymous'}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                      {r.rating !== undefined && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <StarIcon
                              key={j}
                              size={9}
                              className={
                                j < (r.rating ?? 0)
                                  ? 'fill-amber-500 text-amber-500'
                                  : 'text-muted-foreground/40'
                              }
                            />
                          ))}
                        </span>
                      )}
                      {r.relativeTime && <span>{r.relativeTime}</span>}
                    </div>
                  </div>
                </div>
                {r.text && (
                  <p className="text-muted-foreground line-clamp-4 text-xs leading-relaxed">
                    {r.text}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}

        {tab === 'hours' && hasHours && (
          <ul className="space-y-1 text-xs">
            {place.openingHours!.map((line, i) => {
              const sep = line.indexOf(': ')
              const day = sep >= 0 ? line.slice(0, sep) : line
              const time = sep >= 0 ? line.slice(sep + 2) : ''
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 py-0.5"
                >
                  <span className="text-foreground font-medium">{day}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ClockIcon size={10} />
                    {time}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Pagination — circles through the day's places without dismissing
          the card. */}
      <div className="border-border flex items-center justify-between border-t px-2 py-1.5">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous place"
          className={cn(
            'hover:bg-muted text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors',
            total <= 1 && 'pointer-events-none opacity-30'
          )}
          disabled={total <= 1}
        >
          <ChevronLeftIcon size={14} />
        </button>
        <span className="text-muted-foreground text-[11px]">
          {index + 1} of {total}
        </span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next place"
          className={cn(
            'hover:bg-muted text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors',
            total <= 1 && 'pointer-events-none opacity-30'
          )}
          disabled={total <= 1}
        >
          <ChevronRightIcon size={14} />
        </button>
      </div>
    </div>
  )
}

function ContactRow({
  icon,
  text,
  href,
  monospace,
  truncate
}: {
  icon: React.ReactNode
  text: string | undefined
  href?: string
  monospace?: boolean
  truncate?: boolean
}) {
  if (!text) return null
  const content = (
    <span
      className={cn('flex-1', monospace && 'font-mono', truncate && 'truncate')}
    >
      {text}
    </span>
  )
  return (
    <div className="text-muted-foreground flex items-start gap-2 text-xs">
      <span className="mt-0.5 shrink-0">{icon}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground min-w-0 flex-1 transition-colors"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  )
}
