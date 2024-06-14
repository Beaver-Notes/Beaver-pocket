import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import type { MermaidConfig } from "mermaid";

interface MermaidProps {
  content: string;
  config?: MermaidConfig;
  className?: string;
  onClick?: () => void;
}

const MermaidComponent: React.FC<MermaidProps> = ({
  content,
  config,
  className,
  onClick,
}) => {
  const elRef = useRef<HTMLPreElement>(null);
  const [mermaidString, setMermaidString] = useState<string>("");

  function genSvgId(): string {
    const max = 1000000;
    return `mermaid-svg-${genId(max)}${genId(max)}`;

    function genId(max: number): number {
      return Math.floor(Math.random() * max);
    }
  }

  async function updateGraph(graphDefinition: string) {
    const id = genSvgId();
    const res = await mermaid.render(
      id,
      graphDefinition,
      elRef.current || undefined
    );
    setMermaidString(res.svg);
  }

  useEffect(() => {
    if (!elRef.current) return;

    if (config) {
      mermaid.initialize({ startOnLoad: false, ...config });
    } else {
      mermaid.initialize({ startOnLoad: false });
    }
  }, [config]);

  useEffect(() => {
    if (!elRef.current) return;

    if (content) {
      updateGraph(content);
    }
  }, [content]);

  useEffect(() => {
    if (elRef.current) {
      const svgElement = elRef.current.querySelector("svg");
      if (svgElement) {
        const isDarkMode = document.documentElement.classList.contains("dark");
        const textColor = isDarkMode ? "#FFFFFF" : "#000000";
        const borderColor = isDarkMode ? "#FFFFFF" : "#333"; // Adjusted border color for dark and light modes
        const fillColor = isDarkMode ? "#FFFFFF" : "#FFFFFF"; // Adjusted fill color for dark and light modes
        const arrowStrokeColor = isDarkMode ? "#FFFFFF" : "#000000"; // Adjusted arrow stroke color for dark and light modes

        // Update text color
        svgElement.querySelectorAll("text").forEach((text) => {
          text.style.fill = textColor;
        });

        // Update borders and fills
        svgElement.querySelectorAll("rect, circle, path").forEach((shape) => {
          // @ts-expect-error
          shape.style.stroke = borderColor;
        });

        // Specific adjustments for arrows in sequence diagrams
        svgElement.querySelectorAll("path").forEach((path) => {
          // Handle arrow heads
          if (path.getAttribute("marker-end") === "url(#arrowhead)") {
            path.style.stroke = arrowStrokeColor;
          } else {
            // Handle other paths (arrows, etc.)
            path.style.stroke = borderColor;
          }
        });

        // Additional specific adjustments for other elements if needed
        svgElement.querySelectorAll("line").forEach((line) => {
          line.style.stroke = borderColor;
        });

        svgElement.querySelectorAll(".actor-man circle").forEach((circle) => {
           // @ts-expect-error
          circle.style.stroke = borderColor;
           // @ts-expect-error
          circle.style.fill = fillColor;
        });
      }
    }
  }, [mermaidString]);

  return (
    <pre
      ref={elRef}
      className={`mermaid ${className}`}
      dangerouslySetInnerHTML={{ __html: mermaidString }}
      onClick={onClick}
    />
  );
};

export default MermaidComponent;
