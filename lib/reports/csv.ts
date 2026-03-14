type CsvColumn<T extends Record<string, unknown>> = {
  key: keyof T;
  label: string;
};

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = String(value).replaceAll('"', '""');

  if (/[",\n]/.test(normalized)) {
    return `"${normalized}"`;
  }

  return normalized;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: CsvColumn<T>[]) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(",");

  const body = rows
    .map((row) => columns.map((column) => escapeCsvValue(row[column.key])).join(","))
    .join("\n");

  return body ? `${header}\n${body}` : `${header}\n`;
}
