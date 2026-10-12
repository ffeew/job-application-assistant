import { cn } from "@/lib/utils";

/** The product name with its folder glyph: one sheet, one highlighted line. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "title flex items-center gap-2.5 text-lg leading-none whitespace-nowrap",
        className,
      )}
    >
      {/* Brand colours, fixed in both themes, as in the favicon. The outline
          keeps the folder legible on a manila tab as well as on the ink strip. */}
      <svg
        viewBox="0 0 26 22"
        aria-hidden="true"
        className="h-[22px] w-[26px] shrink-0"
      >
        <path
          d="M1 3.5A1.5 1.5 0 0 1 2.5 2h6.3l2.3 2.7h12.4A1.5 1.5 0 0 1 25 6.2v13.3a1.5 1.5 0 0 1-1.5 1.5h-21A1.5 1.5 0 0 1 1 19.5z"
          fill="#d2b062"
          stroke="#8f6a26"
        />
        <rect x="4.5" y="6.5" width="17" height="11" fill="#ffffff" />
        <rect x="6.5" y="8.3" width="6" height="1.3" fill="#1c2030" />
        <rect x="6" y="10.6" width="11" height="3.2" rx="0.8" fill="#ffe330" />
        <path
          d="M1 12.5h24v7a1.5 1.5 0 0 1-1.5 1.5h-21A1.5 1.5 0 0 1 1 19.5z"
          fill="#efd8a1"
          stroke="#8f6a26"
        />
      </svg>
      Job Application Assistant
    </span>
  );
}
