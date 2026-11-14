import type { CSSProperties } from 'react';

interface DustParticle {
  left: string;
  top: string;
  size: string;
  duration: string;
  delay: string;
  x: string;
  y: string;
  opacity: number;
}

type DustStyle = CSSProperties & {
  '--dust-left': string;
  '--dust-top': string;
  '--dust-size': string;
  '--dust-duration': string;
  '--dust-delay': string;
  '--dust-x': string;
  '--dust-y': string;
  '--dust-opacity': number;
};

const particles: DustParticle[] = [
  { left: '6%', top: '78%', size: '3px', duration: '16s', delay: '-2s', x: '50px', y: '-140px', opacity: 0.35 },
  { left: '14%', top: '65%', size: '2px', duration: '13s', delay: '-7s', x: '35px', y: '-110px', opacity: 0.28 },
  { left: '22%', top: '82%', size: '4px', duration: '19s', delay: '-4s', x: '65px', y: '-170px', opacity: 0.32 },
  { left: '31%', top: '70%', size: '2px', duration: '15s', delay: '-10s', x: '30px', y: '-120px', opacity: 0.24 },
  { left: '42%', top: '86%', size: '3px', duration: '18s', delay: '-6s', x: '55px', y: '-150px', opacity: 0.3 },
  { left: '51%', top: '74%', size: '2px', duration: '12s', delay: '-1s', x: '25px', y: '-90px', opacity: 0.26 },
  { left: '60%', top: '80%', size: '4px', duration: '20s', delay: '-12s', x: '70px', y: '-180px', opacity: 0.34 },
  { left: '69%', top: '68%', size: '2px', duration: '14s', delay: '-8s', x: '40px', y: '-100px', opacity: 0.22 },
  { left: '76%', top: '84%', size: '3px', duration: '17s', delay: '-3s', x: '45px', y: '-130px', opacity: 0.3 },
  { left: '84%', top: '72%', size: '2px', duration: '13s', delay: '-9s', x: '30px', y: '-110px', opacity: 0.25 },
  { left: '91%', top: '80%', size: '4px', duration: '21s', delay: '-5s', x: '60px', y: '-160px', opacity: 0.33 },
  { left: '10%', top: '55%', size: '2px', duration: '16s', delay: '-11s', x: '35px', y: '-90px', opacity: 0.2 },
  { left: '37%', top: '60%', size: '3px', duration: '18s', delay: '-2s', x: '50px', y: '-120px', opacity: 0.28 },
  { left: '57%', top: '58%', size: '2px', duration: '14s', delay: '-7s', x: '25px', y: '-80px', opacity: 0.22 },
  { left: '80%', top: '62%', size: '3px', duration: '19s', delay: '-4s', x: '55px', y: '-140px', opacity: 0.3 },
  { left: '95%', top: '58%', size: '2px', duration: '15s', delay: '-10s', x: '30px', y: '-100px', opacity: 0.24 },
];

export function Dust() {
  return (
    <div className="dust" aria-hidden="true">
      {particles.map((particle, index) => {
        const style: DustStyle = {
          '--dust-left': particle.left,
          '--dust-top': particle.top,
          '--dust-size': particle.size,
          '--dust-duration': particle.duration,
          '--dust-delay': particle.delay,
          '--dust-x': particle.x,
          '--dust-y': particle.y,
          '--dust-opacity': particle.opacity,
        };

        return <span key={index} className="dust__particle" style={style} />;
      })}
    </div>
  );
}
