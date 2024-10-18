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
const SlashMenu: React.FC<SlashMenuProps> = ({
  noteId,
  editor,
  query,
}) => {
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
    menuItems: {
      fileLabel: "menuItems.fileLabel",
      fileDescription: "menuItems.fileDescription",
      imageLabel: "menuItems.imageLabel",
      imageDescription: "menuItems.imageDescription",
      videoLabel: "menuItems.videoLabel",
      videoDescription: "menuItems.videoDescription",
      paragraphLabel: "menuItems.paragraphLabel",
      paragraphDescription: "menuItems.paragraphDescription",
      heading1Label: "menuItems.heading1Label",
      heading1Description: "menuItems.heading1Description",
      heading2Label: "menuItems.heading2Label",
      heading2Description: "menuItems.heading2Description",
      heading3Label: "menuItems.heading3Label",
      heading3Description: "menuItems.heading3Description",
      heading4Label: "menuItems.heading4Label",
      heading4Description: "menuItems.heading4Description",
      heading5Label: "menuItems.heading5Label",
      heading5Description: "menuItems.heading5Description",
      heading6Label: "menuItems.heading6Label",
      heading6Description: "menuItems.heading6Description",
      quoteLabel: "menuItems.quoteLabel",
      quoteDescription: "menuItems.quoteDescription",
      codeLabel: "menuItems.codeLabel",
      codeDescription: "menuItems.codeDescription",
      tableLabel: "menuItems.tableLabel",
      tableDescription: "menuItems.tableDescription",
      bulletListLabel: "menuItems.bulletListLabel",
      bulletListDescription: "menuItems.bulletListDescription",
      orderedListLabel: "menuItems.orderedListLabel",
      orderedListDescription: "menuItems.orderedListDescription",
      checklistLabel: "menuItems.checklistLabel",
      checklistDescription: "menuItems.checklistDescription",
      blackCalloutLabel: "menuItems.blackCalloutLabel",
      blackCalloutDescription: "menuItems.blackCalloutDescription",
      blueCalloutLabel: "menuItems.blueCalloutLabel",
      blueCalloutDescription: "menuItems.blueCalloutDescription",
      greenCalloutLabel: "menuItems.greenCalloutLabel",
      greenCalloutDescription: "menuItems.greenCalloutDescription",
      purpleCalloutLabel: "menuItems.purpleCalloutLabel",
      purpleCalloutDescription: "menuItems.purpleCalloutDescription",
      redCalloutLabel: "menuItems.redCalloutLabel",
      redCalloutDescription: "menuItems.redCalloutDescription",
      yellowCalloutLabel: "menuItems.yellowCalloutLabel",
      yellowCalloutDescription: "menuItems.yellowCalloutDescription",
      mathBlockLabel: "menuItems.mathBlockLabel",
      mathBlockDescription: "menuItems.mathBlockDescription",
      mermaidBlockLabel: "menuItems.mermaidBlockLabel",
      mermaidBlockDescription: "menuItems.mermaidBlockDescription",
      embedLabel: "menuItems.embedLabel",
      embedDescription: "menuItems.embedDescription",
      drawingBlockLabel: "menuItems.drawingBlockLabel",
      drawingBlockDescription: "menuItems.drawingBlockDescription",
    },
  });

  const menuItems = [
    {
      icon: icons.ParagraphIcon,
      label: translations.menuItems.paragraphLabel,
      description: translations.menuItems.paragraphDescription,
      action: () => editor.chain().focus().setParagraph().run(),
    },
    {
      icon: icons.Heading1Icon,
      label: translations.menuItems.heading1Label,
      description: translations.menuItems.heading1Description,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      icon: icons.Heading2Icon,
      label: translations.menuItems.heading2Label,
      description: translations.menuItems.heading2Description,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: icons.Heading3Icon,
      label: translations.menuItems.heading3Label,
      description: translations.menuItems.heading3Description,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: icons.Heading4Icon,
      label: translations.menuItems.heading4Label,
      description: translations.menuItems.heading4Description,
      action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    },
    {
      icon: icons.Heading5Icon,
      label: translations.menuItems.heading5Label,
      description: translations.menuItems.heading5Description,
      action: () => editor.chain().focus().toggleHeading({ level: 5 }).run(),
    },
    {
      icon: icons.Heading6Icon,
      label: translations.menuItems.heading6Label,
      description: translations.menuItems.heading6Description,
      action: () => editor.chain().focus().toggleHeading({ level: 6 }).run(),
    },
    {
      icon: icons.DoubleQuotesLIcon,
      label: translations.menuItems.quoteLabel,
      description: translations.menuItems.quoteDescription,
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: icons.CodeBoxLineIcon,
      label: translations.menuItems.codeLabel,
      description: translations.menuItems.codeDescription,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      icon: icons.Table2Icon,
      label: translations.menuItems.tableLabel,
      description: translations.menuItems.tableDescription,
      action: () =>
        editor?.commands.insertTable({
          rows: 3,
          cols: 3,
          withHeaderRow: true,
        }),
    },
    {
      icon: icons.ListUnorderedIcon,
      label: translations.menuItems.bulletListLabel,
      description: translations.menuItems.bulletListDescription,
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: icons.ListOrderedIcon,
      label: translations.menuItems.orderedListLabel,
      description: translations.menuItems.orderedListDescription,
      action: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: icons.ListCheck2Icon,
      label: translations.menuItems.checklistLabel,
      description: translations.menuItems.checklistDescription,
      action: () => editor?.chain().focus().toggleTaskList().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menuItems.blackCalloutLabel,
      description: translations.menuItems.blackCalloutDescription,
      className: "dark:text-neutral-400",
      //@ts-ignore
      action: () => editor?.chain().focus().setBlackCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menuItems.blueCalloutLabel,
      description: translations.menuItems.blueCalloutDescription,
      className: "text-blue-500 dark:text-blue-500",
      //@ts-ignore
      action: () => editor?.chain().focus().setBlueCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menuItems.greenCalloutLabel,
      description: translations.menuItems.greenCalloutDescription,
      className: "text-green-600 dark:text-green-600",
      //@ts-ignore
      action: () => editor?.chain().focus().setGreenCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menuItems.purpleCalloutLabel,
      description: translations.menuItems.purpleCalloutDescription,
      className: "text-purple-500 dark:text-purple-500",
      //@ts-ignore
      action: () => editor?.chain().focus().setPurpleCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menuItems.redCalloutLabel,
      description: translations.menuItems.redCalloutDescription,
      className: "text-red-500 dark:text-red-500",
      //@ts-ignore
      action: () => editor?.chain().focus().setRedCallout().run(),
    },
    {
      icon: icons.SingleQuotesLIcon,
      label: translations.menuItems.yellowCalloutLabel,
      description: translations.menuItems.yellowCalloutDescription,
      className: "text-yellow-500 dark:text-yellow-500",
      //@ts-ignore

      action: () => editor?.chain().focus().setYellowCallout().run(),
    },
    {
      icon: icons.CalculatorLineIcon,
      label: translations.menuItems.mathBlockLabel,
      description: translations.menuItems.mathBlockDescription,
      //@ts-ignore
      action: () => editor?.chain().focus().setMathBlock().run(),
    },
    {
      icon: icons.PieChart2LineIcon,
      label: translations.menuItems.mermaidBlockLabel,
      description: translations.menuItems.mermaidBlockDescription,
      //@ts-ignore
      action: () => editor?.chain().focus().setMermaidDiagram().run(),
    },
    {
      icon: icons.PagesLineIcon,
      label: translations.menuItems.embedLabel,
      description: translations.menuItems.embedDescription,
      action: handleAddIframe,
    },
    {
      icon: icons.BrushLineIcon,
      label: translations.menuItems.drawingBlockLabel,
      description: translations.menuItems.drawingBlockDescription,
      //@ts-ignore
      action: () => editor?.chain().focus().insertPaper().run(),
    },
  ];

  // Filter menu items by query
  const filteredMenuItems = menuItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  // Check if the query matches partial words for the upload components
  const showImageUpload = translations.menuItems.imageLabel
    .toLowerCase()
    .includes(query.toLowerCase());
  const showFileUpload = translations.menuItems.fileLabel
    .toLowerCase()
    .includes(query.toLowerCase());
  const showVideoUpload = translations.menuItems.videoLabel
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
            <p className="text-sm text-neutral-500 dark:text-[color:var(--selected-dark-text)]">
              {item.description}
            </p>
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
