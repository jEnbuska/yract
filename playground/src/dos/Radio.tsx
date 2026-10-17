/**
 * RadioGroup — a set of mutually exclusive options under one legend.
 *
 * The group owns the selection; each `Radio` reads it from context, so the
 * caller only says which value is picked and what to do when it changes:
 *
 *   <RadioGroup legend="Drive" value={drive} onValueChange={setDrive}>
 *     <Radio value="a" label="A: Floppy" />
 *     <Radio value="c" label="C: Hard disk" />
 *   </RadioGroup>
 *
 * A `<fieldset>` rather than a `<div role="radiogroup">`: the legend names the
 * group for free, and `disabled` on it disables every option at once. Inside a
 * `Field` it also picks up the field's description or error.
 */
import type { ComponentProps } from "yract";
import { useContext, useId } from "yract";
import { FieldContext, RadioGroupContext } from "./contexts";

export interface RadioGroupProps extends ComponentProps<"fieldset"> {
  legend: string;
  value: string;
  onValueChange(value: string): unknown;
  /** Shared `name` of the inputs. Generated when omitted. */
  name?: string;
  /** Lay the options out side by side instead of stacked. */
  row?: boolean;
}

export function* RadioGroup({
  legend,
  value,
  onValueChange,
  name,
  row = false,
  children,
  ...rest
}: RadioGroupProps) {
  const generatedName = yield* useId();
  const { descriptionId, errorId, invalid } = yield* useContext(FieldContext);
  // Outside a Field the ids are empty, and an empty reference would point at nothing.
  const describedBy = invalid ? errorId : descriptionId;
  return (
    <RadioGroupContext value={{ name: name ?? generatedName, value }}>
      <fieldset
        {...rest}
        onChange={(e) => {
          onValueChange((e.target as HTMLInputElement).value);
        }}
        className="dos-fieldset"
        aria-invalid={invalid ? "true" : undefined}
        aria-describedby={describedBy || undefined}
      >
        <legend className="dos-legend">{legend}</legend>
        <div className={row ? "dos-group dos-group--row" : "dos-group"}>{children}</div>
      </fieldset>
    </RadioGroupContext>
  );
}

export interface RadioProps extends Omit<
  ComponentProps<"input">,
  "type" | "name" | "value" | "checked"
> {
  value: string;
  label: string;
}

/**
 * One option of a `RadioGroup`. Controlled: `checked` follows the group's
 * value, and a click only asks the group to change it.
 */
export function* Radio({ value, label, ...rest }: RadioProps) {
  const group = yield* useContext(RadioGroupContext);
  return (
    <label className="dos-check">
      <input
        {...rest}
        className="dos-check__input dos-check__input--radio"
        type="radio"
        name={group.name}
        value={value}
        checked={group.value === value}
      />
      <span className="dos-check__text">{label}</span>
    </label>
  );
}
