import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  content: string;
  config?: Record<string, any>;
  className?: string;
  onClick?: () => void;
}

const Mermaid: React.FC<MermaidProps> = ({ content, config = {}, className = '', onClick }) => {
  const elRef = useRef<HTMLPreElement>(null);
  const [mermaidString, setMermaidString] = useState<string>('');

  const genSvgId = (): string => {
    const max = 1000000;
    return `mermaid-svg-${genId(max)}${genId(max)}`;

    function genId(max: number): number {
      return Math.floor(Math.random() * max);
    }
  };

  const updateGraph = async (graphDefinition: string) => {
    const id = genSvgId();
    const res = await mermaid.render(id, graphDefinition);
    setMermaidString(res.svg);
  };

  const initializeMermaid = () => {
    if (!elRef.current) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const theme = isDarkMode ? 'dark' : 'default';

    mermaid.initialize({
      startOnLoad: false,
      theme,
      ...config,
    });
  };

  const addThemeToContent = (content: string): string => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const theme = isDarkMode ? 'dark' : 'default';

    return `%%{init: {'theme':'${theme}'}}%%\n${content}`;
  };

  useEffect(() => {
    initializeMermaid();
    if (content) {
      const themedContent = addThemeToContent(content);
      updateGraph(themedContent);
    }
  }, [content]);

  useEffect(() => {
    const handleThemeChange = () => {
      initializeMermaid();
      if (content) {
        const themedContent = addThemeToContent(content);
        updateGraph(themedContent);
      }
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [content]);

  return (
    <pre
      ref={elRef}
      className={`mermaid ${className}`}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: mermaidString }}
    />
  );
};

export default Mermaid;
