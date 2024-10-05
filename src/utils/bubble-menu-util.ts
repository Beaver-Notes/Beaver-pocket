type PopupPosition = { top: number; left: number } | null;

export function handleEditorTyping(
  event: React.KeyboardEvent<HTMLDivElement>,
  // @ts-ignores
  textAfterAt: string | null,
  // @ts-ignores
  textAfterHash: string | null,
  // @ts-ignores
  textAfterSlash: string | null,
  atPosition: number | null,
  hashPosition: number | null,
  slashPosition: number | null,
  setPopupPosition: React.Dispatch<React.SetStateAction<PopupPosition>>,
  setAtPosition: React.Dispatch<React.SetStateAction<number | null>>,
  setTextAfterAt: React.Dispatch<React.SetStateAction<string | null>>,
  setHashPopupPosition: React.Dispatch<React.SetStateAction<PopupPosition>>,
  setHashPosition: React.Dispatch<React.SetStateAction<number | null>>,
  setTextAfterHash: React.Dispatch<React.SetStateAction<string | null>>,
  setSlashPopupPosition: React.Dispatch<React.SetStateAction<PopupPosition>>,
  setSlashPosition: React.Dispatch<React.SetStateAction<number | null>>,
  setTextAfterSlash: React.Dispatch<React.SetStateAction<string | null>>
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
    setSlashPopupPosition(null);
    setSlashPosition(null);
    setTextAfterSlash("");
    return;
  }

  const atIndex = text.lastIndexOf("@@");
  const hashIndex = text.lastIndexOf("#");
  const slashIndex = text.lastIndexOf("/");

  const setPosition = (trigger: string, index: number) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).cloneRange();
      const rect = range.getBoundingClientRect();

      // If rect dimensions are 0 (indicating an empty or improperly calculated range),
      // manually adjust the range to select the specific character for accurate positioning
      if (rect.width === 0 && rect.height === 0 && index >= 0) {
        //@ts-ignore
        range.setStart(event.currentTarget.firstChild, index); // Set start of range
        //@ts-ignore
        range.setEnd(event.currentTarget.firstChild, index + 1); // Set end of range after the character
        const newRect = range.getBoundingClientRect();

        const top = newRect.bottom + window.scrollY; // Correct the top position
        const left = newRect.left + window.scrollX; // Correct the left position

        if (trigger === "@@") {
          setPopupPosition({ top, left });
          setAtPosition(index);
          setTextAfterAt("");
        } else if (trigger === "#") {
          setHashPopupPosition({ top, left });
          setHashPosition(index);
          setTextAfterHash("");
        } else if (trigger === "/") {
          setSlashPopupPosition({ top, left });
          setSlashPosition(index);
          setTextAfterSlash("");
        }
      } else {
        // Standard case where rect dimensions are valid
        const top = rect.bottom + window.scrollY;
        const left = rect.left + window.scrollX;

        if (trigger === "@@") {
          setPopupPosition({ top, left });
          setAtPosition(index);
          setTextAfterAt("");
        } else if (trigger === "#") {
          setHashPopupPosition({ top, left });
          setHashPosition(index);
          setTextAfterHash("");
        } else if (trigger === "/") {
          setSlashPopupPosition({ top, left });
          setSlashPosition(index);
          setTextAfterSlash("");
        }
      }
    }
  };

  // Handle @@
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

  // Handle #
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

  // Handle /
  if (key === "/" && text[slashIndex] === "/" && text[slashIndex + 1] !== " ") {
    setPosition("/", slashIndex);
  } else if (slashPosition !== null) {
    if (
      key === " " ||
      key === "Enter" ||
      (key === "Backspace" && slashIndex === -1)
    ) {
      setSlashPopupPosition(null);
      setSlashPosition(null);
      setTextAfterSlash("");
    } else {
      const textAfterSlash = text.substring(slashPosition + 1).split(/\s/)[0];
      if (textAfterSlash) {
        setTextAfterSlash(textAfterSlash);
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

    if (text.indexOf("/") === -1) {
      setSlashPopupPosition(null);
      setSlashPosition(null);
      setTextAfterSlash("");
    }
  }
}
