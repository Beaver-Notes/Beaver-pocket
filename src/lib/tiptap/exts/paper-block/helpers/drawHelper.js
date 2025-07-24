// drawHelper.js
import * as d3 from "d3";

/**
 * Returns the average of two numbers.
 *
 * @param {number} a - First number.
 * @param {number} b - Second number.
 * @returns {number} The average of a and b.
 */
export const average = (a, b) => (a + b) / 2;

/**
 * Generates an SVG path string from an array of points using cubic Bezier curves.
 * Approximates a Catmull-Rom spline.
 *
 * @param {Array<[number, number]>} points - Array of [x, y] points.
 * @returns {string} SVG path string.
 */
export function getSvgPathFromStroke(points) {
  if (!points.length) return "";

  let path = `M${points[0][0]},${points[0][1]}`;

  // Use Catmull-Rom to Bezier conversion for smooth curves.
  for (let i = 1; i < points.length - 2; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = points[i + 2];

    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;

    path += ` C${cp1x},${cp1y},${cp2x},${cp2y},${x2},${y2}`;
  }

  return path;
}

/**
 * Converts a pointer or mouse event to SVG coordinates relative to the SVG element.
 *
 * @param {MouseEvent | PointerEvent} event - Pointer or mouse event.
 * @param {SVGSVGElement} svgElement - Target SVG element.
 * @returns {[number, number]} Coordinates in SVG space.
 */
export const getPointerCoordinates = (event, svgElement) => {
  const svg = svgElement;
  const point = svg.createSVGPoint();

  point.x = event.clientX;
  point.y = event.clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) return [point.x, point.y];

  const transformedPoint = point.matrixTransform(ctm.inverse());

  return [transformedPoint.x, transformedPoint.y];
};

/**
 * Inserts interpolated points between existing ones to ensure no gap exceeds a given threshold.
 *
 * @param {Array<[number, number]>} points - Original array of points.
 * @param {number} [threshold=10] - Maximum allowed distance between consecutive points.
 * @returns {Array<[number, number]>} Array with interpolated points.
 */
export function interpolatePoints(points, threshold = 10) {
  if (!points || points.length < 2) return points;

  const result = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);

    if (dist === 0) continue; // Skip overlapping points

    const steps = Math.floor(dist / threshold);
    const stepFraction = threshold / dist;

    for (let j = 1; j <= steps; j++) {
      const t = j * stepFraction;
      result.push([x1 + dx * t, y1 + dy * t]);
    }

    result.push([x2, y2]);
  }

  return result;
}

/**
 * Maps a value from one range to another, with optional clamping.
 *
 * @param {number} value - Value to map.
 * @param {[number, number]} rangeA - Source range [min, max].
 * @param {[number, number]} rangeB - Target range [min, max].
 * @param {boolean} [clamp=false] - Whether to clamp the result within the target range.
 * @returns {number} Mapped value.
 */
export function modulate(value, rangeA, rangeB, clamp = false) {
  const [fromLow, fromHigh] = rangeA;
  const [toLow, toHigh] = rangeB;

  if (fromHigh === fromLow) return toLow;

  const ratio = (value - fromLow) / (fromHigh - fromLow);
  const result = toLow + ratio * (toHigh - toLow);

  if (!clamp) return result;

  return toLow < toHigh
    ? Math.min(Math.max(result, toLow), toHigh)
    : Math.min(Math.max(result, toHigh), toLow);
}

/**
 * Returns stroke options based on the given size setting.
 *
 * @param {{ size: number }} settings - Stroke settings.
 * @returns {object} Stroke options object.
 */
export const getStrokeOptions = (settings) => ({
  size: settings.size,
  thinning: 0,
  streamline: modulate(settings.size, [9, 16], [0.64, 0.74], true),
  smoothing: 0.62,
  simulatePressure: false,
  easing: (t) => t,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
});

/**
 * Converts legacy line objects (with paths) into a standardized format with explicit points.
 *
 * @param {Array} lines - Array of legacy line objects.
 * @returns {Array} Converted line objects with points array.
 */
export const convertLegacyLines = (lines) => {
  if (!lines || lines.length === 0) return [];

  return lines.map((line) => {
    if (Array.isArray(line.points)) return line;

    if (line.path || line.d) {
      const pathString = line.path || line.d;
      const points = extractPointsFromPath(pathString);

      return {
        points,
        tool: line.tool || "pen",
        color: line.color || "#000000",
        size: line.size || 2,
        path: pathString,
        d: pathString,
      };
    }

    return {
      points: line.points || [],
      tool: line.tool || "pen",
      color: line.color || "#000000",
      size: line.size || 2,
    };
  });
};

/**
 * Extracts coordinate pairs from an SVG path string.
 *
 * @param {string} pathString - SVG path data string.
 * @returns {Array<[number, number]>} Array of [x, y] points.
 */
export const extractPointsFromPath = (pathString) => {
  if (!pathString) return [];

  const matches = pathString.match(/-?\d*\.?\d+/g);
  const points = [];

  if (matches) {
    for (let i = 0; i < matches.length - 1; i += 2) {
      points.push([parseFloat(matches[i]), parseFloat(matches[i + 1])]);
    }
  }

  return points;
};

/**
 * Converts standardized line objects back to legacy format using SVG path strings.
 *
 * @param {Array} lines - Array of line objects.
 * @returns {Array} Legacy-formatted line objects.
 */
export const convertToLegacyFormat = (lines) =>
  lines.map((line) => {
    const legacyLine = {
      tool: line.tool,
      color: line.color,
      size: line.size,
      points: line.points,
    };

    if (line.points && line.points.length > 0) {
      const lineGenerator = d3
        .line()
        .x((d) => d[0])
        .y((d) => d[1])
        .curve(d3.curveBasis);

      legacyLine.path = lineGenerator(line.points);
      legacyLine.d = legacyLine.path;
    }

    return legacyLine;
  });

