import { AssetImage } from '../../../assets/AssetLoader';
import { PREVIOUS_ROVERS } from '../rovers';

/** Scrapbook cards for the earlier rovers: names only (see rovers.ts). */

interface RoverCardsProps {
  /** How many cards have been revealed (0..4), in narration order. */
  shown: number;
  /** The whole row fades out when the narration moves on. */
  visible: boolean;
}

export function RoverCards({ shown, visible }: RoverCardsProps) {
  const latest = shown > 0 ? PREVIOUS_ROVERS[shown - 1].name : '';

  return (
    <section
      className="p03-cards"
      data-visible={visible}
      aria-label="Rovers that explored Mars before Percy"
    >
      <ul className="p03-cards__list">
        {PREVIOUS_ROVERS.map((rover, index) => (
          <li
            key={rover.id}
            className="p03-card"
            data-rover={rover.id}
            data-shown={index < shown}
          >
            <AssetImage assetId={rover.asset} alt="" className="p03-card__picture" />
            <span className="p03-card__name">{rover.name}</span>
          </li>
        ))}
      </ul>
      {/* One polite announcement per new card, not one per card on screen. */}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {latest ? `${latest} joins the list of earlier rovers.` : ''}
      </p>
    </section>
  );
}
