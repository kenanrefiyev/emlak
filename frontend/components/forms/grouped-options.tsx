/**
 * <option>s for a select, wrapped in an <optgroup> per `group` (e.g. districts
 * by city) when there is more than one group; a flat list otherwise.
 */
export function GroupedOptions({ options }: { options: { value: string; label: string; group?: string }[] }) {
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  const list = (opts: typeof options) =>
    opts.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ));
  if (groups.length < 2) return <>{list(options)}</>;
  return (
    <>
      {groups.map((g) => (
        <optgroup key={g} label={g}>
          {list(options.filter((o) => (o.group ?? "") === g))}
        </optgroup>
      ))}
    </>
  );
}
