import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { v4 as uuidV4 } from 'uuid'

import { saveArtifact } from '../artifacts'

const createArtifactSchema = Type.Object({
  title: Type.String({
    description: 'Short title for the artifact (shown in the card header)'
  }),
  code: Type.String({
    description: `A self-contained React component in TSX using CommonJS require().
Available imports:
- react (React, useState, useEffect, useMemo, useCallback, etc.)
- recharts (LineChart, BarChart, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Line, Bar, Pie, Cell, Area, AreaChart, etc.)
- lucide-react (any icon, e.g. TrendingUp, Users, Globe, etc.)
- @/ui/button (Button)
- @/ui/card (Card, CardContent, CardHeader, CardTitle)
- @/ui/badge (Badge)
- @/ui/table (Table, TableBody, TableCell, TableHead, TableHeader, TableRow)
- @/ui/tabs (Tabs, TabsContent, TabsList, TabsTrigger)

Use standard Tailwind CSS classes for styling (p-4, text-sm, flex, grid, etc.).
IMPORTANT: For dimensions/sizing, use inline style={{}} instead of Tailwind arbitrary values like h-[380px] — arbitrary values are NOT available in the sandbox CSS.
Use CSS variables for chart colors: var(--chart-1) through var(--chart-5).
For recharts, set width and height as numbers directly on the chart component — do NOT rely on ResponsiveContainer with percentage heights.
Export default a React component via module.exports.

Example:
const React = require('react')
const { BarChart, Bar, XAxis, YAxis, Tooltip } = require('recharts')
const { Card, CardHeader, CardTitle, CardContent } = require('@/ui/card')

const data = [{ name: 'A', value: 40 }, { name: 'B', value: 70 }]

function Chart() {
  return (
    <Card>
      <CardHeader><CardTitle>My Chart</CardTitle></CardHeader>
      <CardContent>
        <BarChart width={600} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="var(--chart-1)" />
        </BarChart>
      </CardContent>
    </Card>
  )
}

module.exports = { default: Chart }`
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
