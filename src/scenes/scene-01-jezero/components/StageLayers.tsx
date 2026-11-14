import type { ReactNode } from 'react';
import { AssetImage } from '../../../assets/AssetLoader';

// Cloud positions are percentages of the tall unified sky (space above, warm
// orange Mars sky below), so the clouds ride inside the orange band.
interface CloudLayer {
  id: string;
  className: string;
  left: number;
  top: number;
  width: number;
}

const clouds: CloudLayer[] = [
  { id: 'bg-cloud-1', className: 'stage__cloud--1', left: 5.86, top: 66.5, width: 39.89 },
  { id: 'bg-cloud-2', className: 'stage__cloud--2', left: 32.54, top: 68.5, width: 43.9 },
  { id: 'bg-cloud-3', className: 'stage__cloud--3', left: 56.94, top: 71, width: 43.06 },
];

/**
 * The tall vertical world.
 *
 * Everything lives inside the 260%-tall scroll container: the unified sky on
 * top, and the whole Mars landscape anchored to its bottom. Asset positions
 * are set once and never move — the camera (the scroll's yPercent) is what
 * travels, from the space at the top of the world down to the surface. The
 * ridge and ground layers keep a mirrored copy to the right so the horizontal
 * pan fills the exposed right edge with a seamless (mirror) join. The
 * foreground uses the provided v1 (frame 1) and wide v2 (frame 2) art with a
 * crossfade during the pan.
 *
 * Children (sky events overlay and actors) are passed through so they paint
 * above the sky and clouds but below the z-indexed landscape layers.
 */
export function StageLayers({ children }: { children?: ReactNode }) {
  return (
    <div className="stage__layer stage__layer--sky-scroll" data-sky-scroll>
      <AssetImage assetId="bg-space" alt="" className="sky-scroll__image" />

      <div className="stage__clouds" data-clouds aria-hidden="true">
        {clouds.map((cloud) => (
          <AssetImage
            key={cloud.id}
            assetId={cloud.id}
            alt=""
            className={`stage__cloud ${cloud.className}`}
            style={{
              left: `${cloud.left}%`,
              top: `${cloud.top}%`,
              width: `${cloud.width}%`,
            }}
          />
        ))}
      </div>

      <div className="stage__layer stage__layer--ridge-far" data-layer="far" aria-hidden="true">
        <AssetImage
          assetId="bg-ridge-far"
          alt=""
          className="stage__layer-image stage__layer-image--ridge"
        />
      </div>
      <div
        className="stage__layer stage__layer--ridge-far stage__layer--mirror"
        data-layer="far-dup"
        aria-hidden="true"
      >
        <AssetImage
          assetId="bg-ridge-far"
          alt=""
          className="stage__layer-image stage__layer-image--ridge"
        />
      </div>

      <div className="stage__layer stage__layer--ground" data-layer="fore" aria-hidden="true">
        <AssetImage
          assetId="bg-ground"
          alt=""
          className="stage__layer-image stage__layer-image--ground"
        />
      </div>
      <div
        className="stage__layer stage__layer--ground stage__layer--mirror"
        data-layer="fore-dup"
        aria-hidden="true"
      >
        <AssetImage
          assetId="bg-ground"
          alt=""
          className="stage__layer-image stage__layer-image--ground"
        />
      </div>

      {/* Ridge-near paints in front of the ground (z 4 vs 3), behind the actors. */}
      <div className="stage__layer stage__layer--ridge-near" data-layer="mid" aria-hidden="true">
        <AssetImage
          assetId="bg-ridge-near"
          alt=""
          className="stage__layer-image stage__layer-image--ridge"
        />
      </div>
      <div
        className="stage__layer stage__layer--ridge-near stage__layer--mirror"
        data-layer="mid-dup"
        aria-hidden="true"
      >
        <AssetImage
          assetId="bg-ridge-near"
          alt=""
          className="stage__layer-image stage__layer-image--ridge"
        />
      </div>

      <div className="stage__layer stage__layer--fg" data-fg="v1" aria-hidden="true">
        <AssetImage
          assetId="fg-band"
          alt=""
          className="stage__layer-image stage__layer-image--fg"
        />
      </div>
      <div
        className="stage__layer stage__layer--fg stage__layer--fg-wide"
        data-fg="v2"
        aria-hidden="true"
      >
        <AssetImage
          assetId="fg-band-wide"
          alt=""
          className="stage__layer-image stage__layer-image--fg"
        />
      </div>

      {/* Sky events stay viewport-anchored inside the world (the timeline
          counter-translates them); actors ride the world bottom. */}
      {children}
    </div>
  );
}
