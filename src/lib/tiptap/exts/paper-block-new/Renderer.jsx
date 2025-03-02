import { useMemo } from "react";

export const renderedPaths = (
  lines,
  width,
  height,
  getStroke,
  getStrokeOptions,
  getSvgPathFromStroke
) => {
  return useMemo(() => {
    return lines.map((line, lineIndex) => {
      const stroke = getStroke(line.points, getStrokeOptions(line));
      const pathData = getSvgPathFromStroke(stroke);

      return (
        <svg
          key={`line-${lineIndex}`}
          viewBox={`0 0 ${width} ${height}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        >
          <path
            d={pathData}
            fill={line.color}
            stroke="none"
            strokeWidth="0"
            opacity={line.tool === "highlighter" ? 0.4 : 1}
          />
        </svg>
      );
    });
  }, [lines, width, height, getStroke, getStrokeOptions, getSvgPathFromStroke]);
};

export const renderSelectionOverlay = (
  selectedElement,
  handleTransformStart
) => {
  if (!selectedElement) return null;

  const { x, y, width, height } = selectedElement.bounds;

  const handleControlPointerDown = (e, corner) => {
    e.stopPropagation();
    handleTransformStart(e, corner);
  };

  return (
    <g className="selection-overlay">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        className="fill-secondary opacity-10 stoke-primary"
        strokeWidth="1"
        strokeDasharray="4 4"
        pointerEvents="all"
        style={{ cursor: "move" }}
      />
      {["nw", "ne", "se", "sw"].map((corner) => (
        <circle
          key={corner}
          cx={x + (corner.includes("e") ? width : 0)}
          cy={y + (corner.includes("s") ? height : 0)}
          r="4"
          fill="white"
          className="fill-secondary opacity-60 stoke-primary"
          strokeWidth="1"
          pointerEvents="all"
          onPointerDown={(e) => handleControlPointerDown(e, corner)}
          style={{ cursor: `${corner}-resize` }}
        />
      ))}
    </g>
  );
};
