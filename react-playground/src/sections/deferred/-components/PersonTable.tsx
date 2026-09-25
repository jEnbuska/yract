import type { PersonRow } from "../../../types";
import {
  Suspense,
  memo,
  use,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { PersonTableContext } from "./PersonTable.shared";

const formatter = new Intl.DateTimeFormat("fi", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function filterRows(query: string, rows?: PersonRow[]) {
  query = query.trim();
  if (!query) return rows;
  const lower = query
    .toLowerCase()
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
  return rows?.filter(({ name, id, department, city }) => {
    const combined = `${name} ${id} ${department} ${city}`.toLowerCase();
    return lower.every((word) => combined.includes(word));
  });
}

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
  rows: Promise<PersonRow[]>;
  search: string;
};

export function PersonTable({ rows, search }: PersonTableProps) {
  const [sortDir, setSortDir] = useState<SortDir>("ascending");
  const sortLabel = sortDir === "ascending" ? " ▲" : sortDir === "descending" ? " ▼" : "";
  /*
   * The stand-in for yract's `<Defer>`. Deferring the promise rather than the
   * rows means the body keeps rendering the settled one while a newer one is
   * still pending, so a search keystroke never drops the table back to the
   * fallback — and `deferring` is React's own word for "what you see is behind".
   */
  const deferredRows = useDeferredValue(rows);
  const deferredSearch = useDeferredValue(search);
  const deferring = deferredRows !== rows || deferredSearch !== search;
  const updateSortDir = useCallback(() => {
    setSortDir((dir) => (dir === "descending" ? "ascending" : "descending"));
  }, []);
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
      <Suspense fallback={<LoaderTrain label={`Deferred rendering…`} />}>
        <PersonTableBody rows={deferredRows} search={deferredSearch} sortDir={sortDir} />
      </Suspense>
    </Table>
  );
}

type PersonTableBodyProps = {
  rows: Promise<PersonRow[]>;
  search: string;
  sortDir: SortDir;
};

const PersonTableBody = memo(function PersonTableBody({
  rows,
  search,
  sortDir,
}: PersonTableBodyProps) {
  /*
   * Filtering happens here, below the boundary, on rows that are already
   * resolved. Deriving a filtered PROMISE up in the parent meant building one
   * during render, and a promise built during render cannot survive a suspended
   * retry: React throws the render away, the memo is recomputed, `use()` gets a
   * different promise and suspends again. The React Compiler makes that fatal
   * rather than merely wasteful.
   */
  const resolved = use(rows);
  const filtered = useMemo(() => filterRows(search, resolved) ?? resolved, [search, resolved]);
  const sorted = useMemo(() => sortRows(filtered, sortDir) ?? [], [filtered, sortDir]);
  const mounted = useRef(new Date());
  const renders = useRef(0);
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

      {sorted.map((row) => (
        <PersonTableRow key={row.id} row={row} />
      ))}
    </TableBody>
  );
});

/*
 * `memo` is the counterpart of yract's `deps={[row]}`: an unchanged row is
 * skipped when the body rerenders. It does NOT stop the context update below
 * from reaching every row, which is the one behaviour this port cannot match.
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
          aria-labelledby={`${row.id}-name person-department`}
          onChange={(e) => {
            updatePerson({ ...row, department: e.target.value });
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
