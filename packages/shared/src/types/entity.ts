/**
 * What `GET /api/v1/entity/:title` answers: Wikipedia's summary of the
 * article, or `extract: null` when neither the asked language nor English
 * has it. `lang` is the language the summary came from.
 */
export interface EntitySummary {
  title: string
  extract: string | null
  description: string | null
  thumbnail: { source: string; width: number; height: number } | null
  /** The article's page, to read more; null when nothing was found. */
  url: string | null
  lang: string
}
