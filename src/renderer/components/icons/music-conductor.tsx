import { createLucideIcon } from 'lucide-react'

/**
 * Custom lucide icon: a conductor mid-gesture — raised baton, open arms, a
 * stray eighth-note. Hand-traced from Streamline's "music-conductor" onto a
 * lucide 24×24 / 2px-stroke grid, so it behaves like any lucide icon (inherits
 * the `.lucide` stroke width, takes `size` / `color` / `className`, etc.).
 *
 * Used as the Philharmonic workspace glyph.
 */
export const MusicConductor = createLucideIcon('music-conductor', [
  ['circle', { cx: '3.4', cy: '7', r: '1.6', key: 'note-head' }],
  ['path', { d: 'M5 7V2.5l2.6 1.2', key: 'note-stem' }],
  ['circle', { cx: '11.7', cy: '8.4', r: '2.2', key: 'head' }],
  [
    'path',
    {
      d: 'M3.4 12.5c.8-1 1.9-1.4 3.1-1.3 2.4.2 4 .9 5.7 1 1.9.1 3.6-.5 5-1.9',
      key: 'arms'
    }
  ],
  ['path', { d: 'M17.2 10.3 21.5 3.5', key: 'baton' }],
  ['path', { d: 'M11.7 10.6v4.7l-3.1 5.9m3.1-5.9 3.1 5.9', key: 'legs' }]
])
