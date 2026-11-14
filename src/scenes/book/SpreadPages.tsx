import type { CSSProperties } from 'react';
import type { CharacterSpread } from './characters';
import { ModelViewer } from './ModelViewer';

/**
 * The two faces of one explorer spread (concept 9 and 10). The left page is a
 * scrapbook identity card; the right page holds the passive 3D preview and the
 * two entries into the rest of the experience. `mode="static"` draws the same
 * layout without a live model or focusable buttons: it is used for the faces
 * of the flipping leaf and the page waiting underneath it.
 */

export type PageMode = 'full' | 'static';

type PageStyle = CSSProperties & { '--spread-accent': string };

interface PageProps {
  spread: CharacterSpread;
  /** Printed page number along the bottom outer corner. */
  folio: string;
  mode?: PageMode;
}

export function LeftPage({ spread, folio, mode = 'full' }: PageProps) {
  return (
    <article
      className="page page--left"
      data-mode={mode}
      style={{ '--spread-accent': spread.accent } as PageStyle}
      aria-label={`${spread.name}, ${spread.headline}`}
    >
      <span className="page__edge" aria-hidden="true" />

      <span className="page__tape page__tape--stamp" aria-hidden="true" />
      <span className="page__stamp">MEET THE EXPLORER</span>

      <h2 className="page__name">Meet {spread.name}!</h2>
      <p className="page__headline">{spread.headline}</p>
      <p className="page__intro">{spread.intro}</p>

      <figure className="polaroid">
        <div className="polaroid__frame">
          <img src={spread.portrait} alt={`${spread.name}, ${spread.headline}`} draggable={false} />
        </div>
        <span className="polaroid__tape" aria-hidden="true" />
        <figcaption>
          {spread.name} · {spread.headline}
        </figcaption>
      </figure>

      <section className="facts">
        <h3 className="facts__title">QUICK FACTS</h3>
        <dl className="facts__list">
          {spread.facts.map((fact) => (
            <div className="facts__row" key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="page__hand">{spread.quote}</p>

      <aside className="sticky-note">
        <span className="sticky-note__pin" aria-hidden="true" />
        {spread.sticky}
      </aside>

      <span className="page__folio" aria-hidden="true">
        {folio}
      </span>
    </article>
  );
}

interface RightPageProps extends PageProps {
  onExplore?: () => void;
  onStartStory?: () => void;
  reducedMotion?: boolean;
}

export function RightPage({
  spread,
  folio,
  mode = 'full',
  onExplore,
  onStartStory,
  reducedMotion = false,
}: RightPageProps) {
  const live = mode === 'full';

  return (
    <article
      className="page page--right"
      data-mode={mode}
      style={{ '--spread-accent': spread.accent } as PageStyle}
      aria-label={`Explore ${spread.name}, ${spread.headline}`}
    >
      <span className="page__edge" aria-hidden="true" />
      <span className="page__stamp page__stamp--space">DISCOVER MORE</span>

      <h2 className="page__name">Explore {spread.name}!</h2>
      <p className="page__intro">{spread.discover}</p>

      <div className="viewport">
        {live ? (
          <ModelViewer
            model={spread.model}
            portrait={spread.portrait}
            label={`Model 3D ${spread.name}, ${spread.headline}, berputar perlahan.`}
            reducedMotion={reducedMotion}
          />
        ) : (
          <img
            className="viewport__still"
            src={spread.portrait}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        )}
        <span className="viewport__corners" aria-hidden="true" />
        <span className="viewport__tag">3D PREVIEW</span>
      </div>

      <p className="viewport__hint">
        {live
          ? 'Turns by itself — open the inspector to look closer.'
          : 'A closer look is one tap away.'}
      </p>

      {live ? (
        <div className="page__actions">
          <button type="button" className="paper-button" onClick={onExplore}>
            <span className="paper-button__icon" aria-hidden="true">
              ✦
            </span>
            Explore 3D
          </button>
          {spread.storyReady ? (
            <button
              type="button"
              className="paper-button paper-button--primary"
              onClick={onStartStory}
            >
              Start the story <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button
              type="button"
              className="paper-button paper-button--soon"
              disabled
              title="Ginny's story is still being written."
            >
              Story coming soon
            </button>
          )}
        </div>
      ) : (
        <div className="page__actions page__actions--static" aria-hidden="true">
          <span className="paper-button paper-button--shell">Explore 3D</span>
          <span className="paper-button paper-button--shell paper-button--primary">
            Start the story →
          </span>
        </div>
      )}

      <span className="page__folio" aria-hidden="true">
        {folio}
      </span>
    </article>
  );
}
