import type { P08Source } from '../content';

/**
 * A short, dated fact on paper. The date and the source are part of the card,
 * so a number never floats free of when and where it was read.
 */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatAsOf(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day || month < 1 || month > 12) {
    return iso;
  }
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function FactCard({
  title,
  body,
  asOf,
  source,
}: {
  readonly title: string;
  readonly body: string;
  readonly asOf: string;
  readonly source: P08Source;
}) {
  return (
    <article className="p08-fact">
      <h2 className="p08-fact-title">{title}</h2>
      <p className="p08-fact-body">{body}</p>
      <p className="p08-fact-source">
        As of {formatAsOf(asOf)}. Source: {source.title}.
      </p>
    </article>
  );
}
