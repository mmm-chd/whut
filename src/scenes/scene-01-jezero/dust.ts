import type { DustParticle } from '../../three/effects';

/** The P-01 dust motes: 16 slow cream specks (left/top are host fractions). */
export const DUST_PARTICLES: readonly DustParticle[] = [
  { left: 0.06, top: 0.78, size: 3, duration: 16, delay: -2, dx: 50, dy: -140, opacity: 0.35 },
  { left: 0.14, top: 0.65, size: 2, duration: 13, delay: -7, dx: 35, dy: -110, opacity: 0.28 },
  { left: 0.22, top: 0.82, size: 4, duration: 19, delay: -4, dx: 65, dy: -170, opacity: 0.32 },
  { left: 0.31, top: 0.7, size: 2, duration: 15, delay: -10, dx: 30, dy: -120, opacity: 0.24 },
  { left: 0.42, top: 0.86, size: 3, duration: 18, delay: -6, dx: 55, dy: -150, opacity: 0.3 },
  { left: 0.51, top: 0.74, size: 2, duration: 12, delay: -1, dx: 25, dy: -90, opacity: 0.26 },
  { left: 0.6, top: 0.8, size: 4, duration: 20, delay: -12, dx: 70, dy: -180, opacity: 0.34 },
  { left: 0.69, top: 0.68, size: 2, duration: 14, delay: -8, dx: 40, dy: -100, opacity: 0.22 },
  { left: 0.76, top: 0.84, size: 3, duration: 17, delay: -3, dx: 45, dy: -130, opacity: 0.3 },
  { left: 0.84, top: 0.72, size: 2, duration: 13, delay: -9, dx: 30, dy: -110, opacity: 0.25 },
  { left: 0.91, top: 0.8, size: 4, duration: 21, delay: -5, dx: 60, dy: -160, opacity: 0.33 },
  { left: 0.1, top: 0.55, size: 2, duration: 16, delay: -11, dx: 35, dy: -90, opacity: 0.2 },
  { left: 0.37, top: 0.6, size: 3, duration: 18, delay: -2, dx: 50, dy: -120, opacity: 0.28 },
  { left: 0.57, top: 0.58, size: 2, duration: 14, delay: -7, dx: 25, dy: -80, opacity: 0.22 },
  { left: 0.8, top: 0.62, size: 3, duration: 19, delay: -4, dx: 55, dy: -140, opacity: 0.3 },
  { left: 0.95, top: 0.58, size: 2, duration: 15, delay: -10, dx: 30, dy: -100, opacity: 0.24 },
];
