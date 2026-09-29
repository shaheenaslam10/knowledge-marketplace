import Link from "next/link";

/**
 * Shared shell for the public legal documents (Phase 12 launch requirement).
 *
 * These pages are a launch gate, not marketing copy: the content restates
 * rules that the platform actually enforces in code (business-rules.md), so
 * changing a rule means changing the page in the same commit.
 */
export type LegalSection = {
  heading: string;
  body: string[];
  bullets?: string[];
};

export function LegalDocument({
  title,
  summary,
  effective,
  sections,
}: {
  title: string;
  summary: string;
  effective: string;
  sections: LegalSection[];
}) {
  return (
    <article className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">{summary}</p>
        <p className="mt-2 text-xs text-muted">Effective: {effective}</p>
      </header>

      <nav aria-label="Sections" className="rounded-lg border border-border p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">On this page</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {sections.map((section) => (
            <li key={section.heading}>
              <Link href={`#${slug(section.heading)}`} className="hover:underline">
                {section.heading}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.heading} id={slug(section.heading)} className="scroll-mt-24">
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <footer className="border-t border-border pt-6 text-sm text-slate-600 dark:text-slate-300">
        <p>
          Questions about this document? Contact the platform operator through your account, or see{" "}
          <Link href="/how-it-works" className="underline hover:text-foreground">
            how the platform works
          </Link>
          .
        </p>
      </footer>
    </article>
  );
}

export function slug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
