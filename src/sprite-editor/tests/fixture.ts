import { SpriteEditor } from "#/sprite-editor";
import { AnimationDefinition } from "#/animation-definition";

import { AnimationParametersForm } from "#sprite-editor/animation-parameters-form";

export function getEditorScene() {
  const editor = document.querySelector("sprite-editor");

  if (!(editor instanceof SpriteEditor)) {
    throw new Error("Editor fixture: editor was not created");
  }

  return {
    editor,
    form: editor.settings,
    parameters: new AnimationParametersForm(editor.settings),
    defaults: new AnimationDefinition({ sprites: [] }).params,
    input(name: string) {
      const field = editor.settings.elements.namedItem(name);

      if (!(field instanceof HTMLInputElement)) {
        throw new Error(`Missing animation field: ${name}`);
      }

      return field;
    }
  };
}

export type EditorScene = ReturnType<typeof getEditorScene>;
