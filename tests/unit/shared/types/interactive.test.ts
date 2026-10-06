// The two blocks a reply can ask with, their limits, and which fence of a
// reply is its block. exodus-ios's InteractiveBlockTests holds the same
// vectors — keep them in step.
import {
  findInteractiveBlock,
  parseInteractiveBlock
} from '@exodus/shared/types/interactive'
import { describe, expect, it } from 'vitest'

const ASK_SOURCE =
  '{"title":"我想先确认一下你的具体情况","questions":[{"id":"where","text":"哪里最痒？","type":"single","options":["小腿","手臂","全身到处都痒"],"other":true},{"id":"when","text":"什么时候最痒？","type":"multi","options":["洗澡后","晚上","全天"]}],"note":"还有什么想补充的？","submit":"提交，帮我判断"}'
const CONFIRM_SOURCE =
  '{"title":"要我把这份行程写进日历吗？","details":"10 月 21–25 日，五天，17 个地点；日历「旅行」。","approve":"写进去","reject":"先不要","note":"有要改的地方可以写在这里"}'

const q = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  text: `Q ${id}`,
  type: 'single',
  options: ['x', 'y'],
  ...extra
})
const ask = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ title: 'T', questions: [q('a')], ...extra })
const confirm = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ title: 'T', ...extra })
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

const ASK_CASES: Array<[string, string, boolean]> = [
  ["the spec's example", ASK_SOURCE, true],
  [
    'eight questions',
    ask({ questions: range(8).map((i) => q(`q${i}`)) }),
    true
  ],
  [
    'nine questions',
    ask({ questions: range(9).map((i) => q(`q${i}`)) }),
    false
  ],
  ['no questions', ask({ questions: [] }), false],
  [
    'an 80-character option',
    ask({ questions: [q('a', { options: ['x'.repeat(80), 'y'] })] }),
    true
  ],
  [
    'an 81-character option',
    ask({ questions: [q('a', { options: ['x'.repeat(81), 'y'] })] }),
    false
  ],
  [
    '40 emoji (80 UTF-16 units)',
    ask({ questions: [q('a', { options: ['😀'.repeat(40), 'y'] })] }),
    true
  ],
  [
    '41 emoji (82 UTF-16 units)',
    ask({ questions: [q('a', { options: ['😀'.repeat(41), 'y'] })] }),
    false
  ],
  ['one option', ask({ questions: [q('a', { options: ['x'] })] }), false],
  [
    'nine options',
    ask({ questions: [q('a', { options: range(9).map(String) })] }),
    false
  ],
  [
    'the same option twice',
    ask({ questions: [q('a', { options: ['x', 'x'] })] }),
    false
  ],
  ['two questions with one id', ask({ questions: [q('a'), q('a')] }), false],
  ['an id with a capital', ask({ questions: [q('Where')] }), false],
  ['a 33-character id', ask({ questions: [q('a'.repeat(33))] }), false],
  [
    'a type that is neither single nor multi',
    ask({ questions: [q('a', { type: 'text' })] }),
    false
  ],
  ['an empty title', ask({ title: '' }), false],
  ['a title on two lines', ask({ title: 'A few\ndetails' }), false],
  [
    'a 201-character question',
    ask({ questions: [q('a', { text: 'q'.repeat(201) })] }),
    false
  ],
  ['a 121-character note', ask({ note: 'n'.repeat(121) }), false],
  ['a 41-character submit', ask({ submit: 's'.repeat(41) }), false],
  [
    'nulls for what is optional',
    ask({ note: null, submit: null, questions: [q('a', { other: null })] }),
    true
  ],
  ['keys it does not know', ask({ colour: 'red' }), true],
  [
    'a question on two lines',
    ask({ questions: [q('a', { text: 'Where?\nAnd when?' })] }),
    false
  ],
  [
    'an option with a carriage return',
    ask({ questions: [q('a', { options: ['x\ry', 'z'] })] }),
    false
  ],
  [
    'two questions with one text',
    ask({ questions: [q('a'), q('b', { text: 'Q a' })] }),
    false
  ],
  [
    'two questions with different texts',
    ask({ questions: [q('a'), q('b')] }),
    true
  ],
  ['not JSON', '{"title":', false],
  ['an array', '[]', false]
]

const CONFIRM_CASES: Array<[string, string, boolean]> = [
  ["the spec's example", CONFIRM_SOURCE, true],
  ['a title alone', confirm(), true],
  ['a title with a carriage return', confirm({ title: 'Send\rit?' }), false],
  ['no title', JSON.stringify({ details: 'd' }), false],
  ['a 201-character title', confirm({ title: 't'.repeat(201) }), false],
  ['1000 characters of details', confirm({ details: 'd'.repeat(1000) }), true],
  ['1001 characters of details', confirm({ details: 'd'.repeat(1001) }), false],
  ['a 41-character approve', confirm({ approve: 'a'.repeat(41) }), false],
  ['a 41-character reject', confirm({ reject: 'r'.repeat(41) }), false],
  ['a 121-character note', confirm({ note: 'n'.repeat(121) }), false]
]

