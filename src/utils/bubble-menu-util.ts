// handleEditorTyping.ts

type PopupPosition = { top: number; left: number } | null;

export function handleEditorTyping(
  event: React.KeyboardEvent<HTMLDivElement>,
  // @ts-ignores
  textAfterAt: string | null,
  // @ts-ignores
  textAfterHash: string | null,
  atPosition: number | null,
  hashPosition: number | null,
  setPopupPosition: React.Dispatch<React.SetStateAction<PopupPosition>>,
  setAtPosition: React.Dispatch<React.SetStateAction<number | null>>,
  setTextAfterAt: React.Dispatch<React.SetStateAction<string | null>>,
  setHashPopupPosition: React.Dispatch<React.SetStateAction<PopupPosition>>,
  setHashPosition: React.Dispatch<React.SetStateAction<number | null>>,
  setTextAfterHash: React.Dispatch<React.SetStateAction<string | null>>
) {
  const { key } = event;
  const text = event.currentTarget.innerText.trim(); // Trimmed the text to avoid unnecessary whitespace

  if (!text) {
    setPopupPosition(null);
    setAtPosition(null);
    setTextAfterAt("");
    setHashPopupPosition(null);
    setHashPosition(null);
    setTextAfterHash("");
    return;
  }

  const atIndex = text.lastIndexOf("@@");
  const hashIndex = text.lastIndexOf("#");

  const setPosition = (trigger: string, index: number) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).cloneRange();
      const rect = range.getBoundingClientRect();

      const top = rect.bottom + window.scrollY; // Adjusted top position relative to the viewport
      const left = rect.left + window.scrollX; // Adjusted left position relative to the viewport

      if (trigger === "@@") {
        setPopupPosition({ top, left });
        setAtPosition(index); // Set the position of '@@'
        setTextAfterAt(""); // Initialize textAfterAt to an empty string
      } else if (trigger === "#") {
        setHashPopupPosition({ top, left });
        setHashPosition(index); // Set the position of '#'
        setTextAfterHash(""); // Initialize textAfterHash to an empty string
      }
    }
  };

  if (
    key === "@" &&
    atIndex !== -1 &&
    text[atIndex] === "@" &&
    text[atIndex + 1] === "@"
  ) {
    setPosition("@@", atIndex);
  } else if (atPosition !== null) {
    if (
      key === " " ||
      key === "Enter" ||
      (key === "Backspace" && atIndex === -1)
    ) {
      setPopupPosition(null);
      setAtPosition(null);
      setTextAfterAt("");
    } else {
      const textAfterAt = text.substring(atPosition + 2).split(/\s/)[0];
      if (textAfterAt) {
        setTextAfterAt(textAfterAt); // Set textAfterAt
      }
    }
  }

  if (key === "#" && text[hashIndex] === "#" && text[hashIndex + 1] !== " ") {
    setPosition("#", hashIndex);
  } else if (hashPosition !== null) {
    if (
      key === " " ||
      key === "Enter" ||
      (key === "Backspace" && hashIndex === -1)
    ) {
      setHashPopupPosition(null);
      setHashPosition(null);
      setTextAfterHash("");
    } else {
      const textAfterHash = text.substring(hashPosition + 1).split(/\s/)[0];
      if (textAfterHash) {
        setTextAfterHash(textAfterHash);
      }
    }
  }

  if (key === "Backspace") {
    if (text.indexOf("@@") === -1) {
      setPopupPosition(null);
      setAtPosition(null);
      setTextAfterAt("");
    }

    if (text.indexOf("#") === -1) {
      setHashPopupPosition(null);
      setHashPosition(null);
      setTextAfterHash("");
    }
  }
}
