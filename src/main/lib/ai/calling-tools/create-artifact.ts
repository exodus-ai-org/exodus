import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { v4 as uuidV4 } from 'uuid'

import { saveArtifact } from '../artifacts'

const createArtifactSchema = Type.Object({
  title: Type.String({
    description: 'Short title for the artifact (shown in the card header)'
  }),
  code: Type.String({
    description: `A self-contained React component in TSX using CommonJS require(). The component renders inside a browser-chrome-wrapped card in a live chat. Treat every artifact as a small, distinctive design piece — not a default dashboard.

CRITICAL — THEME ADAPTATION (read this first, ignoring it ships a broken artifact):
The sandbox toggles a \`.dark\` class on <html>. Hard-coded hex/rgb/oklch values are baked in and DO NOT flip with the theme — an artifact authored in light mode will be unreadable in dark mode and vice versa. Static Tailwind palette classes (\`bg-stone-*\`, \`text-stone-*\`, \`border-stone-*\`, \`bg-gray-*\`, \`text-zinc-*\`, etc.) have the same problem.

The ONLY way to ship a theme-correct artifact is to use these tokens for every surface, every piece of text, and every border:
- Surfaces: \`bg-background\`, \`bg-card\`, \`bg-muted\`, \`bg-popover\` (or \`var(--background)\`, \`var(--card)\`, \`var(--muted)\`, \`var(--popover)\`)
- Text: \`text-foreground\`, \`text-muted-foreground\`, \`text-card-foreground\` (or \`var(--foreground)\`, \`var(--muted-foreground)\`)
- Borders / dividers: \`border-border\`, plain \`border\` (or \`var(--border)\`)
- UI accents: \`text-primary\`, \`bg-primary/10\`, \`bg-secondary\`, \`bg-accent\`, \`bg-destructive\`/\`text-destructive-foreground\`
- Charts ONLY: \`var(--chart-1)\` … \`var(--chart-5)\` — these already adapt per theme.

WRONG (every line below breaks in the opposite theme):
  style={{ background: '#f7f5f1', color: '#1f2937' }}
  style={{ background: '#fcfbf8' }}                            // covers Card's bg-card
  className="bg-stone-50 text-stone-900 border-stone-200"
  <Card style={{ background: '#fff' }}>
  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">  // no dark: variant

RIGHT:
  className="bg-background text-foreground"
  <Card className="bg-card border-border">                     // shadcn already themes Card
  className="text-muted-foreground border-border"
  className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"  // status colors paired
  style={{ color: 'var(--muted-foreground)' }}                 // inline only when Tailwind can't reach (e.g. recharts axis stroke)

AVAILABLE IMPORTS:
- react (React, useState, useEffect, useMemo, useCallback, useRef, …)
- recharts (LineChart, AreaChart, BarChart, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Area, Bar, Pie, Cell, …)
- framer-motion (motion, AnimatePresence, useMotionValue, useTransform, …)
- lucide-react (any icon)
- @/ui/button (Button)
- @/ui/card (Card, CardContent, CardHeader, CardTitle)
- @/ui/badge (Badge)
- @/ui/table (Table, TableBody, TableCell, TableHead, TableHeader, TableRow)
- @/ui/tabs (Tabs, TabsContent, TabsList, TabsTrigger)

STYLING:
- Tailwind utility classes. For dimensions, prefer inline style={{}} over arbitrary values like h-[380px] — arbitrary values are NOT available in the sandbox CSS.
- For colors, follow the THEME ADAPTATION rules above — every surface/text/border goes through theme tokens.
- Recharts: pass width and height as numbers directly on the chart component. Do NOT rely on ResponsiveContainer with percentage heights. Wire \`stroke\` / \`fill\` to \`var(--chart-1..5)\`, axes to \`var(--muted-foreground)\`, gridlines to \`var(--border)\`.
- Export default a React component via module.exports.

DESIGN PRINCIPLES (apply every time):
1. Commit to ONE aesthetic direction per artifact — editorial, brutalist, refined, playful, terminal/bloomberg, hand-drawn, etc. Never default to "clean generic dashboard". Pick a direction before writing markup.
2. Typography hierarchy via contrast: at least 1.25× size ratio between levels, varied weights (400/500/700). Use no more than three sizes. Labels can be small uppercase with letter-spacing; body text should not.
3. Color: pick a single accent hue and apply it via \`text-primary\` / \`bg-primary/10\` / \`var(--primary)\` — never via raw hex. Use the theme tokens (background / card / muted / foreground / muted-foreground / border) as your neutral base; do NOT shift the neutrals with custom hex tints, the theme already provides tinted neutrals that flip per mode. Follow 60-30-10 weight (neutral / secondary / accent). The accent should be rare — that is what gives it force.
4. Space: rhythm through varied spacing, not uniform padding. Tight groupings next to generous separations. Break the grid intentionally for emphasis.
5. Motion: use framer-motion for entrance reveals and state transitions only. Ease-out feel (or transition={{ type: 'spring', stiffness: 180, damping: 22 }}). No bouncy/elastic easing. Never animate decorative elements that don't serve comprehension.
6. Data first: when showing data, make it legible before decorating. Axis labels, scales, and units should be unambiguous.
7. Left-align text; avoid centering everything. Asymmetry reads as designed; centered columns read as templated.

STRICT BANS (these are AI tells — NEVER produce them):
- Hard-coded hex / rgb / oklch on \`background\`, \`color\`, or \`border-color\` for any surface, text, or divider. (Recharts \`stroke\`/\`fill\` and decorative SVG inside an icon are the ONLY exceptions, and even there prefer \`var(--chart-*)\`.)
- Static Tailwind palette classes for surfaces or text (\`bg-stone-*\`, \`text-stone-*\`, \`border-stone-*\`, \`bg-gray-*\`, \`text-gray-*\`, \`bg-zinc-*\`, \`text-zinc-*\`, \`bg-neutral-*\`, \`text-neutral-*\`, \`bg-slate-*\`, \`text-slate-*\`). Status badges (emerald/amber/rose/red) are OK only when paired with their \`dark:\` counterparts.
- Inline \`style={{ background: ... }}\` on \`<Card>\` or any surface container — Card already themes itself, override only by changing className to a different theme token.
- Gradient text (background-clip: text with gradient fill).
- Side-stripe borders greater than 1px on cards/list items/callouts (border-left: 3px solid … and variants).
- Glassmorphism/blur decoration.
- Identical card grids of icon + heading + text repeated endlessly.
- Hero-metric template (giant number, tiny label, gradient accent).
- Cyan-on-dark or purple-to-blue gradients.
- Monospace as shorthand for "technical".

EXAMPLE (good — demonstrates theme-token surfaces, hierarchy, restraint, motion used meaningfully):
const React = require('react')
const { motion } = require('framer-motion')
const { Card, CardContent } = require('@/ui/card')
const { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } = require('recharts')

const data = [
  { d: 'Jan', a: 100, b: 100 },
  { d: 'Feb', a: 108, b: 103 },
  { d: 'Mar', a: 112, b: 107 },
  { d: 'Apr', a: 119, b: 109 },
  { d: 'May', a: 124, b: 118 },
  { d: 'Jun', a: 132, b: 124 }
]

function YtdChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className="bg-background text-foreground"
      style={{ padding: 24 }}
    >
      <Card className="bg-card border-border">
        <CardContent style={{ padding: '28px 24px 20px' }}>
          <div className="text-muted-foreground" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            YTD Performance
          </div>
          <div className="text-foreground" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Corning &amp; Furukawa
          </div>
          <div className="text-foreground" style={{ display: 'flex', gap: 24, marginTop: 12, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }}>
            <span>GLW <span style={{ color: 'var(--chart-1)' }}>+24.1%</span></span>
            <span>5801.T <span style={{ color: 'var(--chart-2)' }}>+18.3%</span></span>
          </div>
          <div style={{ marginTop: 18 }}>
            <LineChart width={600} height={240} data={data}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="d" stroke="var(--muted-foreground)" tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" tickLine={false} domain={[95, 140]} />
              <Tooltip />
              <Line type="monotone" dataKey="a" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="b" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
            </LineChart>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

module.exports = { default: YtdChart }`
  })
})

export const createArtifact = (
  chatId: string
): AgentTool<typeof createArtifactSchema> => ({
  name: 'createArtifact',
  label: 'Create Artifact',
  description:
    'Create a rich visual artifact (chart, table, dashboard, comparison, etc.) rendered as a live React component. Use this when data would be better presented visually rather than as plain text — for example after collecting research data, comparing options, or analyzing statistics. The component will be rendered in an interactive sandbox with Tailwind CSS styling.',
  parameters: createArtifactSchema,
  execute: async (_toolCallId, { title, code }) => {
    const artifactId = uuidV4()

    // Persist artifact to disk (fire-and-forget)
    saveArtifact(chatId, artifactId, title, code).catch(() => {})

    return {
      content: [{ type: 'text' as const, text: `Created artifact: ${title}` }],
      details: {
        type: 'artifact',
        artifactId,
        chatId,
        title,
        code
      }
    }
  }
})
