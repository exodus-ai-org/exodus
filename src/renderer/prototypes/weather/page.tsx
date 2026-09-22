import type { WeatherResult } from '@exodus/shared/types/weather'
import { TerminalIcon } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType
} from 'react'
import { useSearchParams } from 'react-router'

import { TerminalCard } from '@/components/calling-tools/terminal/terminal-card'

import { WeatherEditorial } from './editorial'
import { WeatherInstrument } from './instrument'
import { WeatherLedger } from './ledger'
import { SAMPLE } from './shared'

/**
 * Prototype surface — `#/prototypes/weather`. Three directions for the
 * weather card behind the picker, rendered one at a time, full size, in a
 * mock transcript with a terminal card beside them for scale. Deleted when
 * a variant is promoted. The picker's look is the `prototype` skill's spec,
 * verbatim — it is harness chrome, not part of the design.
 */

const VARIANTS: Array<{
  name: string
  Component: ComponentType<{ data: WeatherResult }>
}> = [
  { name: 'Ledger', Component: WeatherLedger },
  { name: 'Editorial', Component: WeatherEditorial },
  { name: 'Instrument', Component: WeatherInstrument }
]

const PICKER_CSS = `
.proto-picker{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;background:rgba(10,10,10,0.82);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);box-shadow:0 0 0 1px rgba(255,255,255,0.08) inset,0 8px 24px rgba(0,0,0,0.24),0 2px 6px rgba(0,0,0,0.12);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1;-webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none}
.proto-picker-highlight{position:absolute;top:4px;left:0;height:28px;border-radius:999px;background:rgba(255,255,255,0.12);will-change:transform}
.proto-picker[data-ready] .proto-picker-highlight{transition:transform 250ms cubic-bezier(0.23,1,0.32,1),width 250ms cubic-bezier(0.23,1,0.32,1)}
@media (prefers-reduced-motion:reduce){.proto-picker[data-ready] .proto-picker-highlight{transition:none}}
.proto-picker-item{position:relative;display:flex;align-items:center;height:28px;padding:0 12px;border:0;border-radius:999px;background:transparent;color:rgba(255,255,255,0.55);font:inherit;cursor:pointer;transition:color 150ms ease-out}
.proto-picker-item:hover{color:rgba(255,255,255,0.85)}
.proto-picker-item:active{transform:scale(0.97)}
.proto-picker-item:focus-visible{outline:2px solid rgba(255,255,255,0.4);outline-offset:2px}
.proto-picker-item[data-active]{color:#fff}
.proto-picker-divider{width:1px;height:16px;margin:0 4px;background:rgba(255,255,255,0.12)}
.proto-picker-replay{padding:0 10px;font-size:14px}
.proto-picker[data-position="top"]{bottom:auto;top:24px}
`

const TERMINAL_SIBLING = {
  command: 'curl -s "wttr.in/Oslo?format=j1" | jq .current_condition[0].temp_C',
  cwd: '/Users/yancey/.exodus/workspace/2f1c…',
  exitCode: 0,
  stdout: '"21"',
  stderr: ''
}

export function WeatherPrototypes() {
  const [params, setParams] = useSearchParams()
  const initial = Math.min(
    VARIANTS.length,
    Math.max(1, parseInt(params.get('v') ?? '1', 10) || 1)
  )
  const [current, setCurrent] = useState(initial - 1)
  const [mountKey, setMountKey] = useState(0)
  const [ready, setReady] = useState(false)
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([])
  const highlightRef = useRef<HTMLSpanElement>(null)

  const setActive = useCallback(
    (i: number) => {
      if (i < 0 || i >= VARIANTS.length) return
      setCurrent(i)
      setMountKey((k) => k + 1)
      setParams((p) => {
        p.set('v', String(i + 1))
        return p
      })
    },
    [setParams]
  )
  const replay = useCallback(() => setMountKey((k) => k + 1), [])

  const moveHighlight = useCallback(() => {
    const el = itemsRef.current[current]
    const hl = highlightRef.current
    if (!el || !hl) return
    hl.style.width = `${el.offsetWidth}px`
    hl.style.transform = `translateX(${el.offsetLeft}px)`
  }, [current])

  useLayoutEffect(moveHighlight, [moveHighlight])
  useEffect(() => {
    window.addEventListener('resize', moveHighlight)
    return () => window.removeEventListener('resize', moveHighlight)
  }, [moveHighlight])
  useEffect(() => {
    // Enable the slide only after first paint, so load doesn't animate.
    const f = requestAnimationFrame(() =>
      requestAnimationFrame(() => setReady(true))
    )
    return () => cancelAnimationFrame(f)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (target.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= VARIANTS.length) setActive(num - 1)
      else if (e.key === 'ArrowRight')
        setActive((current + 1) % VARIANTS.length)
      else if (e.key === 'ArrowLeft')
        setActive((current - 1 + VARIANTS.length) % VARIANTS.length)
      else if (e.key === 'r' || e.key === 'R') replay()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current, replay, setActive])

  const { Component } = VARIANTS[current]
  const prompt = 'weather in Oslo'
  const step = 'Weather: Oslo'
  const answer =
    'A clear day in Oslo: 21° now and it feels like it, with a light southerly breeze. It cools quickly after sunset — tomorrow brings cloud and Wednesday the first rain of the week.'

  return (
    <div className="bg-background text-foreground min-h-svh">
      <style>{PICKER_CSS}</style>

      {/* a slice of transcript: prompt, timeline step, the card, the answer,
          and a terminal card as the neighbour it has to sit beside */}
      <div className="mx-auto flex max-w-3xl flex-col px-8 pt-12 pb-40">
        <div className="mb-8 flex justify-end">
          <p className="bg-secondary text-foreground max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 text-base leading-relaxed">
            {prompt}
          </p>
        </div>

        <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
          <span className="bg-muted-foreground/40 size-1.5 rounded-full" />
          <span>{step}</span>
        </div>

        <div className="mb-4" key={mountKey}>
          <Component data={SAMPLE} />
        </div>

        <p className="text-foreground mb-8 text-base leading-relaxed">
          {answer}
        </p>

        <div className="mb-4">
          <TerminalCard toolResult={TERMINAL_SIBLING} />
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <TerminalIcon className="size-3.5" />
          <span>{TERMINAL_SIBLING.command}</span>
        </div>
      </div>

      <nav
        className="proto-picker"
        aria-label="Prototype variants"
        data-ready={ready || undefined}
      >
        <span
          ref={highlightRef}
          className="proto-picker-highlight"
          aria-hidden="true"
        />
        {VARIANTS.map((v, i) => (
          <button
            key={v.name}
            ref={(el) => {
              itemsRef.current[i] = el
            }}
            type="button"
            className="proto-picker-item"
            data-active={i === current || undefined}
            aria-current={i === current ? 'true' : undefined}
            onClick={() => setActive(i)}
          >
            {v.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button
          type="button"
          className="proto-picker-item proto-picker-replay"
          aria-label="Replay animation (R)"
          onClick={replay}
        >
          {'↻'}
        </button>
      </nav>
    </div>
  )
}
