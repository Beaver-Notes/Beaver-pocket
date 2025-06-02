import { lineRadial } from "d3";
import getStroke from "perfect-freehand";

export const average = (a, b) => (a + b) / 2;

export function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return ""

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ["M", ...stroke[0], "Q"]
  )

  d.push("Z")
  return d.join(" ")
}


export const getPointerCoordinates = (event, svgRef) => {
  const svg = svgRef.current;
  const point = svg.createSVGPoint();

  point.x = event.clientX;
  point.y = event.clientY;

  const transformedPoint = point.matrixTransform(svg.getScreenCTM().inverse());

  return [transformedPoint.x, transformedPoint.y];
};

export const getStrokeOptions = (settings) => ({
  size: settings.size,
  thinning: 0.5, // Increase thinning to capture more details
  smoothing: 0.5, // Decrease smoothing for sharper corners
  streamline: 0.5,
  easing: (t) => t,
  simulatePressure: false, // Enable pressure simulation if supported
  last: true,
  start: {
    cap: true,
    taper: 0,
    easing: (t) => Math.sin((t * Math.PI) / 2),
  },
  end: {
    cap: true,
    taper: 0,
    easing: (t) => Math.sin((t * Math.PI) / 2),
  },
});
