/**
 * App — the playground shell, built from the DOS kit.
 *
 * Only the person-table demo is left. `Screen` supplies the palette and
 * the skip link; `ShellMain` is the single content pane it targets.
 */
import { Screen, ShellMain } from "./dos";
import "./dos/styles.css";
import { PersonTableDemo } from "./sections/person-table";

export function* App() {
  return (
    <Screen skipLabel={"Skip to main"}>
      <ShellMain>
        <PersonTableDemo />
      </ShellMain>
    </Screen>
  );
}
