// SlashMenu.tsx
import React, { useEffect, useState } from "react";
import ImageUploadComponent from "@/composable/ImageUpload";
import FileUploadComponent from "@/composable/FileUpload";
import VideoUploadComponent from "@/composable/VideoUpload";
import Icon from "@/components/UI/Icon";
import { useTranslation } from "@/utils/translations";
import UiList from "@/components/UI/List";
import UiListItem from "@/components/UI/ListItem";

type IconName = React.ComponentProps<typeof Icon>["name"];

interface SlashMenuProps {
  noteId: string;
  editor: any;
  query: string;
  range: string;
}

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  className?: string;
  action: () => void;
  type: "menu" | "upload";
  component?: React.ReactNode;
}

const Commands: React.FC<SlashMenuProps> = ({
  noteId,
  editor,
  query,
  range,
}) => {
  const [translations, setTranslations] = useState<Record<string, any>>({
    editor: {},
    menu: {},
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) {
        setTranslations(trans);
      }
    };
    fetchTranslations();
  }, []);

  const handlefileUpload = (fileUrl: string, fileName: string) => {
    editor.commands.deleteRange(range).run();
    editor?.chain().setFileEmbed(fileUrl, fileName).run();
  };

  const handlevideoUpload = (fileUrl: string) => {
    editor.commands.deleteRange(range).run();
    editor?.chain().setVideo(fileUrl).run();
  };

  const handleImageUpload = (imageUrl: string) => {
    editor.commands.deleteRange(range).run();
    editor?.chain().setImage({ src: imageUrl }).run();
  };

  const handleAddIframe = () => {
    const videoUrl = prompt(`${translations.editor.embedUrl}`);
    if (!videoUrl || videoUrl.trim() === "") {
      return;
    }

    let formattedUrl = videoUrl.trim();
    if (formattedUrl.includes("youtube.com/watch?v=")) {
      let videoId = formattedUrl.split("v=")[1];
      const ampersandPosition = videoId.indexOf("&");
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
      formattedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (formattedUrl.includes("youtu.be/")) {
      let videoId = formattedUrl.split("youtu.be/")[1];
      const ampersandPosition = videoId.indexOf("?");
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
      formattedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    editor
      ?.chain()
      .focus()
      .deleteRange(range)
      .setIframe({ src: formattedUrl })
      .run();
  };

  const headingLevels = [1, 2, 3, 4, 5, 6];
  const headingIcons = [
    "Heading1",
    "Heading2",
    "Heading3",
    "Heading4",
    "Heading5",
    "Heading6",
  ];

  const headings = headingLevels.map((level, idx) => ({
    id: `heading-${level}`,
    icon: headingIcons[idx],
    label: `${translations.menu.heading} ${level}`,
    type: "menu" as const,
    action: () =>
      editor.chain().focus().deleteRange(range).toggleHeading({ level }).run(),
  }));

  const baseMenuItems: MenuItem[] = [
    {
      id: "paragraph",
      icon: "Paragraph",
      label: translations.menu.paragraph || "Paragraph",
      type: "menu",
      action: () =>
        editor.chain().focus().deleteRange(range).setParagraph().run(),
    },
    ...headings,
    {
      id: "quote",
      icon: "DoubleQuotesL",
      label: translations.menu.quote || "Quote",
      type: "menu",
      action: () =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      id: "code",
      icon: "CodeBoxLine",
      label: translations.menu.code || "Code",
      type: "menu",
      action: () =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      id: "table",
      icon: "Table2",
      label: translations.menu.table || "Table",
      type: "menu",
      action: () =>
        editor?.commands.insertTable({
          rows: 3,
          cols: 3,
          withHeaderRow: true,
        }),
    },
    {
      id: "bullet-list",
      icon: "ListUnordered",
      label: translations.menu.bulletList || "Bullet List",
      type: "menu",
      action: () =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      id: "ordered-list",
      icon: "ListOrdered",
      label: translations.menu.orderedList || "Ordered List",
      type: "menu",
      action: () =>
        editor?.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      id: "checklist",
      icon: "ListCheck2",
      label: translations.menu.checklist || "Checklist",
      type: "menu",
      action: () =>
        editor?.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      id: "black-callout",
      icon: "SingleQuotesL",
      label: translations.menu.blackCallout || "Black Callout",
      className: "dark:text-neutral-400",
      type: "menu",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setBlackCallout().run(),
    },
    {
      id: "blue-callout",
      icon: "SingleQuotesL",
      label: translations.menu.blueCallout || "Blue Callout",
      className: "text-blue-500 dark:text-blue-500",
      type: "menu",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setBlueCallout().run(),
    },
    {
      id: "green-callout",
      icon: "SingleQuotesL",
      label: translations.menu.greenCallout || "Green Callout",
      className: "text-green-600 dark:text-green-600",
      type: "menu",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setGreenCallout().run(),
    },
    {
      id: "purple-callout",
      icon: "SingleQuotesL",
      label: translations.menu.purpleCallout || "Purple Callout",
      className: "text-purple-500 dark:text-purple-500",
      type: "menu",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setPurpleCallout().run(),
    },
    {
      id: "red-callout",
      icon: "SingleQuotesL",
      label: translations.menu.redCallout || "Red Callout",
      className: "text-red-500 dark:text-red-500",
      type: "menu",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setRedCallout().run(),
    },
    {
      id: "yellow-callout",
      icon: "SingleQuotesL",
      label: translations.menu.yellowCallout || "Yellow Callout",
      className: "text-yellow-500 dark:text-yellow-500",
      type: "menu",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setYellowCallout().run(),
    },
    {
      id: "math-block",
      icon: "CalculatorLine",
      label: translations.menu.mathBlock || "Math Block",
      type: "menu",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setMathBlock().run(),
    },
    {
      id: "mermaid-block",
      icon: "PieChart2Line",
      label: translations.menu.mermaidBlock || "Mermaid Block",
      type: "menu",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setMermaidDiagram().run(),
    },
    {
      id: "embed",
      icon: "PagesLine",
      label: translations.menu.embed || "Embed",
      type: "menu",
      action: handleAddIframe,
    },
    {
      id: "drawing-block",
      icon: "BrushLine",
      label: translations.menu.drawingBlock || "Drawing Block",
      type: "menu",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).insertPaper().run(),
    },
  ];

  // Create upload menu items
  const createUploadMenuItems = (): MenuItem[] => {
    const uploadItems: MenuItem[] = [];

    const showImageUpload = translations.menu?.image
      ?.toLowerCase()
      .includes(query.toLowerCase());
    const showFileUpload = translations.menu?.file
      ?.toLowerCase()
      .includes(query.toLowerCase());
    const showVideoUpload = translations.menu?.video
      ?.toLowerCase()
      .includes(query.toLowerCase());

    if (showImageUpload) {
      uploadItems.push({
        id: "image-upload",
        icon: "Image",
        label: translations.menu.image || "Image",
        type: "upload",
        action: () => {}, // Action handled by component
        component: (
          <ImageUploadComponent
            key="imageUpload"
            onImageUpload={handleImageUpload}
            noteId={noteId}
            menu={true}
            translations={translations}
          />
        ),
      });
    }

    if (showFileUpload) {
      uploadItems.push({
        id: "file-upload",
        icon: "File",
        label: translations.menu.file || "File",
        type: "upload",
        action: () => {}, // Action handled by component
        component: (
          <FileUploadComponent
            key="fileUpload"
            onFileUpload={handlefileUpload}
            noteId={noteId}
            menu={true}
            translations={translations}
          />
        ),
      });
    }

    if (showVideoUpload) {
      uploadItems.push({
        id: "video-upload",
        icon: "Video",
        label: translations.menu.video || "Video",
        type: "upload",
        action: () => {}, // Action handled by component
        component: (
          <VideoUploadComponent
            key="videoUpload"
            onVideoUpload={handlevideoUpload}
            noteId={noteId}
            menu={true}
            translations={translations}
          />
        ),
      });
    }

    return uploadItems;
  };

  // Filter and combine all menu items
  const getFilteredItems = (): MenuItem[] => {
    const filteredBaseItems = baseMenuItems.filter(
      (item) =>
        item.label && item.label.toLowerCase().includes(query.toLowerCase())
    );

    const uploadItems = createUploadMenuItems();

    return [...filteredBaseItems, ...uploadItems].slice(0, 6);
  };

  const filteredItems = getFilteredItems();

  // Handle item selection - convert MenuItem to the format expected by SuggestionComponent
  const handleSelect = ({ item }: { item: any }) => {
    const menuItem = item as MenuItem;
    if (menuItem && menuItem.action) {
      menuItem.action();
    }
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        editor?.commands.deleteRange(range).run();
        return true;
      }

      // Handle arrow keys and enter
      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + filteredItems.length) % filteredItems.length
          );
          return true;
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
          return true;
        case "Enter":
          event.preventDefault();

          console.log("test");
          if (filteredItems[selectedIndex]) {
            handleSelect({ item: filteredItems[selectedIndex] });
          }
          return true;
        default:
          return false;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor, range, filteredItems, selectedIndex]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  return (
    <UiList className="z-50 fixed bg-white dark:bg-neutral-800 rounded-lg shadow-lg border shadow-xl dark:border-neutral-600 p-2">
      {filteredItems.map((item, index) => (
        <UiListItem
          key={item.id}
          onClick={() => handleSelect({ item })}
          active={index === selectedIndex}
          className="cursor-pointer"
        >
          {item.type === "upload" && item.component ? (
            item.component
          ) : (
            <div className="flex items-center p-2 rounded-lg text-black dark:text-[color:var(--selected-dark-text)] hover:bg-neutral-100 dark:hover:bg-neutral-700 transition duration-200">
              <div className="text-left flex overflow-hidden text-ellipsis whitespace-nowrap">
                <Icon
                  name={item.icon as IconName}
                  className={`mr-2 ltr:ml-2 text-lg ${item.className || ""}`}
                />
                <h3 className="text-lg font-medium text-neutral-800 dark:text-[color:var(--selected-dark-text)]">
                  {item.label}
                </h3>
              </div>
            </div>
          )}
        </UiListItem>
      ))}
    </UiList>
  );
};

export default Commands;