/**
 * Calculates the bounding box of a line based on its points.
 *
 * @param {{ points: Array<[number, number]> }} line - Line object.
 * @returns {{ x: number, y: number, width: number, height: number }} Bounding box.
 */
export const getLineBounds = (line) => {
  const points = line.points;
  if (!points || points.length === 0)
    return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

/**
 * Transforms points by moving or scaling them to match a new bounding box.
 *
 * @param {Array<[number, number]>} points - Points to transform.
 * @param {{ x: number, y: number, width: number, height: number }} originalBounds - Original bounds.
 * @param {{ x: number, y: number, width: number, height: number }} newBounds - New bounds.
 * @param {"move" | "scale"} transformType - Type of transformation.
 * @returns {Array<[number, number]>} Transformed points.
 */
export const transformPoints = (
  points,
  originalBounds,
  newBounds,
  transformType
) => {
  if (!points || points.length === 0) return points;

  if (transformType === "move") {
    const dx = newBounds.x - originalBounds.x;
    const dy = newBounds.y - originalBounds.y;
    return points.map(([px, py]) => [px + dx, py + dy]);
  }

  const scaleX =
    originalBounds.width !== 0 ? newBounds.width / originalBounds.width : 1;
  const scaleY =
    originalBounds.height !== 0 ? newBounds.height / originalBounds.height : 1;

  return points.map(([px, py]) => {
    const relativeX =
      originalBounds.width !== 0
        ? (px - originalBounds.x) / originalBounds.width
        : 0;
    const relativeY =
      originalBounds.height !== 0
        ? (py - originalBounds.y) / originalBounds.height
        : 0;

    return [
      newBounds.x + relativeX * newBounds.width,
      newBounds.y + relativeY * newBounds.height,
    ];
  });
};

/**
 * Determines if a pointer event is valid for drawing.
 *
 * @param {PointerEvent} e - Pointer event.
 * @returns {boolean} True if the input is from pen, mouse, or touch.
 */
export const isPenInput = (e) => {
  return (
    e.pointerType === "pen" ||
    e.pointerType === "mouse" ||
    e.pointerType === "touch"
  );
};

const MOVEMENT_THRESHOLD = 2;
let lastTouch = { x: null, y: null };

/**
 * Determines whether a touch input is likely a palm touch and should be ignored.
 *
 * @param {PointerEvent} e - Pointer event.
 * @param {SVGSVGElement} svg - Target SVG element.
 * @param {boolean} hasStarted - Whether drawing has already started.
 * @returns {boolean} True if touch should be ignored.
 */
export const isPalmTouch = (e, svg, hasStarted) => {
  const PALM_MIN_SIZE = 50;
  const PALM_MAX_PRESSURE = 0.1;

  if (e.pointerType !== "touch" || hasStarted) return false;

  const width = e.width ?? 0;
  const height = e.height ?? 0;
  const pressure = typeof e.pressure === "number" ? e.pressure : null;

  const isLargeTouch = width >= PALM_MIN_SIZE || height >= PALM_MIN_SIZE;
  const isLowPressure =
    pressure !== null ? pressure <= PALM_MAX_PRESSURE : true;
  const moved = hasMoved(e);

  const shouldIgnore =
    isLargeTouch && isLowPressure && !moved && isInsideSVG(e, svg);

  return shouldIgnore;
};

function hasMoved(e) {
  const dx = Math.abs((e.clientX ?? 0) - (lastTouch.x ?? 0));
  const dy = Math.abs((e.clientY ?? 0) - (lastTouch.y ?? 0));
  const moved = dx > MOVEMENT_THRESHOLD || dy > MOVEMENT_THRESHOLD;
  lastTouch = { x: e.clientX, y: e.clientY };
  return moved;
}

/**
 * Checks if a pointer event occurred within or near the SVG element.
 *
 * @param {PointerEvent} e - Pointer event.
 * @param {SVGSVGElement} svg - Target SVG element.
 * @returns {boolean} True if inside or near the SVG canvas.
 */
const isInsideSVG = (e, svg) => {
  const buffer = 20;
  const rect = svg.getBoundingClientRect();

  const inside =
    e.clientX >= rect.left - buffer &&
    e.clientX <= rect.right + buffer &&
    e.clientY >= rect.top - buffer &&
    e.clientY <= rect.bottom + buffer;

  return inside;
};

/**
 * Returns the settings object for the currently selected tool.
 *
 * @param {string} tool - Tool name ("pen", "eraser", or "highlighter").
 * @param {object} penSettings - Settings for pen tool.
 * @param {object} eraserSettings - Settings for eraser tool.
 * @param {object} highlighterSettings - Settings for highlighter tool.
 * @returns {object} Settings for the selected tool.
 */
export const getToolSettings = (
  tool,
  penSettings,
  eraserSettings,
  highlighterSettings
) => {
  switch (tool) {
    case "pen":
      return penSettings;
    case "eraser":
      return eraserSettings;
    case "highlighter":
      return highlighterSettings;
    default:
      return penSettings;
  }
};

/**
 * Prevents touch scrolling on the drawing canvas.
 *
 * @param {TouchEvent} event - Touch event.
 * @param {SVGSVGElement} svgElement - SVG canvas element.
 * @returns {boolean|void} True if multi-touch is detected, otherwise prevents default scroll.
 */
export const preventTouchScroll = (event, svgElement) => {
  if (event.touches && event.touches.length > 1) {
    return true;
  }

  if (
    svgElement &&
    (event.target === svgElement || svgElement.contains(event.target))
  ) {
    event.preventDefault();
  }
};
