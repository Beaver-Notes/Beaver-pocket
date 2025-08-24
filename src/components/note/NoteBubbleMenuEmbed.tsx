import React, { useCallback, useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { useTranslation } from "@/utils/translations"; 
import Icon from "@/components/ui/Icon";

type EmbedBubbleProps = {
  editor: Editor;
};

const normalizeEmbedUrl = (raw: string) => {
  let url = raw.trim();
  if (!url) return "";

  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
  }
  return url;
};

export const EmbedBubble: React.FC<EmbedBubbleProps> = ({ editor }) => {
  const [embedUrl, setEmbedUrl] = useState("");
  const [translations, setTranslations] = useState<{ editor?: any }>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      const t = await useTranslation();
      if (mounted && t) setTranslations(t as any);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const syncFromEditor = useCallback(() => {
    try {
      const attrs = editor.getAttributes("iframe");
      setEmbedUrl(attrs?.src ?? "");
    } catch {
      setEmbedUrl("");
    }
  }, [editor]);

  useEffect(() => {
    syncFromEditor();

    editor.on("selectionUpdate", syncFromEditor);
    editor.on("transaction", syncFromEditor);

    return () => {
      editor.off("selectionUpdate", syncFromEditor);
      editor.off("transaction", syncFromEditor);
    };
  }, [editor, syncFromEditor]);

  const applyEmbed = useCallback(() => {
    const normalized = normalizeEmbedUrl(embedUrl);
    if (!normalized) return;

    editor
      .chain()
      .focus()
      .deleteSelection()
      .setIframe({ src: normalized })
      .run();

    setEmbedUrl("");
  }, [editor, embedUrl]);

  const removeEmbed = useCallback(() => {
    editor.chain().focus().deleteSelection().run();
    setEmbedUrl("");
  }, [editor]);

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyEmbed();
      } else if (e.key === "Escape") {
        e.preventDefault();
        editor.commands.focus();
      }
    },
    [applyEmbed, editor]
  );

  const placeholder =
    translations.editor?.embedPlaceholder || "Enter embed URL…";

  return (
    <div className="p-2 flex items-center space-x-2">
      <input
        id="bubble-input"
        type="url"
        value={embedUrl}
        onChange={(e) => setEmbedUrl(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent"
      />

      <button
        type="button"
        title="Remove embed"
        onClick={removeEmbed}
        className="text-neutral-600 dark:text-neutral-200"
      >
        <Icon name="DeleteBinLine" />
      </button>

      <button
        type="button"
        title="Save embed"
        onClick={applyEmbed}
        className="text-neutral-600 -mr-1 dark:text-neutral-200"
      >
        <Icon name="Save3Line" />
      </button>
    </div>
  );
};

export default EmbedBubble;
