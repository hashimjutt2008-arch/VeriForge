export function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "QuotaExceededError")
    return "Browser storage is full. Download existing reports, then clear local data in Settings and try again.";
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
