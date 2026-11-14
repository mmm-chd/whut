import percyPortraitUrl from '../../assets/fixed/p02/percy.png';
import ginnyPortraitUrl from '../../assets/fixed/p02/ingenuity.png';
import perseveranceModelUrl from '../../assets/3d-models/25042_Perseverance.glb?url';
import ingenuityModelUrl from '../../assets/3d-models/Ingenuity Mars Helicopter.glb?url';
import rocketCutoutUrl from '../../assets/drafts/home/home-rocket.svg';
import flameCutoutUrl from '../../assets/drafts/home/home-flame.svg';

/** Backdrop textures uploaded before the book stage fades in. */
export const bookWorldTextureIds: readonly string[] = ['book-planet', 'home-moon'];

/** Character cutouts (scrapbook polaroids and preview fallbacks). */
export const CHARACTER_PORTRAITS = {
  percy: percyPortraitUrl,
  ginny: ginnyPortraitUrl,
} as const;

/** Character models for the passive preview and the 3D inspector. */
export const CHARACTER_MODELS = {
  perseverance: perseveranceModelUrl,
  ingenuity: ingenuityModelUrl,
} as const;

/** The paper rocket that flies away during the book reveal. */
export const BOOK_ROCKET_URL = rocketCutoutUrl;
export const BOOK_FLAME_URL = flameCutoutUrl;
