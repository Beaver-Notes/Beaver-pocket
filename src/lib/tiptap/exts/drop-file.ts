import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { saveImageToFileSystem } from "./image";
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";

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

export const saveFileToFileSystem = async (
  file: File,
  noteId: any
): Promise<{ fileUrl: string; fileName: string }> => {
  try {
    await createDirectory(noteId);
    const fileName = `${Date.now()}_${file.name}`;

    // Read file contents as data URL
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);

    return new Promise((resolve, reject) => {
      fileReader.onload = async () => {
        const fileDataUrl = fileReader.result as string;

        // Write file to filesystem under "file-assets/noteId" directory
        const filePath = `file-assets/${noteId}/${fileName}`;
        try {
          await Filesystem.writeFile({
            path: filePath,
            data: fileDataUrl.split(",")[1], // Write only base64 data
            directory: FilesystemDirectory.Data,
            recursive: true,
          });

          resolve({ fileUrl: filePath, fileName });
        } catch (error) {
          console.error("Error writing file to filesystem:", error);
          reject(error); // Reject promise on error
        }
      };

      fileReader.onerror = (error) => {
        console.error("Error reading file:", error);
        reject(error); // Reject promise on error
      };
    });
  } catch (error) {
    console.error("Error saving file to file system:", error);
    return { fileUrl: "", fileName: "" };
  }
};

export const dropFile = Extension.create({
  name: "dropFile",

  addOptions() {
    return {
      id: "", // Default empty ID
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("dropFile"),
        props: {
          handleDOMEvents: {
            drop: (view, event) => {
              event.preventDefault();
              event.stopPropagation();

              const { editor } = this;
              const id = this.options.id;

              if (!id) {
                console.error("Error: Missing document ID");
                return false;
              }

              const files = event.dataTransfer?.files;
              if (!files || files.length === 0) return false;

              (async () => {
                try {
                  for (const file of files) {
                    const mimeType = file.type;

                    if (mimeType.startsWith("image/")) {
                      if (!event.dataTransfer) return false;

                      const imageFiles = Array.from(
                        event.dataTransfer.files
                      ).filter((file) => file.type.startsWith("image/"));

                      if (imageFiles.length === 0) return false;

                      await Promise.all(
                        imageFiles.map(async (file) => {
                          const { imageUrl } = await saveImageToFileSystem(
                            file,
                            "noteId"
                          );
                          const { schema } = view.state;
                          const coordinates = view.posAtCoords({
                            left: event.clientX,
                            top: event.clientY,
                          });

                          if (!coordinates) return false;

                          const node = schema.nodes.image.create({
                            src: imageUrl,
                          });
                          const transaction = view.state.tr.insert(
                            coordinates.pos,
                            node
                          );
                          view.dispatch(transaction);
                        })
                      );

                      return true;
                    }

                    const { fileUrl, fileName } = await saveFileToFileSystem(
                      file,
                      id
                    );

                    if (mimeType.startsWith("audio/")) {
                      //@ts-ignore
                      editor.chain().setAudio(fileUrl).run();
                    } else if (mimeType.startsWith("video/")) {
                      //@ts-ignore
                      editor.chain().setVideo(fileUrl).run();
                    } else {
                      //@ts-ignore
                      editor.chain().setFileEmbed(fileUrl, fileName).run();
                    }
                  }
                } catch (error) {
                  console.error("Error saving and embedding files:", error);
                }
              })();

              return true;
            },
          },
        },
      }),
    ];
  },
});
