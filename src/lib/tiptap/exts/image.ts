import { Plugin, PluginKey } from "prosemirror-state";
import ImageResize from "tiptap-extension-resize-image";
import { useDataPath } from "../../../store/useDataPath";
import {
  Filesystem,
  Directory as FilesystemDirectory,
} from "@capacitor/filesystem";

async function createDirectory(noteId: string): Promise<void> {
  const directoryPath = `note-assets/${noteId}`;

  try {
    await Filesystem.mkdir({
      path: directoryPath,
      directory: FilesystemDirectory.Data,
      recursive: true,
    });
  } catch (error) {
    console.error("Error creating the directory:", error);
  }
}

async function saveImageToFileSystem(file: File, noteId: string): Promise<{ imageUrl: string; fileUri: string }> {
  try {
    await createDirectory(noteId);
    const fileName = `${Date.now()}_${file.name}`;
    const reader = new FileReader();
    reader.readAsDataURL(file);

    await new Promise<void>((resolve, reject) => {
      reader.onload = () => resolve();
      reader.onerror = () => reject(new Error("Error reading file"));
    });

    const base64Data = (reader.result as string).split(",")[1];
    const filePath = `note-assets/${noteId}/${fileName}`;

    await Filesystem.writeFile({
      path: filePath,
      data: base64Data,
      directory: FilesystemDirectory.Data,
      recursive: true,
    });

    const { uri } = await Filesystem.getUri({
      directory: FilesystemDirectory.Data,
      path: filePath,
    });

    return { imageUrl: filePath, fileUri: uri };
  } catch (error) {
    console.error("Error saving image to file system:", error);
    return { imageUrl: "", fileUri: "" };
  }
}

const handleImagePaste = new Plugin({
  key: new PluginKey("handlePasteLink"),
  props: {
    handleDOMEvents: {
      paste: (view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return;

        const items: DataTransferItemList = clipboardData.items;
        const files = Array.from(items)
          .filter((item): item is DataTransferItem => item.kind === "file")
          .map((item) => item.getAsFile() as File);

        if (files.length > 0) {
          event.preventDefault();
          Promise.all(
            files.map(async (file) => {
              const { imageUrl } = await saveImageToFileSystem(file, "noteId");
              if (view.state.selection.empty) {
                const transaction = view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src: imageUrl })
                );
                view.dispatch(transaction);
              }
            })
          ).catch(console.error);
        }
      },
    },

    handleDrop: (view, event) => {
      if (!event.dataTransfer) return false;

      const imageFiles = Array.from(event.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (imageFiles.length === 0) return false;

      Promise.all(
        imageFiles.map(async (file) => {
          const { imageUrl } = await saveImageToFileSystem(file, "noteId");
          const { schema } = view.state;
          const coordinates = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });

          if (!coordinates) return false;

          const node = schema.nodes.image.create({ src: imageUrl });
          const transaction = view.state.tr.insert(coordinates.pos, node);
          view.dispatch(transaction);
        })
      ).catch(console.error);

      return true;
    },
  },
});

export default ImageResize.extend({
  addNodeView() {
    const viewer = this.parent?.() as any;
    return (props) => {
      const attrs = props.node.attrs;
      const node = {
        ...props.node,
        attrs: { ...attrs, src: useDataPath().getRemotePath(attrs.src) },
      };
      const newProps = { ...props, node };
      return viewer(newProps);
    };
  },
  addProseMirrorPlugins() {
    return [handleImagePaste];
  },
});
