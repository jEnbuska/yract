/**
 * App — the React playground shell, built from the same DOS kit.
 *
 * `Screen` supplies the palette and the skip link; `ShellMain` is the single
 * content pane it targets.
 */
import { Screen, ShellMain } from "./dos";
import "./dos/styles.css";
import { DeferredDemo } from "./sections/deferred";

export function App() {
  return (
    <Screen skipLabel={"Skip to main"}>
      <ShellMain>
        <DeferredDemo />
      </ShellMain>
    </Screen>
  );
}
