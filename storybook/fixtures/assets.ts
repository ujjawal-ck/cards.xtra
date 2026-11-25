/**
 * Bundled image URLs for fixtures. Under Vite, `images.*` (a Metro require in
 * src/assets/images) becomes a same-origin URL string, so fixtures that use
 * these load no remote image.
 */
import { images } from '../../src/assets/images';

/** URL string of a bundled image ('' when it is not a URL, e.g. under Metro). */
export function assetUri(src: unknown): string {
  if (typeof src === 'string') return src;
  if (src && typeof src === 'object' && 'uri' in src) return String((src as { uri: unknown }).uri ?? '');
  if (src && typeof src === 'object' && 'default' in src) return assetUri((src as { default: unknown }).default);
  return '';
}

export { images };
