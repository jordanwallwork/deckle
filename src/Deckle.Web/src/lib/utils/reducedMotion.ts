/**
 * Whether the user has requested reduced motion.
 *
 * CSS `@media (prefers-reduced-motion: reduce)` (see app.css) handles the
 * declarative transition/animation motion, but JS-driven motion — the WAAPI
 * shuffle and the JS-gated dice roll in the tabletop — can't be reached by CSS
 * and must check this at runtime. SSR-safe: returns false when there is no
 * `window` (server render), so animations only ever start on the client.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
