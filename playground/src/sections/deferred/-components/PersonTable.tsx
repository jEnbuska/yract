import type { PersonRow } from "../../../types";
import { useDefer, useMemo, useRef, useStable, useState } from "yract";
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
import { DEPARTMENTS } from "../../../global-state";
import type { SortDir } from "../../../dos/Table";

const formatter = new Intl.DateTimeFormat("fi", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type UpdatePerson = (person: PersonRow) => void;

function sortRows(rows: PersonRow[] | undefined, sortDir: SortDir) {
  return rows?.toSorted((a, b) => {
    let cmp: number;
    if (a.name === b.name) {
      cmp = Number(a.id) - Number(b.id);
    } else {
      cmp = a.name.localeCompare(b.name);
    }
    return sortDir === "ascending" ? cmp : -cmp;
  });
}

type PersonTableProps = {
  rows: PersonRow[] | undefined;
  updatePerson: UpdatePerson;
};
export function* PersonTable({ rows, updatePerson }: PersonTableProps) {
  const [sortDir, setSortDir] = yield* useState<SortDir>("ascending");
  const sortLabel = sortDir === "ascending" ? " ▲" : sortDir === "descending" ? " ▼" : "";
  const sortedRows = yield* useMemo(sortRows, [rows, sortDir]);
  const [Defer, deferring] = yield* useDefer();
  const updateSortDir = yield* useStable(() => {
    void setSortDir((dir) => (dir === "descending" ? "ascending" : "descending"));
  });
  return (
    <Table
      caption="People by name, department and city"
      columns="1fr 1fr 1fr 1fr 1fr 1fr"
      rowHeight="18.5px"
      data-testid="Defer-table"
      style={{ maxHeight: "500px", overflowY: "auto", opacity: deferring ? 0.5 : 1 }}
    >
      <TableHead sticky>
        <TableRow>
          <TableHeadCell onClick={updateSortDir} sort={sortDir} data-testid="sort-name">
            Name{sortLabel}
          </TableHeadCell>
          <TableHeadCell id="persons-department">Department</TableHeadCell>
          <TableHeadCell>City</TableHeadCell>
          <TableHeadCell align="center">Mounted at</TableHeadCell>
          <TableHeadCell align="center">Updated at</TableHeadCell>
          <TableHeadCell align="center">Re-renders</TableHeadCell>
        </TableRow>
      </TableHead>
      <Defer>
        {!sortedRows ? (
          <LoaderTrain label={"Deferred rendering…"} />
        ) : (
          <PersonTableBody rows={sortedRows} updatePerson={updatePerson} />
        )}
      </Defer>
    </Table>
  );
}

type PersonTableBodyProps = {
  rows: PersonRow[] | undefined;
  updatePerson: UpdatePerson;
};
function* PersonTableBody({ rows, updatePerson }: PersonTableBodyProps) {
  const mounted = yield* useRef(new Date());
  const renders = yield* useRef(0);
  renders.current++;
  const updatedAt = new Date();

  return (
    <TableBody>
      <TableRow style={{ fontWeight: "bold" }}>
        <TableCell>{"Table body"}</TableCell>
        <TableCell>{"-"}</TableCell>
        <TableCell>{"-"}</TableCell>
        <TableCell align="center">
          {formatter.format(mounted.current)},<i>{mounted.current.getMilliseconds()}</i>
        </TableCell>
        <TableCell align="center">
          {formatter.format(updatedAt)},<i>{updatedAt.getMilliseconds()}</i>
        </TableCell>
        <TableCell align="center">{renders.current}</TableCell>
      </TableRow>
      {rows!.map((row) => (
        <PersonTableRow key={row.id} row={row} deps={[row]} updatePerson={updatePerson} />
      ))}
    </TableBody>
  );
}

function* PersonTableRow(props: { row: PersonRow; updatePerson: UpdatePerson }) {
  const { row, updatePerson } = props;
  const mounted = yield* useRef(new Date());
  const renders = yield* useRef(0);
  renders.current++;
  const updatedAt = new Date();
  return (
    <TableRow>
      <TableCell id={`${row.id}-name`}>
        {row.name} - {row.id}
      </TableCell>
      <TableCell>
        <Select
          value={row.department}
          aria-labelledby={`${row.id}-name person-department`}
          onValueChange={(department) => {
            updatePerson({ ...row, department });
          }}
        >
          {DEPARTMENTS.map((d) => (
            <option value={d}>{d}</option>
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
}
