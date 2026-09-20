import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/** The table mounts every row, so give it room. */
const READY = 120_000;

async function goToDemo(page: Page) {
  await page.goto("/");
  await page.waitForSelector('[data-testid="Defer-table"]', { timeout: READY });
  // Wait until the rows themselves are in, not just the table chrome.
  await expect
    .poll(() => page.locator('[data-testid="Defer-table"] [role="row"]').count(), {
      timeout: READY,
    })
    .toBeGreaterThan(1000);
}

/** Render counts keyed by row index, plus which rows are highlighted. */
function readRows(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="Defer-table"] [role="row"]')]
      .slice(2) // header row + the "Table body" summary row
      .map((row) => {
        const cells = row.querySelectorAll('[role="cell"]');
        return {
          city: cells[2]?.textContent ?? "",
          highlighted: row.getAttribute("data-highlighted") === "true",
          renders: Number(cells[cells.length - 1]?.textContent),
        };
      }),
  );
}

test.describe("Deferred table", () => {
  test.slow();

  test("mounts every row exactly once", async ({ page }) => {
    await goToDemo(page);
    const rows = await readRows(page);
    expect(rows.length).toBeGreaterThan(1000);
    expect(rows.every((r) => r.renders === 1)).toBe(true);
    expect(rows.some((r) => r.highlighted)).toBe(false);
  });

  test("lowering the person count removes rows from the table", async ({ page }) => {
    const rows = page.locator('[data-testid="Defer-table"] [role="row"]');
    await goToDemo(page);
    const before = await rows.count();

    // fill() sets the value and fires `input`; the demo commits on `click`,
    // which a real drag produces on mouse-up. dispatchEvent avoids a synthetic
    // click landing on the track and moving the thumb somewhere else.
    const slider = page.getByTestId("count-range");
    await slider.fill("1200");
    await slider.dispatchEvent("click");

    await expect.poll(() => rows.count(), { timeout: READY }).toBeLessThan(before);
    // 1200 rows plus the header and the "Table body" summary row.
    expect(await rows.count()).toBeLessThan(1300);
  });

  test("highlighting a city rerenders only that city's rows", async ({ page }) => {
    await goToDemo(page);
    const before = await readRows(page);

    await page.getByTestId("highlight-select").selectOption("Berlin");
    await expect(page.getByTestId("highlight-matches")).not.toBeEmpty();
    const after = await readRows(page);

    const highlighted = after.filter((r) => r.highlighted);
    const rerendered = after.filter((r, i) => r.renders !== before[i]!.renders);

    // Every highlighted row is a Berlin row, and nothing else moved.
    expect(highlighted.length).toBeGreaterThan(0);
    expect(highlighted.every((r) => r.city === "Berlin")).toBe(true);
    expect(rerendered.length).toBe(highlighted.length);
    // The context is shared by every row, so this is the selector doing the work.
    expect(after.length - rerendered.length).toBeGreaterThan(rerendered.length);
  });

  test("switching city rerenders only the rows that gained or lost it", async ({ page }) => {
    await goToDemo(page);
    await page.getByTestId("highlight-select").selectOption("Berlin");
    await expect(page.getByTestId("highlight-matches")).not.toBeEmpty();
    const before = await readRows(page);

    await page.getByTestId("highlight-select").selectOption("Tokyo");
    await expect(page.getByTestId("highlight-matches")).not.toBeEmpty();
    const after = await readRows(page);

    const lost = after.filter((r, i) => before[i]!.highlighted && !r.highlighted).length;
    const gained = after.filter((r, i) => !before[i]!.highlighted && r.highlighted).length;
    const rerendered = after.filter((r, i) => r.renders !== before[i]!.renders).length;

    expect(lost).toBeGreaterThan(0);
    expect(gained).toBeGreaterThan(0);
    expect(rerendered).toBe(lost + gained);
  });
});
