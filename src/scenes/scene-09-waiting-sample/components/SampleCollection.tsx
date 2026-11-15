/**
 * Some of Percy's sealed sample tubes, standing in a rack.
 *
 * This is an illustration, not a count: six tubes stand for the real number,
 * which the fact card beside it states with its date. Five hold rock cores in
 * different layers and colours; the sixth is a witness tube, pale and empty
 * of rock, and is labelled so it is not mistaken for another core. Nothing here
 * can be pressed.
 */
interface TubeSpec {
  readonly kind: 'core' | 'witness';
  readonly layers: readonly string[];
}

const TUBES: readonly TubeSpec[] = [
  { kind: 'core', layers: ['#a65a3f', '#7d4636', '#c98a62'] },
  { kind: 'core', layers: ['#6d4a3a', '#a9744f'] },
  { kind: 'core', layers: ['#b8896a', '#8a5a44', '#5e3a2e'] },
  { kind: 'core', layers: ['#8d6a52', '#c09870'] },
  { kind: 'core', layers: ['#6a3e30', '#9a5e45', '#d0a47a'] },
  { kind: 'witness', layers: [] },
];

const TUBE_WIDTH = 40;
const TUBE_HEIGHT = 168;
const STEP = 62;
const LEFT = 30;
const TOP = 28;

function Tube({ spec, x, index }: { spec: TubeSpec; x: number; index: number }) {
  const clip = `p08-tube-clip-${index}`;
  const coreTop = TOP + 48;
  const coreHeight = 92;
  const band = spec.layers.length > 0 ? coreHeight / spec.layers.length : 0;
  return (
    <g transform={`translate(${x} 0)`}>
      <defs>
        <clipPath id={clip}>
          <rect x="6" y={TOP + 14} width={TUBE_WIDTH - 12} height={TUBE_HEIGHT - 22} rx="12" />
        </clipPath>
      </defs>
      {/* Glass body */}
      <rect
        x="3"
        y={TOP + 10}
        width={TUBE_WIDTH - 6}
        height={TUBE_HEIGHT - 14}
        rx="14"
        fill="rgba(236, 244, 246, 0.55)"
        stroke="#3b2118"
        strokeWidth="3"
      />
      {/* Core in layers, or nothing for the witness tube */}
      <g clipPath={`url(#${clip})`}>
        {spec.layers.map((color, layer) => (
          <rect
            key={layer}
            x="8"
            y={coreTop + layer * band}
            width={TUBE_WIDTH - 16}
            height={band + 1}
            fill={color}
          />
        ))}
        {spec.kind === 'witness' ? (
          <path d="M10 70 L30 90 M10 96 L30 116 M10 122 L30 142" stroke="#8aa3aa" strokeWidth="2.5" opacity="0.7" />
        ) : null}
        <rect x="9" y={TOP + 18} width="5" height={TUBE_HEIGHT - 30} rx="2.5" fill="#ffffff" opacity="0.55" />
      </g>
      {/* Sealed cap */}
      <rect
        x="0"
        y={TOP}
        width={TUBE_WIDTH}
        height="18"
        rx="6"
        fill={spec.kind === 'witness' ? '#d8dde0' : '#f3e6ca'}
        stroke="#3b2118"
        strokeWidth="3"
      />
      <path d={`M6 ${TOP + 9} H${TUBE_WIDTH - 6}`} stroke="#7b4636" strokeWidth="2" opacity="0.6" />
    </g>
  );
}

export function SampleCollection() {
  const width = LEFT * 2 + STEP * (TUBES.length - 1) + TUBE_WIDTH;
  return (
    <figure className="p08-tray">
      <svg
        className="p08-tray-image"
        viewBox={`0 0 ${width} 250`}
        role="img"
        aria-label="Six sealed sample tubes in a rack. Five hold layered rock cores. The last one, paler and empty of rock, is a witness tube."
      >
        {TUBES.map((spec, index) => (
          <Tube key={index} spec={spec} x={LEFT + index * STEP} index={index} />
        ))}
        {/* The rack */}
        <rect x="8" y="190" width={width - 16} height="34" rx="9" fill="#7b4636" stroke="#3b2118" strokeWidth="3" />
        <rect x="14" y="196" width={width - 28} height="8" rx="4" fill="#a65a3f" opacity="0.8" />
        {TUBES.map((_, index) => (
          <ellipse
            key={index}
            cx={LEFT + index * STEP + TUBE_WIDTH / 2}
            cy="196"
            rx="22"
            ry="6"
            fill="#3b2118"
            opacity="0.55"
          />
        ))}
      </svg>
      <figcaption className="p08-tray-caption">Some of Percy&rsquo;s sealed samples. The pale tube is a witness tube.</figcaption>
    </figure>
  );
}
