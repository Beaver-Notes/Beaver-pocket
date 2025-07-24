// renderHelper.jsx
import { useMemo } from "react";
import { interpolatePoints } from "./drawHelper";

export const renderHelper = (
  lines,
  width,
  height,
  getStroke,
  getStrokeOptions,
  getSvgPathFromStroke,
  getSettings,
  eraserSettings
) => {
  const paths = useMemo(() => {
    return lines.map((line, lineIndex) => {
      const settings = getSettings?.(line) || line;

      if (line.tool === "eraser") {
        const shortStroke = line.points.slice(-5);
        const shortPathData = shortStroke
          .map((point, index) =>
            index === 0
              ? `M ${point[0]},${point[1]}`
              : `L ${point[0]},${point[1]}`
          )
          .join(" ");

        return (
          <path
            key={line.id || `line-${lineIndex}`}
            d={shortPathData}
            fill="none"
            stroke="rgba(150, 150, 150, 0.8)"
            strokeWidth={eraserSettings?.size || 10}
            strokeLinecap="round"
            style={{ pointerEvents: "none" }}
          />
        );
      }

      const interpolatedPoints = interpolatePoints(line.points, {
        smoothness: 0.7,
      });
      const stroke = getStroke(interpolatedPoints, getStrokeOptions(settings));
      const pathData = getSvgPathFromStroke(stroke);

      return (
        <path
          key={line.id || `line-${lineIndex}`}
          d={pathData}
          fill={settings.color || line.color}
          stroke="none"
          strokeWidth="0"
          opacity={line.tool === "highlighter" ? 0.4 : 1}
          style={{ pointerEvents: "none" }}
        />
      );
    });
  }, [
    lines,
    getStroke,
    getStrokeOptions,
    getSvgPathFromStroke,
    getSettings,
    eraserSettings,
  ]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {paths}
    </svg>
  );
};

export const renderCurrentStroke = ({
  isDrawing,
  currentPoints,
  tool,
  getStroke,
  getStrokeOptions,
  getSettings,
  getSvgPathFromStroke,
  eraserSettings,
}) => {
  if (!isDrawing || currentPoints.length <= 1) return null;

  const settings = getSettings();

  if (tool === "eraser") {
    const shortStroke = currentPoints.slice(-5);
    const shortPathData = shortStroke
      .map((point, index) =>
        index === 0 ? `M ${point[0]},${point[1]}` : `L ${point[0]},${point[1]}`
      )
      .join(" ");

    return (
      <path
        d={shortPathData}
        fill="none"
        stroke="rgba(150, 150, 150, 0.8)"
        strokeWidth={eraserSettings.size}
        strokeLinecap="round"
      />
    );
  }

  const interpolatedPoints = interpolatePoints(currentPoints, {
    smoothness: 0.7,
  });
  const stroke = getStroke(interpolatedPoints, getStrokeOptions(settings));
  const pathData = getSvgPathFromStroke(stroke);

  return (
    <path
      d={pathData}
      fill={settings.color}
      stroke="none"
      strokeWidth="0"
      opacity={tool === "highlighter" ? 0.4 : 1}
    />
  );
};
