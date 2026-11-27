import { expect, test } from "@playwright/test";

import type * as fixture from "#sprite-editor/tests/fixture";

test("undo and redo follow keyboard shortcuts and stop after editor removal", async ({ page }) => {
  await page.goto("/sprite-editor.html");

  const result = await page.evaluate(async (url) => {
    const { getEditorScene } = await import(url) as typeof fixture;
    const { editor } = getEditorScene();

    let value = 1;

    editor.history.pushState({
      undo: () => { value = 0; },
      redo: () => { value = 1; }
    });

    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", ctrlKey: true }));
    const undone = value;

    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", ctrlKey: true, shiftKey: true }));
    const redone = value;

    editor.remove();
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", ctrlKey: true }));

    return { undone, redone, afterRemoval: value };
  }, "/src/sprite-editor/tests/fixture.ts");

  expect(result).toEqual({ undone: 0, redone: 1, afterRemoval: 1 });
});
