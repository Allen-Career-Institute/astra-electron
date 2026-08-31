// Compile-time build flags.
//
// webpack's DefinePlugin substitutes these literals at build time (see
// webpack.config.js), which lets the minifier drop the guarded code from the
// bundle entirely. `yarn dev` runs through tsc only, where the globals do not
// exist — hence the typeof guards and the permissive dev default.

declare const __URL_OVERRIDE_ENABLED__: boolean;

/**
 * Whether this build ships the runtime URL override (Settings → Change App
 * URL). False for production releases.
 */
export const URL_OVERRIDE_BUILD_ENABLED: boolean =
  typeof __URL_OVERRIDE_ENABLED__ !== 'undefined'
    ? __URL_OVERRIDE_ENABLED__
    : true;
