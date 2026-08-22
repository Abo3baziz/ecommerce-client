export function buildSort(
  field: string,
  descending: boolean,
): string {
  return descending ? `-${field}` : field;
}

export type SortSpec = { field: string; desc?: boolean };

export function sortParam(sort: SortSpec | undefined): string | undefined {
  if (!sort) return undefined;
  return buildSort(sort.field, sort.desc ?? false);
}
