export function PageHeader({
  title,
  description,
  action,
  live,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  live?: boolean;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
            {title}
          </h1>
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-live" />
              En direct
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-400">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
