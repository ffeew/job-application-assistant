interface FormSectionProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}

/** A titled group of fields: heading beside the fields on wide screens. */
export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="grid gap-x-10 gap-y-4 border-t py-8 first:border-t-0 first:pt-0 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}
