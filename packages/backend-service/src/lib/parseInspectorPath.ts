import type { ParsedInspectorPath } from "@c-pointer/shared";

export function parseInspectorPath(input: string): ParsedInspectorPath {
  const parts = input.split(":");
  if (parts.length < 4) {
    throw new Error("Invalid data_insp_path");
  }

  const componentName = parts.pop() as string;
  const column = Number(parts.pop());
  const line = Number(parts.pop());
  const filePath = parts.join(":");

  if (!filePath || Number.isNaN(line) || Number.isNaN(column)) {
    throw new Error("Invalid data_insp_path");
  }

  return {
    filePath,
    line,
    column,
    componentName
  };
}
