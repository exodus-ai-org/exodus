import MarkdownIt, {
  type MarkdownIt as Markdown,
  type RendererRule
} from 'markdown-it'

/**
 * What a PDF export prints (the chat export and the Deep Research export):
 * the Markdown as HTML in a plain, readable sheet — the system's font, grey
 * code panels, ruled tables, a quiet rule under quotes. `html: false` (the
 * default) keeps anything the model wrote as tags as text.
 */
const STYLE = [
  'body{font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#111;max-width:46em;margin:0 auto;padding:24px}',
  'h1,h2,h3,h4{line-height:1.3;margin:1.4em 0 0.5em}',
  'h1{font-size:1.7em}h2{font-size:1.3em}h3{font-size:1.1em}',
  'p,ul,ol,pre,blockquote,table{margin:0 0 0.9em}',
  'pre{background:#f4f4f4;padding:12px;border-radius:8px;overflow-x:auto;font-size:13px;white-space:pre-wrap}',
  'code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.92em}',
  ':not(pre)>code{background:#f4f4f4;padding:1px 4px;border-radius:4px}',
  'blockquote{margin-left:0;padding-left:12px;border-left:3px solid #ddd;color:#555}',
  'table{border-collapse:collapse}th,td{border:1px solid #ddd;padding:4px 8px;text-align:left}',
  'img{max-width:100%}a{color:#1a56db}hr{border:0;border-top:1px solid #ddd;margin:1.4em 0}'
].join('')

const RASTER_DATA = /^data:image\/(?:png|jpe?g|gif|webp);base64,/iu

/**
 * The print window would fetch a picture's URL unasked — the zero-click beacon
 * the chat keeps behind a tap (`remote-image.tsx`) — so only a picture carried
 * inline is drawn, and any other is a link to its URL.
 */
function inlineImagesOnly(md: Markdown): void {
  const drawn = md.renderer.rules.image!
  const image: RendererRule = (tokens, index, options, env, self) => {
    const token = tokens[index]!
    const src = String(token.attrGet('src') ?? '')
    if (RASTER_DATA.test(src)) return drawn(tokens, index, options, env, self)
    const alt = self.renderInlineAsText(token.children ?? [], options, env)
    const { escapeHtml } = md.utils
    return `<a href="${escapeHtml(src)}">${escapeHtml(alt || src)}</a>`
  }
  md.renderer.rules.image = image
}

export function printDocument(markdown: string): string {
  const md = new MarkdownIt()
  inlineImagesOnly(md)
  const body = md.render(markdown)
  return `<!doctype html><html><head><meta charset="utf-8"><style>${STYLE}</style></head><body>${body}</body></html>`
}
