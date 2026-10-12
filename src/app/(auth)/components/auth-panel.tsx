interface AuthPanelProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthPanel({
  title,
  description,
  children,
  footer,
}: AuthPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="title text-4xl leading-none">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {children}
      {footer && (
        <div className="text-muted-foreground flex flex-col gap-2 text-sm [&_a]:text-link [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:no-underline">
          {footer}
        </div>
      )}
    </div>
  );
}
