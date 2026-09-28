import type { PersonRow } from "../../../../types";

export function filterRowsBySearch(rows: PersonRow[] = [], query: string) {
  query = query.trim();
  if (!query) return rows;
  const lower = query
    .toLowerCase()
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
  return rows.filter(({ name, id, department, city }) => {
    const combined = `${name} ${id} ${department} ${city}`.toLowerCase();
    return lower.every((word) => combined.includes(word));
  });
}

export function filterRowsByCity(rows: PersonRow[] = [], city: string, onlyMatches: boolean) {
  if (city && onlyMatches) return rows.filter((row) => row.city === city);
  return rows;
}

export function filterRowsByDepartment(rows: PersonRow[] = [], department: string) {
  if (department) return rows.filter((row) => row.department === department);
  return rows;
}

export function countRowsPerCity(rows: PersonRow[] = []) {
  const map = new Map<string, number>();
  for (const { city } of rows) map.set(city, (map.get(city) ?? 0) + 1);
  return map;
}

export function countRowsPerDepartment(rows: PersonRow[] = []) {
  const map = new Map<string, number>();
  for (const { department } of rows) map.set(department, (map.get(department) ?? 0) + 1);
  return map;
}
