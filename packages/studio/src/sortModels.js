/** Shared display-name ordering for model pickers (studio + web). */

export function compareDisplayName(a, b) {
  const an = String(a?.name || a?.id || "");
  const bn = String(b?.name || b?.id || "");
  return an.localeCompare(bn, undefined, { sensitivity: "base", numeric: true });
}

/** Copy sorted A→Z by `name` (fallback `id`). Does not mutate the input. */
export function sortByDisplayName(items) {
  return [...(items || [])].sort(compareDisplayName);
}
