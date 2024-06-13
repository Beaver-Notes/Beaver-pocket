import React, { useState, useRef, useEffect, useCallback } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import MermaidComponent from "../../../../utils/mermaid-renderer"; // Assuming you have this component from the previous conversion

const MermaidNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const [mermaidContent, setMermaidContent] = useState(
    node.attrs.content || ""
  );
  const [showTextarea, setShowTextarea] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <NodeViewWrapper>
      <div>
        <MermaidComponent
          className={
            node.attrs.selected ? "dark:text-purple-400 text-purple-500" : ""
          }
          content={mermaidContent}
          onClick={openTextarea}
        />
        {showTextarea && (
          <div className="bg-input transition rounded-lg p-2">
            <textarea
              ref={inputRef}
              value={mermaidContent}
              placeholder="Enter Mermaid code here..."
              className="bg-transparent w-full"
              onChange={updateContent}
              onKeyDown={(event) => {
                if (event.ctrlKey && event.key === "Enter") {
                  closeTextarea();
                }
              }}
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default MermaidNodeView;
