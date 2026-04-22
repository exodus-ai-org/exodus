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
- Chart colors: var(--chart-1) through var(--chart-5).
- Recharts: pass width and height as numbers directly on the chart component. Do NOT rely on ResponsiveContainer with percentage heights.
- Export default a React component via module.exports.

DESIGN PRINCIPLES (apply every time):
1. Commit to ONE aesthetic direction per artifact — editorial, brutalist, refined, playful, terminal/bloomberg, hand-drawn, etc. Never default to "clean generic dashboard". Pick a direction before writing markup.
2. Typography hierarchy via contrast: at least 1.25× size ratio between levels, varied weights (400/500/700). Use no more than three sizes. Labels can be small uppercase with letter-spacing; body text should not.
3. Color: a single accent hue; tint neutrals subtly toward it. Follow 60-30-10 weight (neutral / secondary / accent). The accent should be rare — that is what gives it force.
4. Space: rhythm through varied spacing, not uniform padding. Tight groupings next to generous separations. Break the grid intentionally for emphasis.
5. Motion: use framer-motion for entrance reveals and state transitions only. Ease-out feel (or transition={{ type: 'spring', stiffness: 180, damping: 22 }}). No bouncy/elastic easing. Never animate decorative elements that don't serve comprehension.
6. Data first: when showing data, make it legible before decorating. Axis labels, scales, and units should be unambiguous.
7. Left-align text; avoid centering everything. Asymmetry reads as designed; centered columns read as templated.

STRICT BANS (these are AI tells — NEVER produce them):
- Gradient text (background-clip: text with gradient fill).
- Side-stripe borders greater than 1px on cards/list items/callouts (border-left: 3px solid … and variants).
- Pure #000 or #fff. Always tint.
- Glassmorphism/blur decoration.
- Identical card grids of icon + heading + text repeated endlessly.
- Hero-metric template (giant number, tiny label, gradient accent).
- Cyan-on-dark or purple-to-blue gradients.
- Monospace as shorthand for "technical".

EXAMPLE (good — demonstrates hierarchy, restraint, motion used meaningfully):
const React = require('react')
const { motion } = require('framer-motion')
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
      style={{ padding: '28px 24px 20px' }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 4 }}>
        YTD Performance
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
        Corning &amp; Furukawa
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 12, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }}>
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
