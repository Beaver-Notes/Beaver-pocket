import React, { useState, useRef, useEffect, useCallback } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import MermaidComponent from "../../../../utils/mermaid-renderer"; // Assuming you have this component from the previous conversion

const MermaidNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const [mermaidContent, setMermaidContent] = useState(node.attrs.content || "");
  const [showTextarea, setShowTextarea] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastKeyDownTime = useRef<number | null>(null);

  const updateContent = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const { value } = event.target;
      updateAttributes({ content: value });
      setMermaidContent(value);
    },
    [updateAttributes]
  );

  const openTextarea = useCallback(() => {
    setShowTextarea(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const closeTextarea = useCallback(() => {
    setShowTextarea(false);
  }, []);

  useEffect(() => {
    setMermaidContent(node.attrs.content || "");
  }, [node.attrs.content]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const currentTime = new Date().getTime();
    
    if (event.key === "Enter") {
      if (lastKeyDownTime.current && currentTime - (lastKeyDownTime.current) < 500) {
        closeTextarea();
      }
      lastKeyDownTime.current = currentTime;
    }
  }, [closeTextarea]);

  return (
    <NodeViewWrapper>
      <div>
        <MermaidComponent
          className={node.attrs.selected ? "dark:text-purple-400 text-purple-500" : ""}
          content={mermaidContent}
          onClick={openTextarea}
        />
        {showTextarea && (
          <div className="bg-input transition rounded-lg mt-2 p-2">
            <textarea
              ref={inputRef}
              value={mermaidContent}
              placeholder="Enter Mermaid code here..."
              className="bg-transparent w-full outline-none"
              onChange={updateContent}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default MermaidNodeView;
