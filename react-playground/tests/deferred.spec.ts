import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/** The table mounts every row, so give it room. */
const READY = 120_000;

async function goToDemo(page: Page) {
  await page.goto("/");
  await page.waitForSelector('[data-testid="Defer-table"]', { timeout: READY });
  await expect
    .poll(() => page.locator('[data-testid="Defer-table"] [role="row"]').count(), {
      timeout: READY,
    })
    .toBeGreaterThan(1000);
}

function readRows(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="Defer-table"] [role="row"]')]
      .slice(2) // header row + the "Table body" summary row
      .map((row) => {
        const cells = row.querySelectorAll('[role="cell"]');
        return {
          city: cells[2]?.textContent ?? "",
          highlighted: row.getAttribute("data-highlighted") === "true",
        };
      }),
  );
}

test.describe("Deferred table (React)", () => {
  test.slow();

  test("suspends, then mounts every row", async ({ page }) => {
    await goToDemo(page);
    const rows = await readRows(page);
    expect(rows.length).toBeGreaterThan(1000);
    expect(rows.some((r) => r.highlighted)).toBe(false);
  });

  test("highlighting a city marks exactly that city's rows", async ({ page }) => {
    await goToDemo(page);
    await page.getByTestId("highlight-select").selectOption("Berlin");
    await expect(page.getByTestId("highlight-matches")).not.toBeEmpty();

    const rows = await readRows(page);
    const highlighted = rows.filter((r) => r.highlighted);
    expect(highlighted.length).toBeGreaterThan(0);
    expect(highlighted.every((r) => r.city === "Berlin")).toBe(true);
    expect(highlighted.length).toBeLessThan(rows.length);
  });

  test("switching city moves the highlight", async ({ page }) => {
    await goToDemo(page);
    await page.getByTestId("highlight-select").selectOption("Berlin");
    await expect(page.getByTestId("highlight-matches")).not.toBeEmpty();
    await page.getByTestId("highlight-select").selectOption("Tokyo");
    await expect(page.getByTestId("highlight-matches")).not.toBeEmpty();

    const rows = await readRows(page);
    const highlighted = rows.filter((r) => r.highlighted);
    expect(highlighted.length).toBeGreaterThan(0);
    expect(highlighted.every((r) => r.city === "Tokyo")).toBe(true);
  });
});
