import { Pagination, Resources } from './db'

export interface RagResourceList {
  data: Resources[]
  pagination: Pagination
}
