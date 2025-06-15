import { useMemo, useCallback } from "react";

export const renderedPaths = (
  lines,
  width,
  height,
  getStroke,
  getStrokeOptions,
  getSvgPathFromStroke
) => {
  const paths = useMemo(() => {
    return lines.map((line, lineIndex) => {
      const stroke = getStroke(line.points, getStrokeOptions(line));
      const pathData = getSvgPathFromStroke(stroke);

      return (
        <path
          key={line.id || `line-${lineIndex}`}
          d={pathData}
          fill={line.color}
          stroke="none"
          strokeWidth="0"
          opacity={line.tool === "highlighter" ? 0.4 : 1}
        />
      );
    });
  }, [lines, getStroke, getStrokeOptions, getSvgPathFromStroke]);

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
