import type { SonarMode } from '../sonar';

interface SonarRingsProps {
  mode: SonarMode;
  reducedMotion?: boolean;
}

/**
 * Two expanding cream rings from the rock base. Purely decorative; the button
 * label carries the meaning. Under reduced motion this is a static glow.
 */
export function SonarRings({ mode, reducedMotion = false }: SonarRingsProps) {
  if (mode === 'off') {
    return null;
  }

  if (reducedMotion) {
    return <span className="rock__sonar rock__sonar--static" aria-hidden="true" />;
  }

  return (
    <span
      className={`rock__sonar ${mode === 'paused' ? 'rock__sonar--paused' : ''}`}
      aria-hidden="true"
    >
      <span className="rock__sonar-ring" />
      <span className="rock__sonar-ring rock__sonar-ring--delay" />
    </span>
  );
}
