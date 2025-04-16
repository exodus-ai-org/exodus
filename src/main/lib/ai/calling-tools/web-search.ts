import { customsearch } from '@googleapis/customsearch'
import { Setting } from '@shared/types/db'
import { tool } from 'ai'
import { format } from 'date-fns'
import { z } from 'zod'

export const webSearch = (setting: Setting) =>
  tool({
    description: `Search the web for up-to-date information, remember to suffix the current date: \`${format(new Date(), 'yyyy-MM-dd')}\` to your query.`,
    parameters: z.object({
      query: z.string().min(1).max(100).describe('The search query'),
      limit: z
        .number()
        .min(1)
        .max(10)
        .describe(
          "Number of search results to return between 1 and 10, inclusive. If user doesn't specify, use `10` as default"
        ),
      language: z
        .string()
        .min(1)
        .describe(
          'Restricts the search to documents written in a particular language. Acceptable values are: `"lang_ar"`: Arabic; `"lang_bg"`: Bulgarian; `"lang_ca"`: Catalan; `"lang_cs"`: Czech; `"lang_da"`: Danish; `"lang_de"`: German; `"lang_el"`: Greek; `"lang_en"`: English; `"lang_es"`: Spanish; `"lang_et"`: Estonian; `"lang_fi"`: Finnish; `"lang_fr"`: French; `"lang_hr"`: Croatian; `"lang_hu"`: Hungarian; `"lang_id"`: Indonesian; `"lang_is"`: Icelandic; `"lang_it"`: Italian; `"lang_iw"`: Hebrew; `"lang_ja"`: Japanese; `"lang_ko"`: Korean; `"lang_lt"`: Lithuanian; `"lang_lv"`: Latvian; `"lang_nl"`: Dutch; `"lang_no"`: Norwegian; `"lang_pl"`: Polish; `"lang_pt"`: Portuguese; `"lang_ro"`: Romanian; `"lang_ru"`: Russian; `"lang_sk"`: Slovak; `"lang_sl"`: Slovenian; `"lang_sr"`: Serbian; `"lang_sv"`: Swedish; `"lang_tr"`: Turkish; `"lang_zh-CN"`: Chinese (Simplified); `"lang_zh-TW"`: Chinese (Traditional)'
        )
    }),
    execute: async ({ query, limit, language }) => {
      if (!setting.googleSearchApiKey) {
        throw new Error(
          'To use Web Search, make sure to fill in the `googleSearchApiKey` in the settings..'
        )
      }

      if (!setting.googleCseId) {
        throw new Error(
          'To use Web Search, make sure to fill in the `googleCseId` in the settings..'
        )
      }

      try {
        const result = await customsearch('v1').cse.list({
          auth: setting.googleSearchApiKey,
          cx: setting.googleCseId,
          q: query,
          num: limit ?? 10,
          lr: language ?? 'lang_en'
        })

        return JSON.stringify(result)
      } catch (e) {
        return e instanceof Error ? e.message : 'Failed to use web search.'
      }
    }
  })
