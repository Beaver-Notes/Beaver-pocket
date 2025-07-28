// SlashMenu.tsx
import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import ImageUploadComponent from "@/composable/ImageUpload";
import FileUploadComponent from "@/composable/FileUpload";
import VideoUploadComponent from "@/composable/VideoUpload";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/utils/translations";
import UiList from "@/components/ui/List";
import UiListItem from "@/components/ui/ListItem";

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

interface CommandsHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const Commands = forwardRef<CommandsHandle, SlashMenuProps>(
  ({ noteId, editor, query, range }, ref) => {
    const [translations, setTranslations] = useState<Record<string, any>>({
      editor: {},
      menu: {},
    });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const fetchTranslations = async () => {
        const trans = await useTranslation();
        if (trans) {
          setTranslations(trans);
        }
      };
      fetchTranslations();
    }, []);

    // Position adjustment effect
    useEffect(() => {
      if (menuRef.current) {
        const menu = menuRef.current;
        const rect = menu.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        // Adjust vertical position if menu goes below viewport
        if (rect.bottom > windowHeight) {
          menu.style.transform = `translateY(-${rect.height + 10}px)`;
        }

        // Adjust horizontal position if menu goes beyond viewport
        if (rect.right > windowWidth) {
          menu.style.transform = `${menu.style.transform || ""} translateX(-${
            rect.right - windowWidth + 20
          }px)`;
        }
      }
    }, [query]); // Re-run when query changes as menu size might change

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
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level })
          .run(),
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

    // Navigation functions (similar to Vue component)
    const upHandler = () => {
      setSelectedIndex(
        (prev) => (prev - 1 + filteredItems.length) % filteredItems.length
      );
    };

    const downHandler = () => {
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    };

    const enterHandler = () => {
      if (filteredItems[selectedIndex]) {
        handleSelect({ item: filteredItems[selectedIndex] });
      }
    };

    // Expose onKeyDown method via ref (similar to Vue component)
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        switch (event.key) {
          case "ArrowUp":
            event.preventDefault();
            upHandler();
            return true;
          case "ArrowDown":
            event.preventDefault();
            downHandler();
            return true;
          case "Enter":
            event.preventDefault();
            enterHandler();
            return true;
          default:
            return false;
        }
      },
    }));

    // Reset selected index when items change
    useEffect(() => {
      setSelectedIndex(0);
    }, [filteredItems.length]);

    return (
      <div
        ref={menuRef}
        style={{
          maxWidth: "300px", // Prevent excessive width
          maxHeight: "400px", // Prevent excessive height
          overflow: "auto", // Allow scrolling if needed
        }}
      >
        <UiList className="z-50 rounded-lg shadow-lg border shadow-xl dark:border-neutral-600 p-2 bg-white dark:bg-neutral-800">
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
                <div className="flex items-center rounded-lg transition">
                  <div className="text-left flex overflow-hidden text-ellipsis whitespace-nowrap">
                    <Icon
                      name={item.icon as IconName}
                      className={`mr-2 ltr:ml-2 text-lg ${
                        item.className || ""
                      }`}
                    />
                    <h3 className="text-lg font-medium">{item.label}</h3>
                  </div>
                </div>
              )}
            </UiListItem>
          ))}
        </UiList>
      </div>
    );
  }
);

Commands.displayName = "Commands";

export default Commands;
