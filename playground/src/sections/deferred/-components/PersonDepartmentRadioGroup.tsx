import { DEPARTMENTS } from "./utils/row-store";
import { Radio, RadioGroup } from "../../../dos";
import type { PersonRow } from "../../../types";
import { countRowsPerDepartment } from "./utils/misc";
import { useMemo } from "yract";

type OwnProps = {
  department: string;
  setDepartment(department: string): unknown;
  rows: PersonRow[] | undefined;
};

export function* PersonDepartmentRadioGroup({ department, setDepartment, rows }: OwnProps) {
  const rowsPerDepartment = yield* useMemo(countRowsPerDepartment, [rows]);
  return (
    <RadioGroup legend={"Show persons from"} value={department} onValueChange={setDepartment}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
        <Radio label={"All"} value={""} />
        {DEPARTMENTS.map((dep) => {
          const count = rowsPerDepartment.get(dep);
          let label = dep;
          if (count) label += ` (${count})`;
          return <Radio value={dep} label={label} key={dep} />;
        })}
      </div>
    </RadioGroup>
  );
}
