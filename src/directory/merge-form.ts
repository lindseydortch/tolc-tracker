import { formReader } from './profile'

// The Admin merges the Catalog entry named `from` into the one named `into`.
export type MergeForm = { from: string; into: string }

export function parseMergeForm(input: unknown): MergeForm {
  const read = formReader(input, 'merge form')
  return { from: read.text('from'), into: read.text('into') }
}
