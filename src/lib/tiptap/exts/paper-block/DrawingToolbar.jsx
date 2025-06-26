import Icons from "../../../remixicon-react";
import React, { useState } from "react";

const DrawingToolBar = ({
  setState,
  state,
  setSelectedElement,
  onClose,
  updateAttributes,
}) => {
  const [showStyleOpt, setShowStyleOpt] = useState(false);
  const [activePicker, setActivePicker] = useState(null);

  const {
    lines,
    isDrawing,
    tool,
    penSettings,
    eraserSettings,
    undoStack,
    redoStack,
    highlighterSettings,
    height,
    width,
    background,
  } = state;

  const undo = () => {
    if (undoStack.length === 0) return;
    const previousLines = undoStack[undoStack.length - 1];
    setState((prev) => ({
      ...prev,
      redoStack: [...prev.redoStack, prev.lines],
      lines: previousLines,
      undoStack: prev.undoStack.slice(0, -1),
    }));
    // Clear selection when undoing
    setSelectedElement(null);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const nextLines = redoStack[redoStack.length - 1];
    setState((prev) => ({
      ...prev,
      undoStack: [...prev.undoStack, prev.lines],
      lines: nextLines,
      redoStack: prev.redoStack.slice(0, -1),
    }));
    // Clear selection when redoing
    setSelectedElement(null);
  };

  const handleColorChange = (type, color) => {
    setState((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        color,
      },
    }));
  };

  return (
    <div>
      <div className="fixed top-6 right-0 transform -translate-x-1/2 z-10 p-2 hidden sm:flex justify-between items-center bg-neutral-800 rounded-xl shadow-md">
        <button
          onClick={() => setShowStyleOpt((prev) => !prev)}
          className={`relative flex items-center justify-center p-2 text-[color:var(--selected-dark-text)] rounded focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-800`}
        >
          <Icons.Brush3FillIcon className="w-6 h-6" />
          {showStyleOpt && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-auto bg-neutral-800 border border-neutral-600 shadow-md rounded-lg p-2 z-20">
              <div className="drawing-container flex flex-col-2 flex-wrap gap-2">
                {["grid", "ruled", "dotted", "plain"].map((type) => (
                  <button
                    key={type}
                    className={`w-20 h-20 border border-neutral-600 ${type} ${
                      background === type ? "ring-1 ring-primary" : ""
                    }`}
                    onClick={() => {
                      setState((prev) => ({ ...prev, background: type }));
                      updateAttributes({ paperType: type });
                    }}
                  ></button>
                ))}
              </div>
            </div>
          )}
        </button>
        <hr className="h-6 border-l border-neutral-300 dark:border-neutral-600" />
        <button
          onClick={onClose}
          className="p-1 rounded-full text-[color:var(--selected-dark-text)] transition-colors"
        >
          <Icons.CloseLineIcon className="w-8 h-8" />
        </button>
      </div>
      <div className="fixed top-12 sm:top-6 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <div className="p-2 flex justify-between items-center bg-neutral-800 rounded-xl shadow-md">
          <button
            onClick={() => setState((prev) => ({ ...prev, tool: "select" }))}
            className={`flex items-center justify-center p-2 ${
              state.tool === "select"
                ? "text-secondary"
                : "text-[color:var(--selected-dark-text)]"
            }`}
          >
            <Icons.Focus3LineIcon className="w-8 h-8" />
          </button>
          <button
            onClick={() => setState((prev) => ({ ...prev, tool: "pen" }))}
            className={`flex items-center justify-center p-2 ${
              tool === "pen"
                ? "text-secondary"
                : "text-[color:var(--selected-dark-text)]"
            }`}
          >
            <Icons.BallPenLine className="w-8 h-8" />
          </button>
          <button
            onClick={() =>
              setState((prev) => ({ ...prev, tool: "highlighter" }))
            }
            className={`flex items-center justify-center p-2 ${
              tool === "highlighter"
                ? "text-secondary"
                : "text-[color:var(--selected-dark-text)]"
            }`}
          >
            <Icons.MarkPenLineIcon className="w-8 h-8" />
          </button>
          <button
            onClick={() => setState((prev) => ({ ...prev, tool: "eraser" }))}
            className={`flex items-center justify-center p-2 ${
              tool === "eraser"
                ? "text-secondary"
                : "text-[color:var(--selected-dark-text)]"
            }`}
          >
            <Icons.EraserLineIcon className="w-8 h-8" />
          </button>
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="p-2 text-[color:var(--selected-dark-text)]"
          >
            <Icons.ArrowGoBackLineIcon className="w-8 h-8" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-2 text-[color:var(--selected-dark-text)]"
          >
            <Icons.ArrowGoForwardLineIcon className="w-8 h-8" />
          </button>
          <button
            onClick={onClose}
            className="sm:hidden p-2 rounded-full text-[color:var(--selected-dark-text)] transition-colors"
          >
            <Icons.CloseLineIcon className="w-8 h-8" />
          </button>
        </div>
        <div className="p-1 flex justify-between items-center bg-neutral-800 rounded-xl shadow-md gap-2">
          {tool === "highlighter" && (
            <>
              <div className="relative inline-block">
                {activePicker === "highlighter" && (
                  <input
                    type="color"
                    value={highlighterSettings.color}
                    onChange={(e) =>
                      handleColorChange("highlighterSettings", e.target.value)
                    }
                    onBlur={() => setActivePicker(null)}
                    autoFocus
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
                <button
                  onClick={() =>
                    setActivePicker(
                      activePicker === "highlighter" ? null : "highlighter"
                    )
                  }
                  style={{ backgroundColor: highlighterSettings.color }}
                  className="flex items-center justify-center p-1 h-8 w-8 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800"
                />
              </div>
              <label className="flex items-center gap-1">
                <input
                  type="range"
                  min="10"
                  max="20"
                  value={highlighterSettings.size}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      highlighterSettings: {
                        ...prev.highlighterSettings,
                        size: parseInt(e.target.value),
                      },
                    }))
                  }
                />
              </label>
            </>
          )}
          {tool === "pen" && (
            <>
              <div className="relative inline-block">
                {activePicker === "pen" && (
                  <input
                    type="color"
                    value={penSettings.color}
                    onChange={(e) =>
                      handleColorChange("penSettings", e.target.value)
                    }
                    onBlur={() => setActivePicker(null)}
                    autoFocus
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
                <button
                  onClick={() =>
                    setActivePicker(activePicker === "pen" ? null : "pen")
                  }
                  style={{ backgroundColor: penSettings.color }}
                  className="flex items-center justify-center p-1 h-8 w-8 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800"
                />
              </div>
              <label className="flex items-center gap-1">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={penSettings.size}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      penSettings: {
                        ...prev.penSettings,
                        size: parseInt(e.target.value),
                      },
                    }))
                  }
                />
              </label>
            </>
          )}
          {tool === "eraser" && (
            <label className="flex items-center gap-1">
              <input
                type="range"
                min="5"
                max="20"
                value={eraserSettings.size}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    eraserSettings: {
                      ...prev.eraserSettings,
                      size: parseInt(e.target.value),
                    },
                  }))
                }
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawingToolBar;
