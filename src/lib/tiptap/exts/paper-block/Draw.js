export const average = (a, b) => (a + b) / 2;

export const getSvgPathFromStroke = (points, closed = true) => {
  const len = points.length;

  if (len < 4) {
    return ``;
  }

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1]
  ).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
      2
    )} `;
  }

  if (closed) {
    result += "Z";
  }

  return result;
};

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
  thinning: 0.6, // Increase thinning to capture more details
  smoothing: 0.4, // Decrease smoothing for sharper corners
  streamline: 0.5,
  easing: (t) => Math.sin((t * Math.PI) / 2),
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
