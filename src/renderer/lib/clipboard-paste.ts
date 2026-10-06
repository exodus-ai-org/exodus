// What a paste into the composer does with the clipboard's text when it also
// carries images the composer attaches.
//
// A textarea's default paste inserts `text/plain`, whatever else is on the
// clipboard. A file copied in Finder puts its name there (several files: one
// name per line), and a browser's "Copy Image" puts an `<img>` in `text/html`
// (sometimes the image's address in `text/plain`) — so pasting a picture used
// to attach it and type its file name too. That text is a label for the
// image, not something written: drop it. Text that is content of its own (a
// rich copy of a paragraph with a picture in it) is still pasted.

export interface PasteClipboard {
  /** Names of the clipboard's files — every file, not only the attached. */
  fileNames: readonly string[]
  /** `text/plain` ('' when absent). */
  plain: string
  /** `text/html` ('' when absent). */
  html: string
}

const URL_LINE = /^(?:https?|file|data|blob):\S*$/iu

/** The text an HTML fragment shows: no tags, comments, styles or scripts. */
export function htmlVisibleText(html: string): string {
  return html
    .replaceAll(/<!--[\s\S]*?-->/gu, ' ')
    .replaceAll(/<(style|script|head|title)\b[\s\S]*?<\/\1\s*>/giu, ' ')
    .replaceAll(/<[^>]*>/gu, ' ')
    .replaceAll(/&nbsp;|&#160;|&#xa0;/giu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim()
}

const withoutExtension = (name: string) => name.replace(/\.[^./\\]+$/u, '')

/** Whether `text` only names the pasted files (or their addresses). */
function onlyLabels(text: string, fileNames: readonly string[]): boolean {
  const names = new Set<string>()
  for (const name of fileNames) {
    names.add(name)
    names.add(withoutExtension(name))
  }
  return text
    .split(/\r\n|\r|\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .every((line) => {
      const base = line.split(/[/\\]/u).pop() ?? line
      return names.has(line) || names.has(base) || URL_LINE.test(line)
    })
}

/**
 * Whether a paste that attaches images should also insert its text. False
 * when the text is empty or only the files' names/addresses.
 */
export function pasteKeepsText({
  fileNames,
  plain,
  html
}: PasteClipboard): boolean {
  const isContent = (text: string) =>
    text.trim() !== '' && !onlyLabels(text, fileNames)
  return isContent(htmlVisibleText(html)) || isContent(plain)
}

/** The clipboard's files: the images the composer attaches, and every
 * file's name (a Finder copy's text names them all). */
export function pastedFiles(
  items: Iterable<{ kind: string; getAsFile: () => File | null }>
): { images: File[]; fileNames: string[] } {
  const images: File[] = []
  const fileNames: string[] = []
  for (const item of items) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (!file) continue
    fileNames.push(file.name)
    if (file.type.startsWith('image/')) images.push(file)
  }
  return { images, fileNames }
}

/**
 * Whether a paste attaches its images. Only when the clipboard has no content
 * text: a screenshot, or a Finder copy whose text just names the files. Cells
 * copied from Excel or Numbers carry a rendered picture of themselves beside
 * their text; the text is what was copied, so the picture is not uploaded.
 */
export function pasteUploadsImages(clipboard: PasteClipboard): boolean {
  return !pasteKeepsText(clipboard)
}
