import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NearestFilter,
  RGBAFormat,
  Texture,
  TextureLoader,
  UnsignedByteType,
} from 'three';
import { assetManifest } from '../assets/manifest';

export interface LoadedTexture {
  texture: Texture;
  width: number;
  height: number;
  placeholder: boolean;
}

/** Magenta/black checker: the WebGL twin of the DOM `PLACEHOLDER` box. */
function createPlaceholder(): LoadedTexture {
  const data = new Uint8Array([
    255, 0, 255, 255, 20, 20, 20, 255, 20, 20, 20, 255, 255, 0, 255, 255,
  ]);
  const texture = new DataTexture(data, 2, 2, RGBAFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.needsUpdate = true;
  return { texture, width: 2, height: 2, placeholder: true };
}

/**
 * Owns every texture one WebGL stage uploads. Created per stage and disposed
 * with it, so a scene swap releases its GPU memory.
 */
export class TextureCache {
  private readonly loader = new TextureLoader();
  private readonly loaded = new Map<string, LoadedTexture>();
  private readonly pending = new Map<string, Promise<LoadedTexture>>();
  private placeholder: LoadedTexture | null = null;
  private disposed = false;

  constructor(private readonly maxAnisotropy = 8) {}

  peek(assetId: string): LoadedTexture | null {
    return this.loaded.get(assetId) ?? null;
  }

  private fallback(assetId: string, reason: string): LoadedTexture {
    console.warn(`[webgl] ${reason}: ${assetId}`);
    this.placeholder ??= createPlaceholder();
    this.loaded.set(assetId, this.placeholder);
    return this.placeholder;
  }

  load(assetId: string): Promise<LoadedTexture> {
    const existing = this.loaded.get(assetId);
    if (existing) {
      return Promise.resolve(existing);
    }
    const inFlight = this.pending.get(assetId);
    if (inFlight) {
      return inFlight;
    }

    const entry = assetManifest[assetId];
    if (!entry || entry.type !== 'image' || !entry.path) {
      return Promise.resolve(this.fallback(assetId, 'Unknown image asset'));
    }

    const promise = new Promise<LoadedTexture>((resolve) => {
      this.loader.load(
        entry.path,
        (texture) => {
          if (this.disposed) {
            texture.dispose();
            resolve(createPlaceholder());
            return;
          }
          // Premultiplied upload avoids dark fringes on mipmapped alpha edges;
          // the sprite shader blends with (ONE, 1 - alpha) to match.
          texture.premultiplyAlpha = true;
          texture.generateMipmaps = true;
          texture.minFilter = LinearMipmapLinearFilter;
          texture.magFilter = LinearFilter;
          texture.anisotropy = this.maxAnisotropy;
          // Colour space stays "none": raw sRGB values pass straight through
          // (no hardware decode), so blending matches what <img> did.
          const image = texture.image as { width: number; height: number };
          const result: LoadedTexture = {
            texture,
            width: image.width,
            height: image.height,
            placeholder: false,
          };
          this.loaded.set(assetId, result);
          this.pending.delete(assetId);
          resolve(result);
        },
        undefined,
        () => {
          this.pending.delete(assetId);
          resolve(this.fallback(assetId, `Failed to load ${entry.path}`));
        },
      );
    });
    this.pending.set(assetId, promise);
    return promise;
  }

  preload(assetIds: readonly string[]): Promise<void> {
    // Scene asset lists also name fonts and audio; only images become textures.
    const images = assetIds.filter((id) => assetManifest[id]?.type === 'image');
    return Promise.all(images.map((id) => this.load(id))).then(() => undefined);
  }

  dispose(): void {
    this.disposed = true;
    const seen = new Set<Texture>();
    for (const item of this.loaded.values()) {
      if (!seen.has(item.texture)) {
        seen.add(item.texture);
        item.texture.dispose();
      }
    }
    this.loaded.clear();
    this.pending.clear();
  }
}

const TextureCacheContext = createContext<TextureCache | null>(null);

export function TextureCacheProvider({
  maxAnisotropy,
  preload,
  onReady,
  children,
}: {
  maxAnisotropy: number;
  preload?: readonly string[];
  onReady?: () => void;
  children: ReactNode;
}) {
  const cache = useMemo(() => new TextureCache(maxAnisotropy), [maxAnisotropy]);

  useEffect(() => {
    let cancelled = false;
    // A stalled asset must not hold the stage forever: reveal after 4 s and
    // let late textures pop in (missing ones already show the placeholder).
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        onReady?.();
      }
    }, 4000);
    void cache.preload(preload ?? []).then(() => {
      if (!cancelled) {
        window.clearTimeout(timer);
        onReady?.();
      }
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cache.dispose();
    };
    // The preload list is fixed for a scene; only a new cache restarts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache]);

  return <TextureCacheContext.Provider value={cache}>{children}</TextureCacheContext.Provider>;
}

export function useTextureCache(): TextureCache {
  const cache = useContext(TextureCacheContext);
  if (!cache) {
    throw new Error('useTextureCache must be used inside <WebGLStage>');
  }
  return cache;
}

/** Texture for a manifest image ID; null until it has loaded. */
export function useAssetTexture(assetId: string): LoadedTexture | null {
  const cache = useTextureCache();
  const [state, setState] = useState<{ cache: TextureCache; id: string; value: LoadedTexture | null }>(
    () => ({ cache, id: assetId, value: cache.peek(assetId) }),
  );

  useEffect(() => {
    let cancelled = false;
    void cache.load(assetId).then((value) => {
      if (!cancelled) {
        setState({ cache, id: assetId, value });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cache, assetId]);

  if (state.cache === cache && state.id === assetId) {
    return state.value;
  }
  return cache.peek(assetId);
}
