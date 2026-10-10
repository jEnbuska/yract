import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { READY, dataRowCount, goToDemoWithRows, readRows, settled } from "./helpers";

/** Pick a city and wait until the table highlights exactly that city's rows. */
async function highlight(page: Page, city: string) {
  await page.getByTestId("highlight-select").selectOption(city);
  await expect
    .poll(
      async () => {
        const highlighted = (await readRows(page)).filter((r) => r.highlighted);
        return highlighted.length > 0 && highlighted.every((r) => r.city === city);
      },
      { timeout: READY },
    )
    .toBe(true);
  await settled(page);
}

test.describe("Deferred table", () => {
  test("mounts every row exactly once", async ({ page }) => {
    const errors = await goToDemoWithRows(page);
    const rows = await readRows(page);
    expect(rows.length).toBe(6000);
    expect(rows.every((r) => r.renders === 1)).toBe(true);
    expect(rows.some((r) => r.highlighted)).toBe(false);
    expect(errors).toEqual([]);
  });

  test("lowering the person count removes rows from the table", async ({ page }) => {
    await goToDemoWithRows(page);
    const before = await dataRowCount(page);

    // fill() sets the value and fires `input`; the demo commits on `click`,
    // which a real drag produces on mouse-up. dispatchEvent avoids a synthetic
    // click landing on the track and moving the thumb somewhere else.
    const slider = page.getByTestId("count-range");
    await slider.fill("300");
    await slider.dispatchEvent("click");

    await expect.poll(() => dataRowCount(page), { timeout: READY }).toBeLessThan(before);
    await settled(page);
    expect(await dataRowCount(page)).toBe(300);
  });

  test("highlighting a city rerenders only that city's rows", async ({ page }) => {
    await goToDemoWithRows(page);
    const before = await readRows(page);

    await highlight(page, "Berlin");
    const after = await readRows(page);

    const highlighted = after.filter((r) => r.highlighted);
    const rerendered = after.filter((r, i) => r.renders !== before[i]!.renders);

    // Every highlighted row is a Berlin row, and nothing else moved.
    expect(highlighted.every((r) => r.city === "Berlin")).toBe(true);
    expect(rerendered.length).toBe(highlighted.length);
    // The context is shared by every row, so this is the selector doing the work.
    expect(after.length - rerendered.length).toBeGreaterThan(rerendered.length);
  });

  test("switching city rerenders only the rows that gained or lost it", async ({ page }) => {
    await goToDemoWithRows(page);
    await highlight(page, "Berlin");
    const before = await readRows(page);

    await highlight(page, "Tokyo");
    const after = await readRows(page);

    const lost = after.filter((r, i) => before[i]!.highlighted && !r.highlighted).length;
    const gained = after.filter((r, i) => !before[i]!.highlighted && r.highlighted).length;
    const rerendered = after.filter((r, i) => r.renders !== before[i]!.renders).length;

    expect(lost).toBeGreaterThan(0);
    expect(gained).toBeGreaterThan(0);
    expect(rerendered).toBe(lost + gained);
  });
});
