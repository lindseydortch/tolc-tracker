// "React.js", "react js" and "REACT-JS" all become "reactjs".
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[\s._-]/g, '')
}
