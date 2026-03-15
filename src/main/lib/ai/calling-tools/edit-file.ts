import { tool } from 'ai'
import { readFile, writeFile } from 'fs/promises'
import { z } from 'zod'

export const editFile = tool({
  description:
    'Edit a file by replacing a specific string with a new string. ' +
    'Prefer this over writeFile for targeted edits — it only changes what you specify. ' +
    'The old_string must match exactly (including whitespace and indentation). ' +
    'To insert text, provide old_string as the surrounding context and include it in new_string. ' +
    'To delete text, set new_string to empty string.',
  inputSchema: z.object({
    path: z.string().describe('Absolute path to the file to edit.'),
    old_string: z
      .string()
      .describe(
        'The exact string to find and replace. Must be unique in the file.'
      ),
    new_string: z
      .string()
      .describe(
        'The string to replace old_string with. Can be empty to delete.'
      ),
    replace_all: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'If true, replace all occurrences. Default: false (replace first only).'
      )
  }),
  execute: async ({ path, old_string, new_string, replace_all }) => {
    let content: string
    try {
      content = await readFile(path, 'utf-8')
    } catch (e) {
      throw new Error(
        `Failed to read file: ${e instanceof Error ? e.message : String(e)}`
      )
    }

    if (!content.includes(old_string)) {
      throw new Error(
        `old_string not found in file. Make sure it matches exactly including whitespace.`
      )
    }

    const occurrences = content.split(old_string).length - 1
    if (!replace_all && occurrences > 1) {
      throw new Error(
        `old_string appears ${occurrences} times in the file. Provide more surrounding context to make it unique, or set replace_all=true.`
      )
    }

    const newContent = replace_all
      ? content.split(old_string).join(new_string)
      : content.replace(old_string, new_string)

    try {
      await writeFile(path, newContent, 'utf-8')
    } catch (e) {
      throw new Error(
        `Failed to write file: ${e instanceof Error ? e.message : String(e)}`
      )
    }

    const linesBefore = content.split('\n').length
    const linesAfter = newContent.split('\n').length

    return {
      path,
      replacements: occurrences,
      linesBefore,
      linesAfter
    }
  }
})
