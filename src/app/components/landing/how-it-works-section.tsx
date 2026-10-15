const steps = [
  {
    title: "Add your record once",
    description:
      "Import an existing resume as a PDF, Word or text file, or type your experience in. Imported entries wait for your review before anything is saved.",
  },
  {
    title: "Add the job",
    description:
      "Create an application and paste in the listing. The application also keeps the status, contacts and notes for that job.",
  },
  {
    title: "Preview the page",
    description:
      "The entries that match the listing are selected and the page is compiled with pdfLaTeX. If it runs past your one- or two-page target, the wording is tightened and it is compiled again, up to three times. Fonts and margins stay fixed.",
  },
  {
    title: "Save and download",
    description:
      "The PDF is saved with the application. Generation keeps running if you close the tab, and the result is waiting when you come back.",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="bg-card text-card-foreground shadow-sheet relative"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:py-24">
        <h2 className="title text-4xl leading-none sm:text-5xl">
          How a resume gets made
        </h2>
        <ol className="flex flex-col">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 border-t py-6 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[4.5rem_minmax(0,1fr)]"
            >
              <span
                aria-hidden="true"
                className="title text-kraft text-4xl leading-none tabular-nums"
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground max-w-[65ch]">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
