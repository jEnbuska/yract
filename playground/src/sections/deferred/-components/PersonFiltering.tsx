import { Field, FieldDescription, FieldLabel, TextInput } from "../../../dos";

type OwnProps = {
  value: string;
  setValue(value: string): unknown;
  matches: string;
};

export function* PersonFiltering({ value, setValue, matches }: OwnProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        marginBottom: "0.75rem",
        alignItems: "center",
      }}
    >
      <Field>
        <FieldLabel>Search persons</FieldLabel>
        <TextInput
          value={value}
          onInput={(e) => setValue(e.currentTarget.value)}
          placeholder={"Name, city, department, id..."}
        />
        <FieldDescription>{matches ? `${matches} matches` : ""}</FieldDescription>
      </Field>
    </div>
  );
}
