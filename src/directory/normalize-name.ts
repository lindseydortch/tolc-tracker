// "React.js", "react js" and "REACT-JS" all become "reactjs".
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[\s._-]/g, '')
}

// How a new Catalog entry or a typed place spells a name: as typed, minus
// extra spaces.
export function tidyName(typed: string): string {
  return typed.trim().replace(/\s+/g, ' ')
}
