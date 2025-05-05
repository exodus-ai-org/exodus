import { generateObject, LanguageModelV1 } from 'ai'
import { z } from 'zod'
import { DocumentData } from './types'

export async function writeFinalReport({
  prompt,
  learnings,
  model,
  visitedUrls
}: {
  prompt: string
  learnings: string[]
  model: LanguageModelV1
  visitedUrls: Map<string, DocumentData>
}) {
  const learningsString = learnings
    .map((learning) => `<learning>\n${learning}\n</learning>`)
    .join('\n')

  const response = await generateObject({
    model,
    system: `
You are an expert researcher. Today is ${new Date().toISOString()}. Follow these instructions when responding:

- You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.
- The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.
- Be highly organized.
- Suggest solutions that I didn't think about.
- Be proactive and anticipate my needs.
- Treat me as an expert in all subject matter.
- Mistakes erode my trust, so be accurate and thorough.
- Provide detailed explanations, I'm comfortable with lots of detail.
- Value good arguments over authorities, the source is irrelevant.
- Consider new technologies and contrarian ideas, not just the conventional wisdom.
- You may use high levels of speculation or prediction, just flag it for me.
`,
    prompt:
      'Given the following prompt from the user, write a final report on the topic using the learnings from research. ' +
      `Make it as as detailed as possible, aim for 3 or more pages, include ALL the learnings from research:\n\n<prompt>${prompt}</prompt>\n\nHere are all the learnings from previous research:\n\n<learnings>\n${learningsString}\n</learnings>`,
    schema: z.object({
      reportMarkdown: z
        .string()
        .describe('Final report on the topic in Markdown')
    })
  })

  const urlsSection = `\n\n## Sources\n\n${[...visitedUrls.keys()].map((url) => `- ${url}`).join('\n')}`
  return response.object.reportMarkdown + urlsSection
}
