import Link from "next/link";
import { FolderTab } from "@/components/ui/folder-tab";
import { Wordmark } from "@/components/wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="band flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="flex w-full max-w-md flex-col">
        <div className="flex px-4">
          <FolderTab asChild open className="h-12 px-6">
            <Link href="/">
              <Wordmark />
            </Link>
          </FolderTab>
        </div>
        <main
          data-slot="folder"
          className="folder border-kraft rounded-lg border px-6 py-10 sm:px-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
