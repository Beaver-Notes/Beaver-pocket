import React, { useEffect, useRef, useState } from "react";
import { NodeViewWrapperProps, NodeViewWrapper } from "@tiptap/react";
import Settings4LineIcon from "remixicon-react/Settings4LineIcon";
import katex from "katex";
import "../../../css/main.css";

interface MathBlockProps extends NodeViewWrapperProps {
  updateAttributes: (attributes: Record<string, any>) => void;
}

const MathBlock: React.FC<MathBlockProps> = (props) => {
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [useKatexMacros, setUseKatexMacros] = useState(false);
  const [isContentChange, setIsContentChange] = useState(false);
  const [showSecondTextarea, setShowSecondTextarea] = useState(false);

  useEffect(() => {
    props.updateAttributes({ init: "true" });
    renderContent();
  }, []);

  const renderContent = () => {
    let macros = {};

    try {
      macros = JSON.parse(props.node.attrs.macros);
    } catch (error) {
      // Do nothing
    }

    const mathContent = props.node.attrs.content || "Empty";

    // Use katex.renderToString with output: 'mathml'
    const mathML = katex.renderToString(mathContent, {
      macros,
      displayMode: true,
      throwOnError: false,
      output: "mathml", // Specify MathML output
    });

    // Set the MathML content to the innerHTML of the paragraph element
    if (contentRef.current) {
      contentRef.current.innerHTML = mathML;
    }
  };

  const updateContent = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
    key: string,
    isRenderContent: boolean
  ) => {
    setIsContentChange(true);
    props.updateAttributes({ [key]: event.target.value });

    if (isRenderContent) renderContent();
  };

  const handleKeydown = (event: React.KeyboardEvent) => {
    const { ctrlKey, shiftKey, metaKey, key } = event;

    const isEnter = key === "Enter";
    const isMacrosShortcut = (metaKey || ctrlKey) && shiftKey && key === "M";
    const isNotEdited =
      props.editor.isActive("mathBlock") &&
      !isContentChange &&
      ["ArrowUp", "ArrowDown"].includes(key);

    if (isEnter && !isMacrosShortcut && !isNotEdited) {
      // Save using Enter
      props.editor.commands.focus();
      setIsContentChange(false);
      setUseKatexMacros(false);
    } else if (isMacrosShortcut) {
      // Toggle macros with Ctrl+Shift+M
      setUseKatexMacros(!useKatexMacros);
    }
  };

  const handleContentClick = () => {
    setUseKatexMacros(true);
  };

  const toggleSecondTextarea = () => {
    setShowSecondTextarea(!showSecondTextarea);
  };

  return (
    <NodeViewWrapper className="math-block-node-view">
      <div onClick={handleContentClick}>
        <p
          ref={contentRef}
          contentEditable={useKatexMacros}
          suppressContentEditableWarning
          className={`${
            isContentChange ? "dark:text-purple-400 text-purple-500" : ""
          }`}
        ></p>
        {useKatexMacros && (
          <div className="bg-[#F8F8F7] mt-2 dark:bg-[#353333] outline-none transition rounded-lg p-2">
            <div className="flex">
              <textarea
                autoFocus={!useKatexMacros}
                value={props.node.attrs.content}
                placeholder="Text here..."
                className="bg-transparent flex-1 outline-none"
                onChange={(e) => updateContent(e, "content", true)}
                onKeyDown={handleKeydown}
              />
            </div>
            {showSecondTextarea && (
              <div className="flex">
                <textarea
                  autoFocus={useKatexMacros}
                  value={props.node.attrs.macros}
                  placeholder="KaTeX macros"
                  className="bg-transparent flex-1 outline-none"
                  onChange={(e) => updateContent(e, "macros", true)}
                  onKeyDown={handleKeydown}
                />
              </div>
            )}
            <div className="flex border-t dark:border-neutral-600 border-neutral-200 items-center pt-2 text-gray-600 dark:text-gray-300">
              <svg
                className="w-12 fill-neutral-800 dark:fill-white"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    d="M18.525 31.482h-.482c-.192 1.966-.462 4.357-3.855 4.357h-1.562c-.905 0-.944-.136-.944-.772V24.831c0-.655 0-.925 1.812-.925h.636v-.578c-.694.058-2.429.058-3.22.058-.751 0-2.255 0-2.91-.058v.578h.443c1.485 0 1.523.212 1.523.906v10.12c0 .694-.038.907-1.523.907H8v.597h10.005l.52-4.954z"
                    fill=""
                  ></path>
                  <path
                    d="M18.198 23.308c-.078-.23-.116-.308-.367-.308-.25 0-.308.077-.385.308l-3.104 7.866c-.135.327-.366.925-1.561.925v.482h2.988v-.482c-.598 0-.964-.27-.964-.656 0-.096.02-.135.058-.27l.655-1.657h3.817l.771 1.966a.65.65 0 0 1 .077.231c0 .386-.732.386-1.099.386v.482h3.798v-.482h-.27c-.906 0-1.002-.135-1.137-.52l-3.277-8.27zm-.771 1.37 1.715 4.356h-3.431l1.716-4.357z"
                    fill=""
                  ></path>
                  <path
                    d="M33.639 23.443h-11.74l-.347 4.318h.463c.27-3.103.558-3.74 3.47-3.74.346 0 .848 0 1.04.04.405.076.405.288.405.732v10.12c0 .656 0 .926-2.024.926h-.771v.597c.79-.058 2.737-.058 3.624-.058s2.872 0 3.663.058v-.597h-.771c-2.024 0-2.024-.27-2.024-.926v-10.12c0-.386 0-.656.347-.733.212-.038.732-.038 1.098-.038 2.892 0 3.181.636 3.45 3.74h.483l-.366-4.319z"
                    fill=""
                  ></path>
                  <path
                    d="M43.971 35.82h-.482c-.482 2.949-.925 4.356-4.221 4.356h-2.545c-.906 0-.945-.135-.945-.771v-5.128h1.716c1.87 0 2.082.617 2.082 2.255h.482v-5.089h-.482c0 1.639-.212 2.236-2.082 2.236h-1.716v-4.607c0-.636.039-.77.945-.77h2.467c2.95 0 3.451 1.06 3.76 3.739h.481l-.54-4.318H32.097v.578h.444c1.484 0 1.523.212 1.523.906V39.27c0 .694-.039.906-1.523.906h-.444v.597h11.065l.81-4.954z"
                    fill=""
                  ></path>
                  <path
                    d="m49.773 29.014 2.641-3.855c.405-.617 1.06-1.234 2.776-1.253v-.578h-4.588v.578c.772.02 1.196.443 1.196.887 0 .192-.039.231-.174.443l-2.198 3.239-2.467-3.702c-.039-.057-.135-.212-.135-.289 0-.231.424-.559 1.234-.578v-.578c-.656.058-2.063.058-2.795.058-.598 0-1.793-.02-2.506-.058v.578h.366c1.06 0 1.426.135 1.793.675l3.527 5.34-3.142 4.645c-.27.386-.848 1.273-2.776 1.273v.597h4.588v-.597c-.886-.02-1.214-.54-1.214-.887 0-.174.058-.25.193-.463l2.718-4.029 3.045 4.588c.039.077.097.154.097.212 0 .232-.424.56-1.253.579v.597c.675-.058 2.082-.058 2.795-.058.81 0 1.696.02 2.506.058v-.597h-.366c-1.003 0-1.407-.097-1.812-.694l-4.049-6.13z"
                    fill=""
                  ></path>
                </g>
              </svg>

              <div className="flex-grow ml-2 flex items-center justify-between">
                {" "}
                <p className="text-sm" style={{ margin: 0 }}>
                  Press <strong>Enter</strong> to exit
                </p>
                <button
                  title="Toggle KaTeX Macros"
                  className={`riSettings3Line cursor-pointer ${
                    useKatexMacros ? "text-primary" : ""
                  } ${
                    showSecondTextarea
                      ? "text-amber-400"
                      : "text-neutral-800 dark:text-white"
                  }`}
                  onClick={toggleSecondTextarea}
                >
                  <Settings4LineIcon className="active:text-amber-500" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default MathBlock;
