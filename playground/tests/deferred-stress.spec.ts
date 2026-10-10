import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  READY,
  type DemoRow,
  dataRowCount,
  goToDemo,
  readMatches,
  readRows,
  settled,
} from "./helpers";

/**
 * Tries to break the deferred demo: input faster than it can render, changes
 * that race a load in flight, and filters stacked in awkward orders. After each
 * attack the page must settle into a state that agrees with its own controls.
 */

const CITIES = ["Helsinki", "Berlin", "London", "Paris", "Tokyo"];
const DEPARTMENTS = ["", "Engineering", "Sales", "Marketing", "Support"];

type Filters = { search: string; city: string; cityOnly: boolean; department: string };

async function readFilters(page: Page): Promise<Filters> {
  return {
    search: await page.getByPlaceholder("Name, city, department, id...").inputValue(),
    city: await page.getByTestId("highlight-select").inputValue(),
    cityOnly: await page.getByTestId("city-only-checkbox").isChecked(),
    department: await page
      .locator('input[type="radio"]:checked')
      .evaluate((radio) => (radio as HTMLInputElement).value),
  };
}

function matchesFilters(row: DemoRow, { search, city, cityOnly, department }: Filters) {
  if (cityOnly && city && row.city !== city) return false;
  if (department && row.department !== department) return false;
  const words = search.trim().toLowerCase().split(" ").filter(Boolean);
  const haystack = `${row.name} ${row.department} ${row.city}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** "Sales (299)" per radio, keyed by value; "All" has no count. */
async function departmentCounts(page: Page) {
  return page.locator('input[type="radio"]').evaluateAll((radios) =>
    Object.fromEntries(
      radios.map((radio) => {
        const text = radio.closest("label")?.textContent ?? "";
        return [(radio as HTMLInputElement).value, Number(/\((\d+)\)/.exec(text)?.[1] ?? 0)];
      }),
    ),
  );
}

/** The page agrees with itself: rows, matches label and control counts line up. */
async function expectConsistent(page: Page) {
  await settled(page);
  const filters = await readFilters(page);
  const rows = await readRows(page);
  const matches = await readMatches(page);

  expect(rows.filter((row) => !matchesFilters(row, filters))).toEqual([]);
  expect(matches?.shown).toBe(rows.length);

  // The radios count the rows that pass search + city, so they bound the table.
  const counts = await departmentCounts(page);
  const expected = filters.department
    ? (counts[filters.department] ?? 0)
    : Object.values(counts).reduce((sum, n) => sum + n, 0);
  expect(rows.length).toBe(expected);
}

async function pickDepartment(page: Page, department: string) {
  await page.locator(`input[type="radio"][value="${department}"]`).click();
}

test.describe("Deferred table under stress", () => {
  // BUG (intermittent, Chromium): keystrokes typed while a filter render is still
  // pending are lost ("alice berlin" → "a berlin"). The input restore writes the
  // last *committed* value back, so the next keystroke lands on stale text.
  // `fixme` rather than `fail` because it does not reproduce on every run.
  test("typing faster than the table renders ends on the final query", async ({ page }) => {
    const errors = await goToDemo(page);
    const search = page.getByPlaceholder("Name, city, department, id...");
    await search.pressSequentially("alice berl", { delay: 5 });
    await search.press("Backspace");
    await search.press("Backspace");
    await search.pressSequentially("rlin", { delay: 5 });
    await expect(search).toHaveValue("alice berlin");
    await expectConsistent(page);
    expect(await dataRowCount(page)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  // BUG (intermittent): same lost-keystroke race as above.
  test("typing while the rows are still loading", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const search = page.getByPlaceholder("Name, city, department, id...");
    await search.pressSequentially("sales", { delay: 5 });
    await expect(search).toHaveValue("sales");
    await expectConsistent(page);
    expect(await dataRowCount(page)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test("changing the count again before the previous load finishes", async ({ page }) => {
    const errors = await goToDemo(page);
    const slider = page.getByTestId("count-range");
    for (const count of ["20000", "300", "9000", "800"]) {
      await slider.fill(count);
      await slider.dispatchEvent("click");
    }
    // Loads are async and only the last one counts: first wait until the 800
    // rows are stored (the label's total), then until they are rendered.
    await expect.poll(async () => (await readMatches(page))?.total, { timeout: READY }).toBe(800);
    await expectConsistent(page);
    expect(await dataRowCount(page)).toBe(800);
    expect(errors).toEqual([]);
  });

  test("stacking and unstacking every filter in awkward orders", async ({ page }) => {
    const errors = await goToDemo(page);
    const search = page.getByPlaceholder("Name, city, department, id...");
    const select = page.getByTestId("highlight-select");
    const cityOnly = page.getByTestId("city-only-checkbox");

    await select.selectOption("Berlin");
    await cityOnly.check();
    await pickDepartment(page, "Sales");
    await search.fill("a");
    await expectConsistent(page);

    // Drop the city under the checkbox: it must disable and stop filtering.
    await select.selectOption("");
    await expect(cityOnly).toBeDisabled();
    await expect(cityOnly).not.toBeChecked();
    await expectConsistent(page);

    // Bring a city back, then undo the department and the search.
    await select.selectOption("Tokyo");
    await pickDepartment(page, "");
    await search.fill("");
    await expectConsistent(page);
    expect(errors).toEqual([]);
  });

  test("a burst of random filter changes settles consistently", async ({ page }) => {
    const errors = await goToDemo(page);
    const search = page.getByPlaceholder("Name, city, department, id...");
    const select = page.getByTestId("highlight-select");
    const cityOnly = page.getByTestId("city-only-checkbox");

    // Deterministic, so a failure replays the same sequence.
    let seed = 7;
    const next = (n: number) => {
      seed = (seed * 16807) % 2147483647;
      return seed % n;
    };
    for (let step = 0; step < 25; step++) {
      switch (next(4)) {
        case 0:
          await select.selectOption(["", ...CITIES][next(CITIES.length + 1)]!);
          break;
        case 1:
          if (await cityOnly.isEnabled()) await cityOnly.click();
          break;
        case 2:
          await pickDepartment(page, DEPARTMENTS[next(DEPARTMENTS.length)]!);
          break;
        default:
          await search.fill(["", "a", "an", "o", "sam"][next(5)]!);
      }
    }
    await expectConsistent(page);
    expect(errors).toEqual([]);
  });

  test("moving a row out of the department filter removes it", async ({ page }) => {
    await goToDemo(page);
    await pickDepartment(page, "Sales");
    await expectConsistent(page);
    const before = await dataRowCount(page);
    const firstSelect = page
      .locator('[data-testid="Defer-table"] [role="row"]')
      .nth(2)
      .locator("select");
    await firstSelect.selectOption("Legal");
    await expect.poll(() => dataRowCount(page), { timeout: READY }).toBe(before - 1);
    await expectConsistent(page);
  });

  test("sorting while typing keeps the rows in order", async ({ page }) => {
    await goToDemo(page);
    const search = page.getByPlaceholder("Name, city, department, id...");
    await search.pressSequentially("a", { delay: 5 });
    await page.getByTestId("sort-name").click();
    await search.pressSequentially("n", { delay: 5 });
    await expectConsistent(page);
    const names = (await readRows(page)).map((row) => row.name.split(" - ")[0]!);
    const sorted = names.toSorted((a, b) => b.localeCompare(a));
    expect(names).toEqual(sorted);
  });

  test("the highlighted city survives a reload", async ({ page }) => {
    await goToDemo(page);
    await page.getByTestId("highlight-select").selectOption("Paris");
    await page.reload();
    await expect(page.getByTestId("highlight-select")).toHaveValue("Paris");
    await expect(page.getByTestId("city-only-checkbox")).toBeEnabled();
  });
});
