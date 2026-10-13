import type { PersonRow } from "../../../types";
import { memo, use, useCallback, useMemo, useRef, useState } from "react";
import {
  LoaderTrain,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "../../../dos";
import { DEPARTMENTS } from "./utils/row-store";
import type { SortDir } from "../../../dos/Table";
import { PersonTableContext } from "./PersonTable.shared";

const formatter = new Intl.DateTimeFormat("fi", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function sortRows(rows: PersonRow[] | undefined, sortDir: SortDir, sortProperty: "name" | "city") {
  return rows?.toSorted((a, b) => {
    let cmp: number;
    const aValue = a[sortProperty];
    const bValue = b[sortProperty];
    if (aValue == bValue) {
      cmp = Number(a.id) - Number(b.id);
    } else {
      cmp = aValue.localeCompare(bValue);
    }
    return sortDir === "ascending" ? cmp : -cmp;
  });
}

type PersonTableProps = {
  rows: PersonRow[] | undefined;
  isDeferring: boolean;
};
export function PersonTable({ rows, isDeferring }: PersonTableProps) {
  const [sortProperty, setSortProperty] = useState<"name" | "city">("name");
  const [sortDir, setSortDir] = useState<SortDir>("ascending");
  const sortLabel = sortDir === "ascending" ? " ▲" : sortDir === "descending" ? " ▼" : "-";
  const sortedRows = useMemo(
    () => sortRows(rows, sortDir, sortProperty),
    [rows, sortDir, sortProperty],
  );

  const updateSortByName = useCallback(() => {
    setSortProperty("name");
    if (sortProperty === "city") setSortDir("ascending");
    else setSortDir(sortDir === "ascending" ? "descending" : "ascending");
  }, [sortProperty, sortDir]);
  const updateSortByCity = useCallback(() => {
    setSortProperty("city");
    if (sortProperty === "name") setSortDir("ascending");
    else setSortDir(sortDir === "ascending" ? "descending" : "ascending");
  }, [sortProperty, sortDir]);

  return (
    <Table
      caption="People by name, department and city"
      columns="1fr 1fr 1fr 1fr 1fr 1fr"
      rowHeight="18.5px"
      data-testid="Defer-table"
      data-deferring={isDeferring || undefined}
      style={{ maxHeight: "500px", overflowY: "auto", opacity: isDeferring ? 0.5 : 1 }}
    >
      <TableHead sticky>
        <TableRow>
          <TableHeadCell
            onClick={updateSortByName}
            sort={sortProperty === "name" ? sortDir : "none"}
            data-testid="sort-name"
          >
            Name {sortProperty === "name" ? sortLabel : "-"}
          </TableHeadCell>
          <TableHeadCell>Department</TableHeadCell>
          <TableHeadCell
            sort={sortProperty === "city" ? sortDir : "none"}
            onClick={updateSortByCity}
          >
            City {sortProperty === "city" ? sortLabel : "-"}
          </TableHeadCell>
          <TableHeadCell align="center">Mounted at</TableHeadCell>
          <TableHeadCell align="center">Updated at</TableHeadCell>
          <TableHeadCell align="center">Re-renders</TableHeadCell>
        </TableRow>
      </TableHead>
      {!sortedRows ? (
        <LoaderTrain label={"Deferred rendering…"} />
      ) : (
        <PersonTableBody rows={sortedRows} />
      )}
    </Table>
  );
}

type PersonTableBodyProps = {
  rows: PersonRow[];
};
const PersonTableBody = memo(function PersonTableBody({ rows }: PersonTableBodyProps) {
  const mounted = useRef(new Date());
  const renders = useRef(0);
  renders.current++;
  const updatedAt = new Date();
  return (
    <TableBody>
      <TableRow style={{ fontWeight: "bold" }}>
        <TableCell>{rows.length} rows</TableCell>
        <TableCell>{"-"}</TableCell>
        <TableCell align="center">
          {formatter.format(mounted.current)},<i>{mounted.current.getMilliseconds()}</i>
        </TableCell>
        <TableCell align="center">
          {formatter.format(updatedAt)},<i>{updatedAt.getMilliseconds()}</i>
        </TableCell>
        <TableCell align="center">-</TableCell>
        <TableCell align="center">{renders.current}</TableCell>
      </TableRow>
      {rows.map((row) => (
        <PersonTableRow key={row.id} row={row} />
      ))}
    </TableBody>
  );
});

/*
 * `memo` is the counterpart of yract's `deps={[row]}`: an unchanged row is
 * skipped when the body rerenders. It does NOT stop the context update below
 * from reaching every row — React has no context selector, so this is the one
 * behaviour the port cannot match. See README.md.
 */
const PersonTableRow = memo(function PersonTableRow({ row }: { row: PersonRow }) {
  const { updatePerson, highlight } = use(PersonTableContext);
  const highlighted = highlight === row.city;
  const mounted = useRef(new Date());
  const renders = useRef(0);
  renders.current++;
  const updatedAt = new Date();
  return (
    <TableRow
      data-highlighted={highlighted ? "true" : undefined}
      style={highlighted ? { textDecoration: "underline" } : undefined}
    >
      <TableCell id={`${row.id}-name`}>
        {row.name} - {row.id}
      </TableCell>
      <TableCell>
        <Select
          value={row.department}
          name="personDepartment"
          aria-labelledby={`${row.id}-name person-department`}
          onChange={(e) => {
            updatePerson({ ...row, department: e.currentTarget.value });
          }}
        >
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </TableCell>
      <TableCell>{row.city}</TableCell>
      <TableCell align="center">
        {formatter.format(mounted.current)},<i>{mounted.current.getMilliseconds()}</i>
      </TableCell>
      <TableCell align="center">
        {formatter.format(updatedAt)},<i>{updatedAt.getMilliseconds()}</i>
      </TableCell>
      <TableCell align="center">{renders.current}</TableCell>
    </TableRow>
  );
});
