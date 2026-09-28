/**
 * Shared contexts for the DOS kit.
 *
 * Compound components talk to each other through these rather than through
 * props, so a control can sit anywhere inside its `<Field>` and still find it.
 */
import { createContext } from "yract";

export interface FieldContextValue {
  controlId: string;
  descriptionId: string;
  errorId: string;
  invalid: boolean;
}

export const FieldContext = createContext<FieldContextValue>(
  { controlId: "", descriptionId: "", errorId: "", invalid: false },
  "DosField",
);

export interface RadioGroupContextValue {
  name: string;
  value: string;
}

export const RadioGroupContext = createContext<RadioGroupContextValue>(
  { name: "", value: "" },
  "DosRadioGroup",
);
