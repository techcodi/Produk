/** 2D affine matrix [a, b, c, d, e, f], as in PDF and PDF.js. */
export type Matrix = number[];

export function multiply(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

export function invert(m: Matrix): Matrix {
  const det = m[0] * m[3] - m[1] * m[2];
  if (det === 0) throw new Error("Matrix is not invertible");
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
}

export const applyToPoint = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/**
 * Maps viewport space (how the page is shown) to PDF user space (what pdf-lib
 * draws in). Besides the point, returns the angle, in degrees anticlockwise,
 * that "rightwards on screen" has in user space — the `rotate` to give pdf-lib
 * so text and images stay upright on rotated pages.
 */
export function viewportToPdf(viewportTransform: Matrix) {
  const inverse = invert(viewportTransform);
  const angle = (Math.atan2(inverse[1], inverse[0]) * 180) / Math.PI;
  return {
    point: (x: number, y: number) => applyToPoint(inverse, x, y),
    angle: Math.round(angle * 1000) / 1000,
  };
}
