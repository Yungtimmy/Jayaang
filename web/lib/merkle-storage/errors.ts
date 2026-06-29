export function formatStorageError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const parts = [error.message];
  let current: unknown = (error as Error & { cause?: unknown }).cause;

  for (let depth = 0; depth < 3 && current; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      const code = (current as NodeJS.ErrnoException).code;
      if (code) parts.push(code);
      current = (current as Error & { cause?: unknown }).cause;
      continue;
    }
    parts.push(String(current));
    break;
  }

  return parts.filter(Boolean).join(" | ");
}