// SlashMenu.tsx
import React, { useEffect, useState } from "react";
import ImageUploadComponent from "../../../../components/Editor/ImageUpload"; // Adjust the path
import FileUploadComponent from "../../../../components/Editor/FileUpload"; // Adjust the path
import VideoUploadComponent from "../../../../components/Editor/VideoUpload"; // Adjust the path
import icons from "../../../remixicon-react";

interface SlashMenuProps {
  noteId: string;
  editor: any;
  query: string;
}
const SlashMenu: React.FC<SlashMenuProps> = ({ noteId, editor, query }) => {
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
    editor?.chain().setFileEmbed(fileUrl, fileName).run();
  };

  const handlevideoUpload = (fileUrl: string) => {
    editor?.chain().setVideo(fileUrl).run();
  };

  const handleImageUpload = (imageUrl: string) => {
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

    editor?.chain().focus().setIframe({ src: formattedUrl }).run();
  };

  const [translations, setTranslations] = useState({
    editor: {
      embedUrl: "editorembedUrl",
    },
    menu: {
      file: "menuItems.file",
      image: "menuItems.image",
      video: "menuItems.video",
      paragraph: "menuItems.paragraph",
      heading1: "menuItems.heading1",
      heading2: "menuItems.heading2",
      heading3: "menuItems.heading3",
      heading4: "menuItems.heading4",
      heading5: "menuItems.heading5",
      heading6: "menuItems.heading6",
      quote: "menuItems.quote",
      code: "menuItems.code",
      table: "menuItems.table",
      bulletList: "menuItems.bulletList",
      orderedList: "menuItems.orderedList",
      checklist: "menuItems.checklist",
      blackCallout: "menuItems.blackCallout",
      blueCallout: "menuItems.blueCallout",
      greenCallout: "menuItems.greenCallout",
      purpleCallout: "menuItems.purpleCallout",
      redCallout: "menuItems.redCallout",
      yellowCallout: "menuItems.yellowCallout",
      mathBlock: "menuItems.mathBlock",
      mermaidBlock: "menuItems.mermaidBlock",
      embed: "menuItems.embed",
      drawingBlock: "menuItems.drawingBlock",
    },
  });

  const menuItems = [
    {
      icon: icons.ParagraphIcon,
      label: translations.menu.paragraph,
      action: () => editor.chain().focus().setParagraph().run(),
    },
    {
      icon: icons.Heading1Icon,
      label: translations.menu.heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      icon: icons.Heading2Icon,
      label: translations.menu.heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: icons.Heading3Icon,
      label: translations.menu.heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: icons.Heading4Icon,
      label: translations.menu.heading4,
      action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    },
    {
      icon: icons.Heading5Icon,
      label: translations.menu.heading5,
      action: () => editor.chain().focus().toggleHeading({ level: 5 }).run(),
    },
    {
      icon: icons.Heading6Icon,
      label: translations.menu.heading6,
      action: () => editor.chain().focus().toggleHeading({ level: 6 }).run(),
    },
    {
      icon: icons.DoubleQuotesLIcon,
      label: translations.menu.quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: icons.CodeBoxLineIcon,
      label: translations.menu.code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
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
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: icons.ListOrderedIcon,
      label: translations.menu.orderedList,
      action: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: icons.ListCheck2Icon,
      label: translations.menu.checklist,
      action: () => editor?.chain().focus().toggleTaskList().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.blackCallout,
      className: "dark:text-neutral-400",
      //@ts-ignore
      action: () => editor?.chain().focus().setBlackCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.blueCallout,
      className: "text-blue-500 dark:text-blue-500",
      //@ts-ignore
      action: () => editor?.chain().focus().setBlueCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.greenCallout,
      className: "text-green-600 dark:text-green-600",
      //@ts-ignore
      action: () => editor?.chain().focus().setGreenCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.purpleCallout,
      className: "text-purple-500 dark:text-purple-500",
      //@ts-ignore
      action: () => editor?.chain().focus().setPurpleCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.redCallout,

      className: "text-red-500 dark:text-red-500",
      //@ts-ignore
      action: () => editor?.chain().focus().setRedCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menu.yellowCallout,

      className: "text-yellow-500 dark:text-yellow-500",
      //@ts-ignore

      action: () => editor?.chain().focus().setYellowCallout().run(),
    },
    {
      icon: icons.CalculatorLineIcon,
      label: translations.menu.mathBlock,

      //@ts-ignore
      action: () => editor?.chain().focus().setMathBlock().run(),
    },
    {
      icon: icons.PieChart2LineIcon,
      label: translations.menu.mermaidBlock,

      //@ts-ignore
      action: () => editor?.chain().focus().setMermaidDiagram().run(),
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
      action: () => editor?.chain().focus().insertPaper().run(),
    },
  ];

  // Filter menu items by query
  const filteredMenuItems = menuItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
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
    ...filteredMenuItems.map((item, index) => ({
      component: (
        <button
          key={index}
          onClick={item.action}
          className="flex items-center p-2 rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#353333] transition duration-200"
        >
          <item.icon
            className={`text-black dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 mr-2 ${
              item.className || ""
            }`}
          />
          <div className="text-left">
            <h3 className="font-medium text-neutral-800 dark:text-[color:var(--selected-dark-text)]">
              {item.label}
            </h3>
          </div>
        </button>
      ),
    })),
    ...uploadComponents,
  ].slice(0, 5);

  return (
    <div className="z-50 fixed bg-white dark:bg-[#232222] rounded-lg shadow-lg border-2 shadow dark:border-neutral-600 p-4">
      {combinedItems.map((item) => item.component)}
    </div>
  );
};

export default SlashMenu;
