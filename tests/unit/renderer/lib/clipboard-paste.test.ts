import { describe, expect, it } from 'vitest'

import {
  htmlVisibleText,
  pastedFiles,
  pasteKeepsText,
  pasteUploadsImages
} from '@/lib/clipboard-paste'

// A paste that attaches images: does its text go into the composer too?
const keeps = (fileNames: string[], plain = '', html = '') =>
  pasteKeepsText({ fileNames, plain, html })

describe('the text of a paste that attaches images', () => {
  it('is dropped when Finder put the file name in it', () => {
    expect(keeps(['photo.png'], 'photo.png')).toBe(false)
    expect(
      keeps(
        ['Screenshot 2026-10-02 at 09.12.33.png'],
        'Screenshot 2026-10-02 at 09.12.33.png'
      )
    ).toBe(false)
  })

  it('is dropped for several files, one name per line', () => {
    expect(keeps(['a.png', 'b.jpg'], 'a.png\rb.jpg')).toBe(false)
    expect(keeps(['a.png', 'b.jpg'], 'a.png\nb.jpg\n')).toBe(false)
    // A file the composer does not attach is still one of the copied files.
    expect(keeps(['a.png', 'notes.pdf'], 'a.png\r\nnotes.pdf')).toBe(false)
  })

  it('is dropped when the name has no extension, or is a path', () => {
    expect(keeps(['photo.png'], 'photo')).toBe(false)
    expect(keeps(['photo.png'], '/Users/me/Desktop/photo.png')).toBe(false)
  })

  it('is dropped when there is none (a screenshot)', () => {
    expect(keeps(['image.png'])).toBe(false)
    expect(keeps(['image.png'], '  \n')).toBe(false)
  })

  it('is dropped when it is only the copied image itself (browser "Copy Image")', () => {
    expect(
      keeps(
        ['image.png'],
        '',
        '<meta charset="utf-8"><img src="https://example.com/cat.jpg" alt="a cat"/>'
      )
    ).toBe(false)
    expect(keeps(['image.png'], 'https://example.com/cat.jpg')).toBe(false)
  })

  it('is kept when it is content of its own (a rich copy)', () => {
    expect(
      keeps(
        ['image.png'],
        'Quarterly results\nRevenue grew 12%.',
        '<p>Quarterly results</p><img src="x.png"><p>Revenue grew 12%.</p>'
      )
    ).toBe(true)
    expect(keeps(['image.png'], 'Look at this chart')).toBe(true)
  })

  it('is kept when it only mentions a file name', () => {
    expect(keeps(['photo.png'], 'see photo.png for details')).toBe(true)
    expect(keeps(['photo.png'], 'photo.png\nand a caption')).toBe(true)
  })
})

describe('htmlVisibleText', () => {
  it('drops tags, comments, styles and entities for spaces', () => {
    expect(
      htmlVisibleText(
        '<html><head><style>p{}</style></head><body><!--StartFragment--><p>a&nbsp;<b>b</b></p><!--EndFragment--></body></html>'
      )
    ).toBe('a b')
    expect(htmlVisibleText('<img src="x.png" alt="cat">')).toBe('')
  })
})

const item = (kind: string, file: File | null) => ({
  kind,
  getAsFile: () => file
})

describe('pastedFiles', () => {
  it('attaches the images and names every file', () => {
    const png = new File(['x'], 'a.png', { type: 'image/png' })
    const pdf = new File(['x'], 'notes.pdf', { type: 'application/pdf' })
    const { images, fileNames } = pastedFiles([
      item('string', null),
      item('file', png),
      item('file', pdf),
      item('file', null)
    ])
    expect(images).toEqual([png])
    expect(fileNames).toEqual(['a.png', 'notes.pdf'])
  })

  it('finds nothing in a plain text paste', () => {
    expect(pastedFiles([item('string', null)])).toEqual({
      images: [],
      fileNames: []
    })
  })
})

describe('whether a paste attaches its images', () => {
  const excel = {
    fileNames: ['image.png'],
    plain: 'Name\tQty\nApples\t3',
    html: '<table><tr><td>Name</td><td>Qty</td></tr></table>'
  }

  it('does not for cells from Excel: the text is pasted, no picture', () => {
    expect(pasteKeepsText(excel)).toBe(true)
    expect(pasteUploadsImages(excel)).toBe(false)
  })

  it('does for a screenshot: an image and no text', () => {
    const shot = { fileNames: ['image.png'], plain: '', html: '' }
    expect(pasteUploadsImages(shot)).toBe(true)
    expect(pasteKeepsText(shot)).toBe(false)
  })

  it('does for a Finder copy, whose text is dropped', () => {
    const finder = { fileNames: ['photo.png'], plain: 'photo.png', html: '' }
    expect(pasteUploadsImages(finder)).toBe(true)
    expect(pasteKeepsText(finder)).toBe(false)
  })
})
