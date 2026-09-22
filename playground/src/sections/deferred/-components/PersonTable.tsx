import type { PersonRow } from "../../../types";
import {
  type Component,
  type PropsWithChildren,
  useContext,
  useMemo,
  useRef,
  useStable,
  useState,
} from "yract";
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
  Defer: Component<PropsWithChildren>;
  deferring: boolean;
};
export function* PersonTable({ rows, deferring, Defer }: PersonTableProps) {
  const [sortProperty, setSortProperty] = yield* useState<"name" | "city">("name");
  const [sortDir, setSortDir] = yield* useState<SortDir>("ascending");
  const sortLabel = sortDir === "ascending" ? " ▲" : sortDir === "descending" ? " ▼" : "-";
  const sortedRows = yield* useMemo(sortRows, [rows, sortDir]);

  const updateSortByName = yield* useStable(() => {
    void setSortProperty("name");
    if (sortProperty === "city") void setSortDir("ascending");
    else void setSortDir(sortDir === "ascending" ? "descending" : "ascending");
  });
  const updateSortByCity = yield* useStable(() => {
    void setSortProperty("city");
    if (sortProperty === "name") void setSortDir("ascending");
    else void setSortDir(sortDir === "ascending" ? "descending" : "ascending");
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
      <Defer>
        {!sortedRows ? (
          <LoaderTrain label={"Deferred rendering…"} />
        ) : (
          <PersonTableBody rows={sortedRows} />
        )}
      </Defer>
    </Table>
  );
}

type PersonTableBodyProps = {
  rows: PersonRow[];
};
function* PersonTableBody({ rows }: PersonTableBodyProps) {
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
        <PersonTableRow key={row.id} row={row} deps={[row]} />
      ))}
    </TableBody>
  );
}

function* PersonTableRow(props: { row: PersonRow }) {
  const { row } = props;
  // `deps={[row]}` means props alone will not rerender this row. The selector
  // below collapses the settings object to "is my city highlighted", so this
  // row only rerenders when that answer changes — not when some other city is
  // picked.
  const { updatePerson, highlight } = yield* useContext(PersonTableContext, (settings) => [
    settings.highlight === row.city,
    settings.updatePerson,
  ]);
  const highlighted = highlight === row.city;
  const mounted = yield* useRef(new Date());
  const renders = yield* useRef(0);
  renders.current++;
  const updatedAt = new Date();
  return (
    <TableRow
      data-highlighted={highlighted ? "true" : undefined}
      style={highlighted ? { filter: "invert(1)" } : undefined}
    >
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
