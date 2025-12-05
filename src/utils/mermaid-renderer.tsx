import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  content: string;
  config?: Record<string, any>;
  className?: string;
  onClick?: () => void;
}

const Mermaid: React.FC<MermaidProps> = ({
  content,
  config = {},
  className = "",
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Global init (only once)
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    const theme = isDarkMode ? "dark" : "default";
    mermaid.initialize({
      startOnLoad: false,
      theme,
      securityLevel: "strict",
      ...config,
    });
  }, [config]);

  const withThemeHeader = (text: string) => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    const theme = isDarkMode ? "dark" : "default";
    return `%%{init: {"theme": "${theme}"}}%%\n${text}`;
  };

  const renderDiagram = async (graph: string) => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "Rendering diagram...";
    const id = `m-${Math.random().toString(36).slice(2)}`;

    try {
      mermaid.parse(graph); // validate syntax early
      await new Promise((r) => requestAnimationFrame(r)); // ensure attached

      const { svg } = await mermaid.render(id, graph);
      container.innerHTML = svg;
    } catch (err: any) {
      // show friendly inline error, but keep node editable
      container.innerHTML = `
        <div style="
          background:#ffe4e6;
          color:#b91c1c;
          border:1px solid #fda4af;
          border-radius:8px;
          padding:12px;
          font-family:monospace;
          white-space:pre-wrap;
        ">
          Failed to render diagram: ${err?.message || "Unknown syntax error"}
        </div>`;
    }
  };

  // Render when content changes
  useEffect(() => {
    const trimmed = content?.trim();
    if (!trimmed) {
      if (containerRef.current) containerRef.current.innerHTML = "";
      return;
    }
    renderDiagram(withThemeHeader(trimmed));
  }, [content]);

  // Re-render on theme switch
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (content?.trim()) renderDiagram(withThemeHeader(content));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={`mermaid ${className}`}
      onClick={onClick}
      style={{ overflow: "auto", position: "relative" }}
    >
      <style>{`
        .mermaid .error-icon,
        .mermaid .error-text { display: none !important; }
      `}</style>
    </div>
  );
};

export default Mermaid;
