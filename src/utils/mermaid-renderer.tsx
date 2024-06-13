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

  /**
   * generate svg id
   */
  function genSvgId(): string {
    const max = 1000000;
    return `mermaid-svg-${genId(max)}${genId(max)}`;

    function genId(max: number): number {
      return Math.floor(Math.random() * max);
    }
  }

  /**
   * update graph
   * @param graphDefinition - mermaid graph definition
   */
  async function updateGraph(graphDefinition: string) {
    const id = genSvgId();
    const res = await mermaid.render(
      id,
      graphDefinition,
      elRef.current || undefined
    );
    setMermaidString(res.svg);
  }

  // Initialize mermaid
  useEffect(() => {
    if (!elRef.current) return;

    if (config) {
      mermaid.initialize({ startOnLoad: false, ...config });
    } else {
      mermaid.initialize({ startOnLoad: false });
    }
  }, [config]);

  // Update graph
  useEffect(() => {
    if (!elRef.current) return;

    if (content) {
      updateGraph(content);
    }
  }, [content]);

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
