import { useMemo } from "react";
import { DEPARTMENTS } from "../../../global-state";
import { Radio, RadioGroup } from "../../../dos";
import type { PersonRow } from "../../../types";
import { countRowsPerDepartment } from "./utils/misc";

type OwnProps = {
  department: string;
  setDepartment(department: string): unknown;
  rows: PersonRow[] | undefined;
};

export function PersonDepartmentRadioGroup({ department, setDepartment, rows }: OwnProps) {
  const rowsPerDepartment = useMemo(() => countRowsPerDepartment(rows), [rows]);
  return (
    <RadioGroup legend={"Department"} value={department} onValueChange={setDepartment}>
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
