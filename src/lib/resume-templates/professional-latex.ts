import type { ResumeDocument } from "@/lib/resume-document";

const escapes: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  $: "\\$",
  "&": "\\&",
  "#": "\\#",
  "%": "\\%",
  _: "\\_",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};
export function escapeLatex(value: string): string {
  return Array.from(value)
    .filter(
      (character) =>
        character.charCodeAt(0) >= 32 || ["\n", "\r", "\t"].includes(character),
    )
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "--")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/→/g, " to ")
    .replace(/[\\{}$&#%_~^]/g, (character) => escapes[character] ?? character)
    .replace(/\r?\n/g, " ");
}

/** Only bold and italic markup is interpreted; all enclosed text is escaped. */
export function formatLatex(value: string): string {
  return value
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return `\\textbf{${escapeLatex(part.slice(2, -2))}}`;
      if (part.startsWith("*") && part.endsWith("*"))
        return `\\textit{${escapeLatex(part.slice(1, -1))}}`;
      return escapeLatex(part);
    })
    .join("");
}

function link(url: string | undefined, label: string, header = false): string {
  // PDF links may only use ordinary web or email schemes.
  if (!url || !/^(https?:\/\/|mailto:)/i.test(url)) return escapeLatex(label);
  const display = escapeLatex(label).replace(/([/.@-])/g, "$1\\allowbreak{}");
  return `\\href{${escapeLatex(url)}}{${header ? `\\textcolor{black}{${display}}` : display}}`;
}

export function generateProfessionalResumeLatex(
  document: ResumeDocument,
): string {
  const contactLines: string[] = [];
  for (let index = 0; index < document.contacts.length; index += 2) {
    contactLines.push(
      document.contacts
        .slice(index, index + 2)
        .map(
          (item) =>
            `${escapeLatex(item.label)}: ${link(item.url, item.text, true)}`,
        )
        .join(" \\enspace "),
    );
  }
  const sections = document.sections
    .filter((section) => section.entries.length > 0)
    .map((section) => {
      const entries = section.entries
        .map(
          (entry) => String.raw`
\needspace{3\baselineskip}
\resumeentry{${formatLatex(entry.heading)}}{${escapeLatex(entry.subheading)}}{${escapeLatex(entry.dates)}}
${entry.details.map((detail) => `${formatLatex(detail)}\\par`).join("\n")}
${entry.links.length ? `${entry.links.map((item) => link(item.url, item.text)).join(" \\enspace ")}\\par` : ""}
${
  entry.bullets.length
    ? String.raw`\begin{itemize}
${entry.bullets.map((bullet) => `\\item ${formatLatex(bullet.text)}`).join("\n")}
\end{itemize}`
    : ""
}`,
        )
        .join("\n");
      return `\\resumesection{${escapeLatex(section.title)}}\n${entries}`;
    })
    .join("\n");
  return String.raw`\documentclass[9pt,a4paper]{extarticle}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{newtxtext}
\usepackage[a4paper,left=0.5in,right=0.5in,top=0.43in,bottom=0.35in]{geometry}
\usepackage{enumitem,xcolor,needspace,xurl}
\usepackage{hyperref}
\hypersetup{colorlinks=true,urlcolor=blue,linkcolor=blue,pdftitle={${escapeLatex(document.title)}},pdfauthor={${escapeLatex(document.name)}}}
\urlstyle{same}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\setlength{\emergencystretch}{1em}
\raggedright
\setlist[itemize]{label=\textbullet,leftmargin=27pt,labelsep=13pt,topsep=0pt,partopsep=0pt,parsep=0pt,itemsep=0.5pt}
\newcommand{\resumesection}[1]{\par\addvspace{3pt}\needspace{4\baselineskip}{\bfseries\MakeUppercase{#1}\par}\nobreak\vspace{1pt}\hrule height 1.1pt\nobreak\vspace{1pt}}
\newcommand{\resumeentry}[3]{\par\addvspace{3pt}\noindent\textbf{#1}\hfill\textbf{#3}\par\nobreak\if\relax\detokenize{#2}\relax\else #2\par\nobreak\fi}
\begin{document}
\fontsize{9}{10.2}\selectfont
${
  document.name || document.contacts.length
    ? String.raw`\begin{center}
\vspace*{-\topsep}
{\fontsize{12}{13}\selectfont\textbf{${escapeLatex(document.name)}}\par}
{\fontsize{9.5}{10.5}\selectfont
${contactLines.join("\\par\n")}
\par}
\end{center}\vspace{-5pt}`
    : ""
}
${document.summary ? `\\resumesection{Professional Summary}\n${formatLatex(document.summary)}\\par` : ""}
${sections}
\end{document}
`;
}
