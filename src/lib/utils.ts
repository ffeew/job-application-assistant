import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Downloads a PDF blob as a file.
 * Separates DOM manipulation from data fetching for cleaner mutation hooks.
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9-_]/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizedFilename.endsWith(".pdf")
    ? sanitizedFilename
    : `${sanitizedFilename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
