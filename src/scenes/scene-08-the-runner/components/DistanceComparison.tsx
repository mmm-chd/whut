import { DISTANCE_SNAPSHOT, FIELD_LENGTH_M, FIELDS_PER_ICON, fieldIcons } from '../content';

/**
 * Oppy and Percy on one scale: a strip of field tiles for each, one tile per
 * ten football fields. The numbers are small print under a picture a child can
 * read at a glance, and both strips are the same length because the two
 * distances are nearly the same.
 */
function FieldTile() {
  return (
    <svg className="p07-tile" viewBox="0 0 20 12" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="18" height="10" rx="2" fill="#f3e6ca" stroke="#7b4636" strokeWidth="1.4" />
      <path d="M10 1.5v9M1.5 6h2.5M16 6h2.5" stroke="#b95e43" strokeWidth="1" fill="none" />
      <circle cx="10" cy="6" r="2" fill="none" stroke="#b95e43" strokeWidth="1" />
    </svg>
  );
}

function Strip({ count, label }: { count: number; label: string }) {
  return (
    <div className="p07-strip" role="img" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <FieldTile key={index} />
      ))}
    </div>
  );
}

export function DistanceComparison() {
  const { opportunityKm, perseveranceKm, perseveranceAsOf, perseveranceMissionAge, opportunityPeriod } = DISTANCE_SNAPSHOT;
  const oppy = fieldIcons(opportunityKm);
  const percy = perseveranceKm === null ? 0 : fieldIcons(perseveranceKm);

  return (
    <section className="p07-compare" aria-label="How far Oppy and Percy have driven">
      <h2 className="p07-card-title">Oppy and Percy, side by side</h2>
      <div className="p07-compare-row">
        <p className="p07-compare-name">Oppy</p>
        <Strip count={oppy} label={`Oppy: about ${oppy * FIELDS_PER_ICON} football fields`} />
        <p className="p07-compare-note">
          {opportunityKm} km, {opportunityPeriod}
        </p>
      </div>
      <div className="p07-compare-row">
        <p className="p07-compare-name">Percy</p>
        <Strip count={percy} label={`Percy: about ${percy * FIELDS_PER_ICON} football fields`} />
        <p className="p07-compare-note">
          {perseveranceKm} km in {perseveranceMissionAge}, as of {perseveranceAsOf}
        </p>
      </div>
      <p className="p07-compare-key">
        One tile is about {FIELDS_PER_ICON} football fields of {FIELD_LENGTH_M} meters.
      </p>
    </section>
  );
}
