import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** The table mounts every row, so give it room. */
export const READY = 120_000;

/** Index of the "Re-renders" column: Name, Department, City, Mounted at, Updated at, Re-renders. */
const RENDERS_COLUMN = 5;

/** Header row + the "Table body" summary row. */
const NON_DATA_ROWS = 2;

export type DemoRow = {
  name: string;
  department: string;
  city: string;
  highlighted: boolean;
  renders: number;
};

/**
 * Open the deferred demo and wait until it is usable: the controls and the
 * table element are there. The rows may still be rendering. Collects page errors.
 */
export async function goToDemo(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await page.getByPlaceholder("Name, city, department, id...").waitFor({ timeout: READY });
  await page.getByTestId("Defer-table").waitFor({ timeout: READY });
  return errors;
}

/** `goToDemo`, then wait until every row is rendered. For tests that read rows straight away. */
export async function goToDemoWithRows(page: Page) {
  const errors = await goToDemo(page);
  await settled(page);
  return errors;
}

export function dataRowCount(page: Page) {
  return page
    .locator('[data-testid="Defer-table"] [role="row"]')
    .count()
    .then((n) => Math.max(0, n - NON_DATA_ROWS));
}

export function readRows(page: Page): Promise<DemoRow[]> {
  // Runs in the browser, so constants come in as arguments.
  return page.evaluate(
    ({ skip, rendersColumn }) => {
      return [...document.querySelectorAll('[data-testid="Defer-table"] [role="row"]')]
        .slice(skip)
        .map((row) => {
          const cells = row.querySelectorAll('[role="cell"]');
          return {
            name: cells[0]?.textContent ?? "",
            department: cells[1]?.querySelector("select")?.value ?? "",
            city: cells[2]?.textContent ?? "",
            highlighted: row.getAttribute("data-highlighted") === "true",
            renders: Number(cells[rendersColumn]?.textContent),
          };
        });
    },
    { skip: NON_DATA_ROWS, rendersColumn: RENDERS_COLUMN },
  );
}

/** "123/6000 matches" → { shown: 123, total: 6000 }; `undefined` while deferring ("?"). */
export async function readMatches(page: Page) {
  const text = await page.getByText(/\d+\/\d+ matches|\?\/\d+ matches/).textContent();
  const match = /^(\d+)\/(\d+)/.exec(text ?? "");
  if (!match) return undefined;
  return { shown: Number(match[1]), total: Number(match[2]) };
}

/**
 * Wait until the deferred table has caught up: the matches label is numeric,
 * the table is no longer deferring, and it shows exactly that many rows.
 */
export async function settled(page: Page) {
  await expect
    .poll(
      async () => {
        const matches = await readMatches(page);
        if (!matches) return false;
        // The table carries data-deferring="true" while a deferred render is pending;
        // false removes the attribute.
        const deferring = await page.getByTestId("Defer-table").getAttribute("data-deferring");
        if (deferring === "true") return false;
        return (await dataRowCount(page)) === matches.shown;
      },
      { timeout: READY },
    )
    .toBe(true);
}
