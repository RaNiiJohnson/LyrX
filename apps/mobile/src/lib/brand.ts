/**
 * Lyr'X feather in a 64×64 box, feather upright; the second subpath is the
 * shaft. Fill with the `evenodd` rule. Same drawing as `apps/web/src/lib/brand.ts`
 * (kept in step by hand: the web copy also feeds the favicon and sharing card).
 */
export const FEATHER_PATH =
  "M35.4 2.8C41.6 8 43.6 15.6 42.6 23.2L37.2 27.8 42.1 27C41.2 33.2 39.4 37.4 37.4 40.2L33.6 44.2 36.3 43.6C34.8 47 33.2 49.2 31.8 50.6L28.9 61.6C28.7 61.8 28.4 61.7 28.4 61.4L29.3 51.4 28.6 50.2C25.2 46.8 23 42 22.6 36L26.6 37.8 22.9 31.6C23.6 19.6 28 10.4 35.4 2.8Z" +
  "M30.2 50.8Q30.6 30 36.2 9.6Q32.8 29.6 31.3 50.2Z"

export const FEATHER_ROTATION_DEG = 36

/** SVG `transform` that tilts the upright feather around the centre of its box. */
export function featherTransform(scale: number) {
  return `translate(32 32) scale(${scale}) rotate(${FEATHER_ROTATION_DEG}) translate(-32 -32)`
}
