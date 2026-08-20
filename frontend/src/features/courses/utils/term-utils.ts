export function formatAcademicTerm(term: string): string {
  const match = /^(SP|FA)(\d{4})$/i.exec(term.trim());
  if (!match) return term;

  return `${match[1].toUpperCase() === "SP" ? "Spring" : "Fall"} ${match[2]}`;
}
