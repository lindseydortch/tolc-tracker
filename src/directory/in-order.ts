// The `chosen` values in the order `order` lists them, such as Seniorities
// junior to staffPlus.
export function inOrder<T>(order: readonly T[], chosen: readonly T[]): T[] {
  return order.filter((value) => chosen.includes(value))
}
