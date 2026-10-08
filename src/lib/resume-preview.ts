export function pdfBase64ToBlob(base64: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0),
  );
  return new Blob([bytes], { type: "application/pdf" });
}

/** Registration order and template aliases must not invalidate equivalent previews. */
export function resumeRequestKey(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item))
      return item.map((element: unknown) => normalize(element));
    if (item && typeof item === "object") {
      return Object.fromEntries(
        Object.entries(item)
          .filter(
            ([key, entry]) => key !== "applicationId" && entry !== undefined,
          )
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, entry]) => [
            key,
            key === "template" ? "professional" : normalize(entry),
          ]),
      );
    }
    return item;
  };
  return JSON.stringify(normalize(value));
}
