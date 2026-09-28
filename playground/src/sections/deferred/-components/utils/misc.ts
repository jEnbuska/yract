import type { PersonTableSettings, UpdatePerson } from "../PersonTable.shared";
import type { PersonRow } from "../../../../types";

/**
 * Memoised so the provider hands down the same object while nothing it carries
 * has changed. A fresh literal on every render would fire all 30 000 row
 * subscriptions — each one running its selector only to conclude nothing moved.
 */
export function toPersonTableContext(
  updatePerson: UpdatePerson,
  highlight: string,
): PersonTableSettings {
  return { updatePerson, highlight };
}

export function filterPersonTableRows(
  query: string,
  rows: PersonRow[] = [],
  city: string,
  department: string,
) {
  if (city) rows = rows.filter((row) => row.city === city);
  if (department) rows = rows?.filter((row) => row.department === department);
  query = query.trim();
  if (!query) return rows;
  const lower = query
    .toLowerCase()
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
  return rows?.filter(({ name, id, department, city }) => {
    const combined = `${name} ${id} ${department} ${city}`.toLowerCase();
    return lower.every((word) => combined.includes(word));
  });
}

export function filterRowsBySearch(rows: PersonRow[] = [], query: string) {
  query = query.trim();
  if (!query) return rows;
  const lower = query
    .toLowerCase()
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
  return rows?.filter(({ name, id, department, city }) => {
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
  for (const { city } of rows) {
    const count = map.getOrInsert(city, 0);
    map.set(city, count + 1);
  }
  return map;
}

export function countRowsPerDepartment(rows: PersonRow[] = []) {
  const map = new Map<string, number>();
  for (const { department } of rows) {
    const count = map.getOrInsert(department, 0);
    map.set(department, count + 1);
  }
  return map;
}
