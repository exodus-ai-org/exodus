import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import {
  DEFAULT_STOCK_RANGE,
  type StockBlock as StockBlockData
} from '@exodus/shared/types/interactive'
import {
  STOCK_CHART_HEIGHT,
  tradingViewEmbedUrl,
  tradingViewSymbolPageUrl
} from '@exodus/shared/utils/stock-chart'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** How long the frame may say nothing before the card gives up on it (offline, blocked). */
export const STOCK_FRAME_TIMEOUT_MS = 10_000

/**
 * A reply's stock chart (`exodus-stock`): TradingView's Mini Chart as its
 * own embed URL in a sandboxed frame — no script of theirs in our document;
 * the frame cannot navigate us or open windows — the model's note under it,
 * and "Chart by TradingView" with the symbol's page. The frame is not lazy:
 * a frame that never starts could not be told from one that failed, and the
 * card falls back to the symbol and the note when it fails or stays silent.
 */
export function StockBlock({ block }: { block: StockBlockData }) {
  const { t, i18n } = useTranslation('chat')
  const { resolvedTheme } = useTheme()
  const [phase, setPhase] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en'
  const src = useMemo(
    () =>
      tradingViewEmbedUrl({
        symbol: block.symbol,
        range: block.range ?? DEFAULT_STOCK_RANGE,
        theme: resolvedTheme === 'dark' ? 'dark' : 'light',
        locale
      }),
    [block.symbol, block.range, resolvedTheme, locale]
  )

  useEffect(() => {
    if (phase !== 'loading') return
    const timer = setTimeout(() => setPhase('failed'), STOCK_FRAME_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [phase, src])

  // React wires no `error` listener on an <iframe> (only `load`), so
  // `onError` would never fire; the frame's own listener does.
  const frameRef = useCallback((frame: HTMLIFrameElement | null) => {
    if (!frame) return
    const fail = () => setPhase('failed')
    frame.addEventListener('error', fail)
    return () => frame.removeEventListener('error', fail)
  }, [])

  const note = block.note?.trim()
  return (
    <section
      data-interactive="stock"
      data-state={phase}
      data-testid={TEST_IDS.chat.richBlocks.stock}
      className="bg-card text-card-foreground overflow-hidden rounded-2xl border"
    >
      {phase === 'failed' ? (
        <div
          data-testid={TEST_IDS.chat.richBlocks.stockFallback}
          className="flex flex-col gap-1 px-4 pt-4"
        >
          <p className="text-sm font-semibold">{block.symbol}</p>
          <p className="text-muted-foreground text-sm">
            {t('richBlocks.chartUnavailable')}
          </p>
        </div>
      ) : (
        <iframe
          data-testid={TEST_IDS.chat.richBlocks.stockFrame}
          key={src}
          ref={frameRef}
          src={src}
          title={block.symbol}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          height={STOCK_CHART_HEIGHT}
          className="block w-full border-0"
          onLoad={() => setPhase('loaded')}
        />
      )}
      {note && <p className="px-4 pt-3 text-sm leading-6">{note}</p>}
      <footer className="text-muted-foreground flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
        <span>{t('richBlocks.chartBy')}</span>
        <a
          href={tradingViewSymbolPageUrl(block.symbol)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-ink hover:underline"
        >
          {t('richBlocks.openOnTradingView')}
        </a>
      </footer>
    </section>
  )
}
