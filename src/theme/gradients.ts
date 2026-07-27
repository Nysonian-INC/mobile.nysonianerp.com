/** Stable gradient endpoints — avoid allocating new objects every render. */
export const GRADIENT_TL = { x: 0, y: 0 } as const;
export const GRADIENT_BR = { x: 1, y: 1 } as const;
export const GRADIENT_TOP = { x: 0, y: 0 } as const;
export const GRADIENT_BOTTOM = { x: 0, y: 1 } as const;
