import type { CSSProperties } from 'react';
import { assetManifest } from './manifest';
import { useAssetStatus } from './useAssetStatus';

interface AssetImageProps {
  assetId: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
}

export function AssetImage({ assetId, alt, className, style }: AssetImageProps) {
  const entry = assetManifest[assetId];
  const status = useAssetStatus(assetId);

  if (!entry || status === 'error') {
    return (
      <div
        className={className}
        style={style}
        role="img"
        aria-label={`${alt} (placeholder)`}
        data-placeholder={assetId}
      >
        PLACEHOLDER: {assetId}
      </div>
    );
  }

  return <img className={className} style={style} src={entry.path} alt={alt} />;
}