describe('parseInteractiveBlock', () => {
  it.each(ASK_CASES)('exodus-ask: %s → valid: %s', (_name, source, valid) => {
    expect(parseInteractiveBlock('ask', source) !== null).toBe(valid)
  })

  it.each(CONFIRM_CASES)(
    'exodus-confirm: %s → valid: %s',
    (_name, source, valid) => {
      expect(parseInteractiveBlock('confirm', source) !== null).toBe(valid)
    }
  )

  it('keeps what the fence said, and reads a missing "other" as no Other', () => {
    const fence = parseInteractiveBlock('ask', ASK_SOURCE)
    expect(fence?.kind).toBe('ask')
    expect(fence?.source).toBe(ASK_SOURCE)
    if (fence?.kind !== 'ask') throw new Error('expected a questionnaire')
    expect(fence.block.questions.map((x) => x.other ?? false)).toEqual([
      true,
      false
    ])
  })
})

const FIND_CASES: Array<[string, string, 'ask' | 'confirm' | null]> = [
  [
    'a questionnaire after a paragraph',
    `Intro\n\n\`\`\`exodus-ask\n${ASK_SOURCE}\n\`\`\`\n\nAfter`,
    'ask'
  ],
  [
    'a fence still open (a reply streaming)',
    `Intro\n\n\`\`\`exodus-ask\n${ASK_SOURCE}`,
    null
  ],
  [
    'two blocks: only the first counts',
    `\`\`\`exodus-confirm\n${CONFIRM_SOURCE}\n\`\`\`\n\n\`\`\`exodus-ask\n${ASK_SOURCE}\n\`\`\``,
    'confirm'
  ],
  [
    'a first block that does not validate: none',
    `\`\`\`exodus-ask\n{oops}\n\`\`\`\n\n\`\`\`exodus-confirm\n${CONFIRM_SOURCE}\n\`\`\``,
    null
  ],
  [
    'inside a longer backtick fence',
    `\`\`\`\`md\n\`\`\`exodus-ask\n${ASK_SOURCE}\n\`\`\`\n\`\`\`\``,
    null
  ],
  [
    'inside a tilde fence',
    `~~~\n\`\`\`exodus-ask\n${ASK_SOURCE}\n\`\`\`\n~~~`,
    null
  ],
  [
    'indented under a list item',
    `- item\n\n  \`\`\`exodus-ask\n  ${ASK_SOURCE}\n  \`\`\``,
    null
  ],
  [
    'after an ordinary code block',
    `\`\`\`js\nlet a = 1\n\`\`\`\n\n\`\`\`exodus-confirm\n${CONFIRM_SOURCE}\n\`\`\``,
    'confirm'
  ],
  [
    'trailing spaces after the name',
    `\`\`\`exodus-confirm  \n${CONFIRM_SOURCE}\n\`\`\``,
    'confirm'
  ],
  [
    'after a line of inline code that looks like a fence',
    `Install it with\n\`\`\`npm i\`\`\`\n\n\`\`\`exodus-confirm\n${CONFIRM_SOURCE}\n\`\`\``,
    'confirm'
  ],
  [
    'a closing line with a no-break space after it: not a closer',
    `\`\`\`exodus-confirm\n${CONFIRM_SOURCE}\n\`\`\` \u00A0`,
    null
  ],
  [
    'an ideographic space after the name: another name',
    `\`\`\`exodus-ask\u3000\n${ASK_SOURCE}\n\`\`\``,
    null
  ],
  [
    'a tab after the name and after the closing fence',
    `\`\`\`exodus-confirm\t\n${CONFIRM_SOURCE}\n\`\`\`\t`,
    'confirm'
  ],
  [
    'another name',
    `\`\`\`exodus-answer\n{"block":"ask","ref":"r"}\n\`\`\``,
    null
  ]
]

describe('findInteractiveBlock', () => {
  it.each(FIND_CASES)('%s → %s', (_name, markdown, kind) => {
    expect(findInteractiveBlock(markdown)?.kind ?? null).toBe(kind)
  })

  it("gives the block's fence text, to know its code block by", () => {
    const markdown = `Intro\n\n\`\`\`exodus-ask\n${ASK_SOURCE}\n\`\`\`\n`
    expect(findInteractiveBlock(markdown)?.source).toBe(ASK_SOURCE)
  })
})
