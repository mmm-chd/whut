import type { MutableRefObject } from 'react';
import type { RockConfig } from '../rocks.config';
import type { RockId } from '../interactions';

interface RockProxyProps {
  config: RockConfig;
  inspected: boolean;
  onInspect: (rockId: RockId) => void;
  disabled?: boolean;
  /** Written here, read by the WebGL rock to brighten on hover or focus. */
  hover: MutableRefObject<number>;
  /** The WebGL world places this element over the drawn rock every frame. */
  register: (id: RockId, element: HTMLButtonElement | null) => void;
  /** Resting rectangle (percent of the host) used until the world takes over. */
  restStyle: { left: string; top: string; width: string; height: string };
}

const HOVER_GLOW = 0.1;

/**
 * The accessible face of a rock. The picture is drawn in WebGL; this invisible
 * button carries the label, focus ring, keyboard and pointer input, and sits
 * exactly over the drawn rock.
 */
export function RockProxy({
  config,
  inspected,
  onInspect,
  disabled,
  hover,
  register,
  restStyle,
}: RockProxyProps) {
  const { id, alt } = config;

  return (
    <button
      type="button"
      className={`rock ${inspected ? 'rock--inspected' : ''}`}
      ref={(element) => register(id, element)}
      data-rock={id}
      data-inspected={inspected}
      aria-label={inspected ? `${alt} (inspected)` : `Inspect ${alt}`}
      aria-pressed={inspected}
      disabled={disabled}
      onClick={() => onInspect(id)}
      onPointerEnter={() => {
        hover.current = HOVER_GLOW;
      }}
      onPointerLeave={() => {
        hover.current = 0;
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(':focus-visible')) {
          hover.current = HOVER_GLOW;
        }
      }}
      onBlur={() => {
        hover.current = 0;
      }}
      style={restStyle}
    />
  );
}
