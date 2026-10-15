import type { Metadata } from "next";
import {
  Archivo,
  Big_Shoulders_Stencil,
  STIX_Two_Text,
} from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/app/components/providers/query-provider";
import { ThemeProvider } from "@/app/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "@/lib/env";

// The width axis supplies the condensed cut used for titles.
const archivo = Archivo({
  axes: ["wdth"],
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

// Close to the newtxtext face the LaTeX template compiles with; documents only.
const stixTwoText = STIX_Two_Text({
  style: ["normal", "italic"],
  variable: "--font-stix",
  subsets: ["latin"],
  display: "swap",
});

// Rubber stamps only: status and page-fit verdicts.
const bigShouldersStencil = Big_Shoulders_Stencil({
  weight: ["700"],
  variable: "--font-big-shoulders-stencil",
  subsets: ["latin"],
  display: "swap",
  // Next has no metrics for this face; stamps are short, so a shift on swap is harmless.
  // Turbopack still looks the metrics up unless a fallback is named, and warns when it
  // finds none. `--font-stencil` in globals.css continues the chain after Archivo.
  fallback: ["Archivo"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Job Application Assistant",
  description:
    "Keep one career profile, tailor a one-page resume to each job, and track your applications on your own server.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${stixTwoText.variable} ${bigShouldersStencil.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
