// Thrown when anyone but the Admin tries something only the Admin may do,
// such as merging Catalog entries or hiding a Member.
export class NotAdminError extends Error {
  constructor() {
    super('Only the Admin can do this')
  }
}
