import { useEffect, useState } from 'react';
import { assetManifest, type AssetEntry } from './manifest';

export type AssetLoadStatus = 'loading' | 'loaded' | 'error';

function initialStatus(entry: AssetEntry | undefined): AssetLoadStatus {
  if (!entry) {
    return 'error';
  }
  if (entry.type !== 'image') {
    return entry.path ? 'loaded' : 'error';
  }
  return 'loading';
}

export function useAssetStatus(assetId: string): AssetLoadStatus {
  const entry = assetManifest[assetId];
  const [state, setState] = useState<{ assetId: string; status: AssetLoadStatus }>(() => ({
    assetId,
    status: initialStatus(entry),
  }));

  const status = state.assetId === assetId ? state.status : initialStatus(entry);

  useEffect(() => {
    if (!entry) {
      console.warn(`[assets] Unknown asset id: ${assetId}`);
      return;
    }

    if (entry.type !== 'image') {
      return;
    }

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (!cancelled) {
        setState({ assetId, status: 'loaded' });
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        console.warn(`[assets] Missing asset: ${entry.id} (${entry.path || 'no path'})`);
        setState({ assetId, status: 'error' });
      }
    };

    image.src = entry.path;

    return () => {
      cancelled = true;
    };
  }, [assetId, entry]);

  return status;
}
