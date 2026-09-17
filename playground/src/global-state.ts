import type { PersonRow } from "./types";

const FIRST_NAMES = [
  "Alice",
  "Bob",
  "Carol",
  "Dave",
  "Eve",
  "Frank",
  "Grace",
  "Hank",
  "Iris",
  "Jack",
  "Kate",
  "Leo",
  "Mona",
  "Nick",
  "Olga",
  "Pete",
  "Quinn",
  "Rita",
  "Sam",
  "Tina",
  "Uma",
  "Vic",
  "Wendy",
  "Xena",
  "Yuri",
  "Zara",
];

export const DEPARTMENTS = [
  "Engineering",
  "Sales",
  "Marketing",
  "Support",
  "Finance",
  "Legal",
  "HR",
  "Design",
  "Operations",
  "Research",
];

const CITIES = [
  "Helsinki",
  "Berlin",
  "London",
  "Paris",
  "Tokyo",
  "New York",
  "Sydney",
  "Toronto",
  "Mumbai",
  "Seoul",
];

let id = 0;
export async function createPersonRows(count: number, signal: AbortSignal) {
  const rows: PersonRow[] = [];
  for (let i = 1; i <= count; i++) {
    if (i % 5000 === 0) {
      if (signal.aborted) throw new Error("Signal aborted");
      await new Promise((res) => setTimeout(res, 50));
    }
    const nameIndex = Math.floor(Math.random() * FIRST_NAMES.length);
    const departmentIndex = Math.floor(Math.random() * DEPARTMENTS.length);
    const cityIndex = Math.floor(Math.random() * CITIES.length);
    rows.push({
      id: `${id++}`,
      name: FIRST_NAMES[nameIndex],
      department: DEPARTMENTS[departmentIndex],
      city: CITIES[cityIndex],
    });
  }
  return rows;
}

export function getPersonRows(count: number, signal: AbortSignal) {
  return createPersonRows(count, signal);
}
