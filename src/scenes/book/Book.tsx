import gsap from 'gsap';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { spreadTitle, type CharacterSpread } from './characters';
import {
  canTurn,
  clampIndex,
  pageAnnouncement,
  shouldCommitTurn,
  spreadAnnouncement,
  type TurnDirection,
} from './nav';
import type { RevealPhase } from './reveal';
import { LeftPage, RightPage } from './SpreadPages';
import { useCompact } from './useCompact';

/**
 * The 2.5D adventure journal (concept 7 and 8): a CSS 3D shell with real paper
 * pages, a leaf that turns by drag or by arrow, bookmark tabs per explorer,
 * and a mobile mode that shows one page at a time. Page content stays DOM, so
 * text is selectable and screen readers see a normal document.
 */

interface TurnState {
  dir: TurnDirection;
  target: number;
  mode: 'auto' | 'drag';
}

interface DragState {
  startX: number;
  progress: number;
  lastX: number;
  lastTime: number;
  velocity: number;
}

export interface BookProps {
  spreads: readonly CharacterSpread[];
  reveal: RevealPhase;
  reducedMotion: boolean;
  /** False while the inspector covers the book. */
  interactive: boolean;
  onExplore: (spread: CharacterSpread) => void;
  onStartStory: (spread: CharacterSpread) => void;
}

/** Calligraphic arrow from concept 8.1; the previous arrow is its mirror. */
function ArrowGlyph() {
  return (
    <svg
      viewBox="0 0 120 48"
      width="64"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 24 C 24 10, 38 38, 54 24 S 84 10, 104 24" />
      <path d="M90 12 C 98 18, 104 21, 112 24 C 104 27, 98 30, 90 36" />
      <path d="M12 24 C 4 24, 3 14, 10 14 C 15 14, 16 21, 11 22" />
      <path d="M30 34 C 38 36, 44 34, 50 30" strokeWidth={1.2} opacity="0.7" />
    </svg>
  );
}

