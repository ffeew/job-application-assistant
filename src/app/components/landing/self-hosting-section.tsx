import { REPOSITORY_URL } from "./links";

const requirements = [
  "Docker Engine with Compose v2 on Linux x86-64",
  "A Groq API key, used to select and write content",
];

// Mirrors the first deployment steps in docs/deployment.md.
const commands = `git clone ${REPOSITORY_URL}
cd job-application-assistant
cp .env.example .env
docker compose up -d --build --wait`;

export function SelfHostingSection() {
  return (
    <section id="self-hosting" className="band">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
        <div className="flex min-w-0 flex-col gap-6">
          <h2 className="title text-4xl leading-none sm:text-5xl">
            Runs on your server
          </h2>
          <p className="text-muted-foreground max-w-[60ch]">
            Docker Compose starts the whole stack: the app, PostgreSQL, a
            background worker, the LaTeX compiler, an OCR reader for scanned
            resumes and file storage. Your profile, applications and documents
            stay in your own database, and your files on your own disk.
          </p>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">What you need</h3>
            <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5">
              {requirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <pre className="bg-muted overflow-x-auto rounded-lg border p-5 font-mono text-sm leading-relaxed">
            <code>{commands}</code>
          </pre>
          <p className="text-muted-foreground max-w-[60ch] text-sm">
            Set the API key and secrets in{" "}
            <code className="font-mono">.env</code> before you start the stack.
            The{" "}
            <a
              href={`${REPOSITORY_URL}/blob/main/docs/deployment.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link underline underline-offset-4 hover:no-underline"
            >
              deployment guide
            </a>{" "}
            covers HTTPS, updates and backups.
          </p>
        </div>
      </div>
    </section>
  );
}
