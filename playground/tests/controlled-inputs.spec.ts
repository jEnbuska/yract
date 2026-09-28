import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

/**
 * Controlled inputs driven by real keyboard and mouse input, against
 * `fixtures/controlled.html`. The unit tests replay events by hand; these
 * check the sequences the browsers actually produce.
 */

async function open(page: Page) {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  await page.goto("/fixtures/controlled.html");
  await expect(page.getByTestId("radio-fixed-a")).toBeChecked();
  return errors;
}

/** Let the scheduler commit before asserting on DOM state. */
async function settle(page: Page) {
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
}

async function checkedValues(group: Locator) {
  return group.evaluateAll((radios) =>
    radios.filter((r) => (r as HTMLInputElement).checked).map((r) => (r as HTMLInputElement).value),
  );
}

test.describe("controlled text inputs", () => {
  test("typing into an accepting input updates state", async ({ page }) => {
    const errors = await open(page);
    const input = page.getByTestId("text-accept");
    await input.pressSequentially("hello world");
    await expect(input).toHaveValue("hello world");
    await expect(page.getByTestId("text-accept-state")).toHaveText("hello world");
    expect(errors).toEqual([]);
  });

  test("a rewriting handler wins over every keystroke", async ({ page }) => {
    await open(page);
    const input = page.getByTestId("text-digitless");
    await input.pressSequentially("a1b2c3");
    await settle(page);
    await expect(input).toHaveValue("abc");
  });

  test("the caret stays put when a keystroke in the middle is rejected", async ({ page }) => {
    // BUG: restoring the value moves the caret to the end; the saved selection is
    // only re-applied when the value prop changes, and here it does not.
    test.fail();
    await open(page);
    const input = page.getByTestId("text-digitless");
    await input.pressSequentially("abcd");
    await input.press("ArrowLeft");
    await input.press("ArrowLeft");
    await input.press("9");
    await settle(page);
    await expect(input).toHaveValue("abcd");
    await input.press("x");
    await settle(page);
    await expect(input).toHaveValue("abxcd");
  });

  test("an ignoring handler keeps its value through typing, paste and delete", async ({ page }) => {
    await open(page);
    const input = page.getByTestId("text-fixed");
    await input.pressSequentially("xyz");
    await input.press("Backspace");
    await input.press("ControlOrMeta+a");
    await input.press("Delete");
    await page.keyboard.insertText("pasted");
    await settle(page);
    await expect(input).toHaveValue("fixed");
  });

  test("a textarea with an ignoring handler keeps its value, newlines included", async ({
    page,
  }) => {
    await open(page);
    const textarea = page.getByTestId("textarea-fixed");
    await textarea.pressSequentially("more");
    await textarea.press("Enter");
    await settle(page);
    await expect(textarea).toHaveValue("fixed");
  });
});

test.describe("controlled select and range", () => {
  test("an accepting select follows the pick", async ({ page }) => {
    await open(page);
    await page.getByTestId("select-accept").selectOption("c");
    await expect(page.getByTestId("select-accept")).toHaveValue("c");
  });

  test("an ignoring select snaps back after a pick", async ({ page }) => {
    await open(page);
    const select = page.getByTestId("select-fixed");
    await expect(select).toHaveValue("b");
    await select.selectOption("c");
    await settle(page);
    await expect(select).toHaveValue("b");
  });

  test("an ignoring select snaps back after keyboard navigation", async ({ page }) => {
    await open(page);
    const select = page.getByTestId("select-fixed");
    await select.focus();
    await select.press("ArrowDown");
    await settle(page);
    await expect(select).toHaveValue("b");
  });

  test("an ignoring range snaps back after a keyboard step", async ({ page }) => {
    await open(page);
    const range = page.getByTestId("range-fixed");
    await range.focus();
    await range.press("ArrowRight");
    await range.press("End");
    await settle(page);
    await expect(range).toHaveValue("40");
  });
});

test.describe("controlled checkboxes", () => {
  test("an accepting checkbox toggles by click, label and Space", async ({ page }) => {
    await open(page);
    const box = page.getByTestId("checkbox-accept");
    await box.click();
    await expect(box).toBeChecked();
    await page.getByText("Accept", { exact: true }).click();
    await expect(box).not.toBeChecked();
    await box.press("Space");
    await expect(box).toBeChecked();
  });

  test("a declining checkbox stays unchecked however it is poked", async ({ page }) => {
    await open(page);
    const box = page.getByTestId("checkbox-fixed");
    await box.click({ force: true });
    await page.getByText("Fixed", { exact: true }).click();
    await box.press("Space");
    await box.dblclick({ force: true });
    await settle(page);
    await expect(box).not.toBeChecked();
  });
});

test.describe("controlled radio groups", () => {
  test("an accepting group moves its selection by click, label and arrows", async ({ page }) => {
    await open(page);
    const group = page.locator('input[name="radio-accept"]');
    await page.getByTestId("radio-accept-c").click();
    expect(await checkedValues(group)).toEqual(["c"]);
    await page.locator("label", { has: page.getByTestId("radio-accept-b") }).click();
    expect(await checkedValues(group)).toEqual(["b"]);
    await page.getByTestId("radio-accept-b").press("ArrowDown");
    await expect.poll(() => checkedValues(group)).toEqual(["c"]);
  });

  test("an ignoring group keeps its original option however it is poked", async ({ page }) => {
    await open(page);
    const group = page.locator('input[name="radio-fixed"]');
    await page.getByTestId("radio-fixed-b").click({ force: true });
    await page.locator("label", { has: page.getByTestId("radio-fixed-c") }).click();
    await page.getByTestId("radio-fixed-a").focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await settle(page);
    expect(await checkedValues(group)).toEqual(["a"]);
  });

  test("poking one group never changes the other", async ({ page }) => {
    await open(page);
    await page.getByTestId("radio-accept-c").click();
    await page.getByTestId("radio-fixed-b").click({ force: true });
    await settle(page);
    expect(await checkedValues(page.locator('input[name="radio-accept"]'))).toEqual(["c"]);
    expect(await checkedValues(page.locator('input[name="radio-fixed"]'))).toEqual(["a"]);
  });
});