export function Book({
  spreads,
  reveal,
  reducedMotion,
  interactive,
  onExplore,
  onStartStory,
}: BookProps) {
  const compact = useCompact();
  const [spread, setSpread] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [turn, setTurn] = useState<TurnState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [hinted, setHinted] = useState(true);
  const [coverMounted, setCoverMounted] = useState(true);

  const leafRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const wasCompact = useRef(compact);
  const firstAnnouncement = useRef(true);

  const count = spreads.length;
  const currentIndex = clampIndex(spread, count);
  const current = spreads[currentIndex];

  const compactPages = useMemo(
    () =>
      spreads.flatMap((item) => [
        { spread: item, side: 'left' as const },
        { spread: item, side: 'right' as const },
      ]),
    [spreads],
  );
  const activePageIndex = clampIndex(pageIndex, compactPages.length);
  const activePage = compactPages[activePageIndex];

  const folioOf = useCallback(
    (item: CharacterSpread, side: 'left' | 'right') => {
      const index = spreads.findIndex((entry) => entry.id === item.id);
      return String(index * 2 + (side === 'left' ? 1 : 2)).padStart(2, '0');
    },
    [spreads],
  );

  /* --- navigation -------------------------------------------------------- */

  const beginTurn = useCallback(
    (dir: TurnDirection, mode: 'auto' | 'drag') => {
      if (!interactive || reveal !== 'ready' || turn || !canTurn(currentIndex, dir, count)) {
        return;
      }
      setHinted(false);
      if (reducedMotion) {
        setSpread(currentIndex + dir);
        return;
      }
      setTurn({ dir, target: currentIndex + dir, mode });
    },
    [interactive, reveal, turn, currentIndex, count, reducedMotion],
  );

  const movePage = useCallback(
    (dir: TurnDirection) => {
      if (!interactive || reveal !== 'ready') {
        return;
      }
      setHinted(false);
      setPageIndex((index) => clampIndex(index + dir, compactPages.length));
    },
    [interactive, reveal, compactPages.length],
  );

  const jumpTo = useCallback(
    (index: number) => {
      if (!interactive || reveal !== 'ready') {
        return;
      }
      if (compact) {
        setHinted(false);
        setPageIndex(index * 2);
        return;
      }
      if (index === currentIndex) {
        return;
      }
      beginTurn(index > currentIndex ? 1 : -1, 'auto');
    },
    [interactive, reveal, compact, currentIndex, beginTurn],
  );

  /* Keeps the two navigation models in sync when the viewport crosses 900px. */
  useEffect(() => {
    if (wasCompact.current === compact) {
      return;
    }
    wasCompact.current = compact;
    setTurn(null);
    dragRef.current = null;
    if (compact) {
      setPageIndex(currentIndex * 2);
    } else {
      setSpread(Math.floor(activePageIndex / 2));
    }
  }, [compact, currentIndex, activePageIndex]);

  /* Announce every settled page, but stay silent on first paint. */
  useEffect(() => {
    if (firstAnnouncement.current) {
      firstAnnouncement.current = false;
      return;
    }
    if (compact) {
      setAnnouncement(
        pageAnnouncement(
          activePageIndex,
          compactPages.length,
          activePage.side,
          spreadTitle(activePage.spread),
        ),
      );
      return;
    }
    setAnnouncement(spreadAnnouncement(currentIndex, count, spreadTitle(spreads[currentIndex])));
  }, [compact, activePageIndex, compactPages.length, activePage, currentIndex, count, spreads]);

  /* Automatic leaf turn: one GSAP tween drives the CSS angle variable. */
  useEffect(() => {
    if (!turn || turn.mode !== 'auto') {
      return;
    }
    const leaf = leafRef.current;
    if (!leaf) {
      return;
    }
    const from = turn.dir === 1 ? 0 : -180;
    const to = turn.dir === 1 ? -180 : 0;
    const proxy = { angle: from };
    const apply = () => {
      leaf.style.setProperty('--leaf-angle', `${proxy.angle}deg`);
      leaf.style.setProperty(
        '--leaf-shade',
        `${Math.sin((Math.abs(proxy.angle) / 180) * Math.PI) * 0.5}`,
      );
    };
    apply();
    tweenRef.current = gsap.to(proxy, {
      angle: to,
      duration: 0.95,
      ease: 'power2.inOut',
      onUpdate: apply,
      onComplete: () => {
        setSpread(turn.target);
        setTurn(null);
      },
    });
    return () => {
      tweenRef.current?.kill();
      tweenRef.current = null;
    };
  }, [turn]);

  /* Dragged leaf: the pointer sets the angle, release commits or springs back. */
  useEffect(() => {
    if (!turn || turn.mode !== 'drag') {
      return;
    }
    const leaf = leafRef.current;
    const book = bookRef.current;
    if (!leaf || !book) {
      return;
    }
    const startAngle = turn.dir === 1 ? 0 : -180;
    const travel = turn.dir === 1 ? -180 : 180;
    const pageWidth = Math.max(1, book.clientWidth / 2);
    const drag = dragRef.current;
    leaf.style.setProperty('--leaf-angle', `${startAngle}deg`);

    const applyAngle = (angle: number) => {
      leaf.style.setProperty('--leaf-angle', `${angle}deg`);
      const progress = Math.min(1, Math.max(0, (angle - startAngle) / travel));
      leaf.style.setProperty('--leaf-shade', `${Math.sin(progress * Math.PI) * 0.5}`);
    };

    const onMove = (event: PointerEvent) => {
      if (!drag) {
        return;
      }
      drag.progress = Math.min(
        1,
        Math.max(0, ((drag.startX - event.clientX) * turn.dir) / pageWidth),
      );
      const now = performance.now();
      const elapsed = now - drag.lastTime;
      if (elapsed > 0) {
        drag.velocity = Math.abs(event.clientX - drag.lastX) / elapsed;
        drag.lastX = event.clientX;
        drag.lastTime = now;
      }
      applyAngle(startAngle + travel * drag.progress);
    };

    const settle = (commit: boolean) => {
      const progress = drag?.progress ?? 0;
      // A plain tap on the edge counts as "turn", like a corner tap in a book.
      const shouldCommit = commit || progress < 0.05;
      const proxy = { angle: startAngle + travel * progress };
      tweenRef.current = gsap.to(proxy, {
        angle: shouldCommit ? startAngle + travel : startAngle,
        duration: 0.34,
        ease: 'power2.out',
        onUpdate: () => applyAngle(proxy.angle),
        onComplete: () => {
          if (shouldCommit) {
            setSpread(turn.target);
          }
          dragRef.current = null;
          setTurn(null);
        },
      });
    };

    const onUp = () => {
      const state = dragRef.current;
      settle(state ? shouldCommitTurn(state.progress, state.velocity) : false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      tweenRef.current?.kill();
      tweenRef.current = null;
    };
  }, [turn]);

  useEffect(() => {
    return () => {
      tweenRef.current?.kill();
    };
  }, []);

  const handleEdgeDown = (dir: TurnDirection) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    if (!interactive || reveal !== 'ready' || turn || !canTurn(currentIndex, dir, count)) {
      return;
    }
    event.preventDefault();
    if (reducedMotion) {
      setHinted(false);
      setSpread(currentIndex + dir);
      return;
    }
    dragRef.current = {
      startX: event.clientX,
      progress: 0,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
    };
    setHinted(false);
    setTurn({ dir, target: currentIndex + dir, mode: 'drag' });
  };

  /* Keyboard: arrows turn pages, Home/End jump to the first/last spread. */
  useEffect(() => {
    if (!interactive || reveal !== 'ready') {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (compact) {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          movePage(1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          movePage(-1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          setPageIndex(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          setPageIndex(compactPages.length - 1);
        }
        return;
      }
      if (turn) {
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        beginTurn(1, 'auto');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        beginTurn(-1, 'auto');
      } else if (event.key === 'Home') {
        event.preventDefault();
        setSpread(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setSpread(count - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [interactive, reveal, compact, movePage, beginTurn, turn, count, compactPages.length]);

  /* The cover lingers a beat after the journal is ready, then steps aside. */
  useEffect(() => {
    if (reveal !== 'ready') {
      return;
    }
    const timer = window.setTimeout(() => setCoverMounted(false), 420);
    return () => window.clearTimeout(timer);
  }, [reveal]);

  /* --- derived pages ----------------------------------------------------- */

  const target = turn ? spreads[clampIndex(turn.target, count)] : null;
  const underLeft = turn?.dir === -1 && target ? target : current;
  const underRight = turn?.dir === 1 && target ? target : current;

  let leafFront: ReactNode = null;
  let leafBack: ReactNode = null;
  if (turn && target) {
    const frontSpread = turn.dir === 1 ? current : target;
    const backSpread = turn.dir === 1 ? target : current;
    leafFront = (
      <RightPage spread={frontSpread} folio={folioOf(frontSpread, 'right')} mode="static" />
    );
    leafBack = <LeftPage spread={backSpread} folio={folioOf(backSpread, 'left')} mode="static" />;
  }

  const prevAllowed = compact
    ? canTurn(activePageIndex, -1, compactPages.length)
    : canTurn(currentIndex, -1, count);
  const nextAllowed = compact
    ? canTurn(activePageIndex, 1, compactPages.length)
    : canTurn(currentIndex, 1, count);
  const showCover = coverMounted && !reducedMotion;
  const activeForIndicator = compact ? activePageIndex : currentIndex;
  const indicatorCount = compact ? compactPages.length : count;
  const activeTab = compact ? Math.floor(activePageIndex / 2) : currentIndex;

  return (
    <div className="book-frame" data-phase={reveal} data-compact={compact ? 'true' : 'false'}>
      <div className="book-shift" data-phase={reveal}>
        <div className="book-float">
          <div className="book" ref={bookRef} data-compact={compact ? 'true' : 'false'}>
            <div className="book__shell">
              <span className="book__board book__board--left" aria-hidden="true" />
              <span className="book__board book__board--right" aria-hidden="true" />

              {compact ? (
                <div
                  className="book__page book__page--single"
                  key={`${activePage.spread.id}-${activePage.side}`}
                >
                  {activePage.side === 'left' ? (
                    <LeftPage
                      spread={activePage.spread}
                      folio={folioOf(activePage.spread, 'left')}
                    />
                  ) : (
                    <RightPage
                      spread={activePage.spread}
                      folio={folioOf(activePage.spread, 'right')}
                      onExplore={onExplore ? () => onExplore(activePage.spread) : undefined}
                      onStartStory={
                        onStartStory ? () => onStartStory(activePage.spread) : undefined
                      }
                      reducedMotion={reducedMotion}
                    />
                  )}
                </div>
              ) : (
                <>
                  <div className="book__page book__page--left">
                    <LeftPage
                      spread={underLeft}
                      folio={folioOf(underLeft, 'left')}
                      mode={turn ? 'static' : 'full'}
                    />
                  </div>
                  <div className="book__page book__page--right">
                    <RightPage
                      spread={underRight}
                      folio={folioOf(underRight, 'right')}
                      mode={turn ? 'static' : 'full'}
                      onExplore={() => onExplore(underRight)}
                      onStartStory={() => onStartStory(underRight)}
                      reducedMotion={reducedMotion}
                    />
                  </div>
                </>
              )}

              {turn && !compact ? (
                <div
                  className="book__leaf"
                  ref={leafRef}
                  style={{ '--leaf-angle': turn.dir === 1 ? '0deg' : '-180deg' } as CSSProperties}
                >
                  <div className="book__leaf-face book__leaf-face--front">{leafFront}</div>
                  <div className="book__leaf-face book__leaf-face--back">{leafBack}</div>
                  <span className="book__leaf-shade" aria-hidden="true" />
                </div>
              ) : null}

              <span className="book__spine" aria-hidden="true" />

              {showCover ? (
                <div
                  className="book__cover"
                  data-open={reveal !== 'arriving' ? 'true' : 'false'}
                  data-fading={reveal === 'ready' ? 'true' : 'false'}
                  aria-hidden="true"
                >
                  <div className="book__cover-face book__cover-face--front">
                    <span className="book__cover-band" />
                    <p className="book__cover-kicker">NASA</p>
                    <h2 className="book__cover-title">The Adventure Journal</h2>
                    <p className="book__cover-sub">A storybook from the Red Planet</p>
                    <span className="book__cover-emblem">
                      <span className="book__cover-star">✦</span>
                    </span>
                    <p className="book__cover-foot">Volume one · Mars</p>
                  </div>
                  <div className="book__cover-face book__cover-face--back">
                    <div className="book__endpaper">
                      <span className="book__endpaper-note">Property of: a curious explorer</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <nav className="book-tabs" aria-label="Explorers">
              {spreads.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="book-tab"
                  data-active={index === activeTab ? 'true' : 'false'}
                  aria-pressed={index === activeTab}
                  onClick={() => jumpTo(index)}
                >
                  {item.tab}
                </button>
              ))}
            </nav>

            {!compact && reveal === 'ready' && interactive ? (
              <>
                <div
                  className="book-edge book-edge--prev"
                  data-enabled={prevAllowed ? 'true' : 'false'}
                  onPointerDown={handleEdgeDown(-1)}
                  aria-hidden="true"
                />
                <div
                  className="book-edge book-edge--next"
                  data-enabled={nextAllowed ? 'true' : 'false'}
                  onPointerDown={handleEdgeDown(1)}
                  aria-hidden="true"
                />
              </>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="page-arrow page-arrow--prev"
        onClick={() => (compact ? movePage(-1) : beginTurn(-1, 'auto'))}
        disabled={!prevAllowed || !interactive || reveal !== 'ready'}
        data-hint={hinted ? 'true' : 'false'}
        aria-label={compact ? 'Previous page' : 'Previous explorer'}
      >
        <span className="page-arrow__glyph page-arrow__glyph--prev">
          <ArrowGlyph />
        </span>
      </button>

      <button
        type="button"
        className="page-arrow page-arrow--next"
        onClick={() => (compact ? movePage(1) : beginTurn(1, 'auto'))}
        disabled={!nextAllowed || !interactive || reveal !== 'ready'}
        data-hint={hinted ? 'true' : 'false'}
        aria-label={compact ? 'Next page' : 'Next explorer'}
      >
        <span className="page-arrow__glyph">
          <ArrowGlyph />
        </span>
      </button>

      <div className="book-indicator">
        <span className="book-indicator__dots" aria-hidden="true">
          {Array.from({ length: indicatorCount }, (_, index) => (
            <span
              key={index}
              className="book-indicator__dot"
              data-active={index === activeForIndicator ? 'true' : 'false'}
            />
          ))}
        </span>
        <span className="book-indicator__count" aria-hidden="true">
          {activeForIndicator + 1} / {indicatorCount}
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
