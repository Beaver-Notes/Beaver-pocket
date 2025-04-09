import { Note } from "../store/types";

export function revertAssetPaths(
  notes: Record<string, Note>
): Record<string, Note> {
  const updatedNotes: Record<string, Note> = JSON.parse(JSON.stringify(notes));

  for (const noteId in updatedNotes) {
    const note = updatedNotes[noteId];

    if (
      note.content &&
      typeof note.content === "object" &&
      "content" in note.content
    ) {
      if (note.content.content) {
        note.content.content = note.content.content.map((node: any) => {
          if (node.type === "image" && node.attrs && node.attrs.src) {
            node.attrs.src = node.attrs.src.replace(
              new RegExp(`note-assets/${noteId}/`, "g"),
              "assets://"
            );
          }
          if (
            (node.type === "fileEmbed" ||
              node.type === "Audio" ||
              node.type === "Video") &&
            node.attrs &&
            node.attrs.src
          ) {
            node.attrs.src = node.attrs.src.replace(
              new RegExp(`file-assets/${noteId}/`, "g"),
              "file-assets://"
            );
          }
          return node;
        });
      }
    }
  }

  return updatedNotes;
}

export function mergeNotes(
  localNotes: Record<string, Note>,
  remoteNotes: Record<string, Note>
): Record<string, Note> {
  const mergedNotes: Record<string, Note> = { ...localNotes };

  for (const [noteId, remoteNote] of Object.entries(remoteNotes)) {
    const localNote = mergedNotes[noteId];

    // Adjust asset paths for imported notes
    if (
      remoteNote.content &&
      typeof remoteNote.content === "object" &&
      "content" in remoteNote.content
    ) {
      if (remoteNote.content.content) {
        remoteNote.content.content = remoteNote.content.content.map(
          (node: any) => {
            if (node.type === "image" && node.attrs && node.attrs.src) {
              node.attrs.src = node.attrs.src.replace(
                "assets://",
                `note-assets/${noteId}/`
              );
            }
            if (
              (node.type === "fileEmbed" ||
                node.type === "Audio" ||
                node.type === "Video") &&
              node.attrs &&
              node.attrs.src
            ) {
              node.attrs.src = node.attrs.src.replace(
                "file-assets://",
                `file-assets/${noteId}/`
              );
            }
            return node;
          }
        );
      }
    }

    // Merge note logic
    if (!localNote) {
      // New note from remote
      mergedNotes[noteId] = remoteNote;
    } else if (
      remoteNote.updatedAt &&
      localNote.updatedAt &&
      new Date(remoteNote.updatedAt) > new Date(localNote.updatedAt)
    ) {
      // Remote note is newer
      mergedNotes[noteId] = remoteNote;
    }
  }

  return mergedNotes;
}
