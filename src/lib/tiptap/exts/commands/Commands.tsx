// SlashMenu.tsx
import React, { useEffect, useState } from "react";
import ImageUploadComponent from "../../../../components/Editor/ImageUpload"; // Adjust the path
import FileUploadComponent from "../../../../components/Editor/FileUpload"; // Adjust the path
import VideoUploadComponent from "../../../../components/Editor/VideoUpload"; // Adjust the path
import icons from "../../../remixicon-react";
import Mousetrap from "mousetrap";

interface SlashMenuProps {
  noteId: string;
  editor: any;
  query: string;
  range: string;
}
const Commands: React.FC<SlashMenuProps> = ({
  noteId,
  editor,
  query,
  range,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [translations, setTranslations] = useState({
    editor: {
      embedUrl: "editorembedUrl",
    },
    menu: {
      file: "menu.file",
      image: "menu.image",
      video: "menu.video",
      paragraph: "menu.paragraph",
      heading1: "menu.heading1",
      heading2: "menu.heading2",
      heading3: "menu.heading3",
      heading4: "menu.heading4",
      heading5: "menu.heading5",
      heading6: "menu.heading6",
      quote: "menu.quote",
      code: "menu.code",
      table: "menu.table",
      bulletList: "menu.bulletList",
      orderedList: "menu.orderedList",
      checklist: "menu.checklist",
      blackCallout: "menu.blackCallout",
      blueCallout: "menu.blueCallout",
      greenCallout: "menu.greenCallout",
      purpleCallout: "menu.purpleCallout",
      redCallout: "menu.redCallout",
      yellowCallout: "menu.yellowCallout",
      mathBlock: "menu.mathBlock",
      mermaidBlock: "menu.mermaidBlock",
      embed: "menu.embed",
      drawingBlock: "menu.drawingBlock",
    },
  });

  useEffect(() => {
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../../../../assets/locales/${selectedLanguage}.json`
        );
        setTranslations((prev) => ({ ...prev, ...translationModule.default }));
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
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

  const menu = [
    {
      icon: icons.ParagraphIcon,
      label: translations.menu.paragraph,
      action: () =>
        editor.chain().focus().deleteRange(range).setParagraph().run(),
    },
    {
      icon: icons.Heading1Icon,
      label: translations.menu.heading1,
      action: () =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 1 })
          .run(),
    },
    {
      icon: icons.Heading2Icon,
      label: translations.menu.heading2,
      action: () =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 2 })
          .run(),
    },
    {
      icon: icons.Heading3Icon,
      label: translations.menu.heading3,
      action: () =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 3 })
          .run(),
    },
    {
      icon: icons.Heading4Icon,
      label: translations.menu.heading4,
      action: () =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 4 })
          .run(),
    },
    {
      icon: icons.Heading5Icon,
      label: translations.menu.heading5,
      action: () =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 5 })
          .run(),
    },
    {
      icon: icons.Heading6Icon,
      label: translations.menu.heading6,
      action: () =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 6 })
          .run(),
    },
    {
      icon: icons.DoubleQuotesLIcon,
      label: translations.menu.quote,
      action: () =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      icon: icons.CodeBoxLineIcon,
      label: translations.menu.code,
      action: () =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      icon: icons.Table2Icon,
      label: translations.menu.table,
      action: () =>
        editor?.commands.insertTable({
          rows: 3,
          cols: 3,
          withHeaderRow: true,
        }),
    },
    {
      icon: icons.ListUnorderedIcon,
      label: translations.menu.bulletList,
      action: () =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      icon: icons.ListOrderedIcon,
      label: translations.menu.orderedList,
      action: () =>
        editor?.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      icon: icons.ListCheck2Icon,
      label: translations.menu.checklist,
      action: () =>
        editor?.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.blackCallout,
      className: "dark:text-neutral-400",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setBlackCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.blueCallout,
      className: "text-blue-500 dark:text-blue-500",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setBlueCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.greenCallout,
      className: "text-green-600 dark:text-green-600",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setGreenCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.purpleCallout,
      className: "text-purple-500 dark:text-purple-500",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setPurpleCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.redCallout,
      className: "text-red-500 dark:text-red-500",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setRedCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.yellowCallout,
      className: "text-yellow-500 dark:text-yellow-500",
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setYellowCallout().run(),
    },
    {
      icon: icons.CalculatorLineIcon,
      label: translations.menu.mathBlock,
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setMathBlock().run(),
    },
    {
      icon: icons.PieChart2LineIcon,
      label: translations.menu.mermaidBlock,
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).setMermaidDiagram().run(),
    },
    {
      icon: icons.PagesLineIcon,
      label: translations.menu.embed,
      action: handleAddIframe,
    },
    {
      icon: icons.BrushLineIcon,
      label: translations.menu.drawingBlock,
      //@ts-ignore
      action: () =>
        editor?.chain().focus().deleteRange(range).insertPaper().run(),
    },
  ];

  // Filter menu items by query
  const filteredmenu = menu.filter(
    (item) =>
      item.label && item.label.toLowerCase().includes(query.toLowerCase())
  );

  // Check if the query matches partial words for the upload components
  const showImageUpload = translations.menu.image
    .toLowerCase()
    .includes(query.toLowerCase());
  const showFileUpload = translations.menu.file
    .toLowerCase()
    .includes(query.toLowerCase());
  const showVideoUpload = translations.menu.video
    .toLowerCase()
    .includes(query.toLowerCase());

  // Prepare the list of upload components
  const uploadComponents = [];
  if (showImageUpload) {
    uploadComponents.push({
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
    uploadComponents.push({
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
    uploadComponents.push({
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

  // Combine filtered menu items and upload components, respecting the 5-item limit
  const combinedItems = [
    ...filteredmenu.map((item, index) => ({
      component: (
        <button
          key={index}
          onClick={item.action}
          className={`flex items-center p-2 rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition duration-200 ${
            index === selectedIndex ? "bg-neutral-200 dark:bg-neutral-600" : ""
          }`}
        >
          <div className="text-left flex overflow-hidden text-ellipsis whitespace-nowrap">
            <item.icon
              className={`text-left overflow-hidden text-ellipsis whitespace-nowrap mr-2 ltr:ml-2 text-lg ${
                item.className || ""
              }`}
            />
            <h3 className="text-lg font-medium text-neutral-800 dark:text-[color:var(--selected-dark-text)]">
              {item.label}
            </h3>
          </div>
        </button>
      ),
      action: item.action,
    })),
    ...uploadComponents,
  ].slice(0, 5);

  // Handle item click for both keyboard and mouse selections
  const handleItemClick = (index: number) => {
    const selected = combinedItems[index];
    if (selected) {
      if ("action" in selected && selected.action) {
        selected.action();
      } else if (selected.component.props?.onClick) {
        selected.component.props.onClick();
      }
    }
  };

  useEffect(() => {
    Mousetrap.bind("up", (e) => {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + combinedItems.length) % combinedItems.length
      );
    });

    Mousetrap.bind("down", (e) => {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % combinedItems.length);
    });

    Mousetrap.bind("enter", (e) => {
      e.preventDefault();
      handleItemClick(selectedIndex);
    });

    Mousetrap.bind("esc", (e) => {
      e.preventDefault();
      editor?.commands.deleteRange(range).run();
    });

    return () => {
      Mousetrap.unbind(["up", "down", "enter", "esc"]);
    };
  }, [combinedItems.length, selectedIndex]);

  return (
    <div className="z-50 fixed bg-white dark:bg-neutral-800 rounded-lg shadow-lg border shadow-xl dark:border-neutral-600 p-2">
      {combinedItems.map((item, index) => (
        <div
          key={index}
          onClick={() => handleItemClick(index)}
          className={`cursor-pointer ${
            index === selectedIndex
              ? "bg-neutral-200 dark:bg-neutral-600 rounded-lg"
              : ""
          }`}
        >
          {item.component}
        </div>
      ))}
    </div>
  );
};

export default Commands;
