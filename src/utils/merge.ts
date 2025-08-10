import { Note } from "../store/types";

export function revertAssetPaths(
  notes: Record<string, Note>
): Record<string, Note> {
  const cleanedNotes: Record<string, Note> = {};

  for (const [noteId, note] of Object.entries(notes)) {
    const cleanedNote = JSON.parse(JSON.stringify(note));

    if (
      cleanedNote.content &&
      typeof cleanedNote.content === "object" &&
      "content" in cleanedNote.content &&
      Array.isArray(cleanedNote.content.content)
    ) {
      cleanedNote.content.content = cleanedNote.content.content.map(
        (node: any) => {
          // Handle images: note-assets/<id>/file → assets://<id>/file
          if (node.type === "image" && node.attrs && node.attrs.src) {
            if (node.attrs.src.startsWith("data:")) {
              return node; // preserve base64
            }

            // Only process file-path types below
            if (node.attrs.src.startsWith(`note-assets/${noteId}/`)) {
              const filename = node.attrs.src.replace(`note-assets/${noteId}/`, "");
              node.attrs.src = `assets://${noteId}/${filename}`;
            }
          }

          // Handle file embeds, audio, video
          if (
            (node.type === "fileEmbed" ||
              node.type === "Audio" ||
              node.type === "Video") &&
            node.attrs &&
            node.attrs.src &&
            node.attrs.src.startsWith(`file-assets/${noteId}/`)
          ) {
            const filename = node.attrs.src.replace(`file-assets/${noteId}/`, "");
            node.attrs.src = `file-assets://${noteId}/${filename}`;
          }

          return node;
        }
      );
    }

    cleanedNotes[noteId] = cleanedNote;
  }

  return cleanedNotes;
}

export interface SyncData {
  data: {
    notes: Record<string, Note>;
    labels?: string[];
    deletedIds?: Record<string, number>;
  };
}

export function mergeData(
  localWrapped: SyncData,
  remoteWrapped: SyncData
): SyncData {
  const localData = localWrapped.data || {};
  const remoteData = remoteWrapped.data || {};

  const mergedDeletedIds = { ...(localData.deletedIds || {}) };
  for (const [id, timestamp] of Object.entries(remoteData.deletedIds || {})) {
    if (!mergedDeletedIds[id] || timestamp > mergedDeletedIds[id]) {
      mergedDeletedIds[id] = timestamp;
    }
  }

  const mergedNotes = mergeNotesWithDeletedIds(
    localData.notes || {},
    remoteData.notes || {},
    mergedDeletedIds
  );

  const allLabels = [...(localData.labels || []), ...(remoteData.labels || [])];
  const mergedLabels = [...new Set(allLabels)];

  console.log("Data merged successfully");

  return {
    data: {
      notes: mergedNotes,
      labels: mergedLabels,
      deletedIds: mergedDeletedIds,
    },
  };
}

export function mergeNotesWithDeletedIds(
  localNotes: Record<string, Note>,
  remoteNotes: Record<string, Note>,
  deletedIds: Record<string, number>
): Record<string, Note> {
  const mergedNotes: Record<string, Note> = {};

  // Process local notes
  for (const [noteId, localNote] of Object.entries(localNotes)) {
    if (deletedIds[noteId]) continue;
    mergedNotes[noteId] = processNotePaths(noteId, localNote); // ← Fixed: process local!
  }

  // Process remote notes
  for (const [noteId, remoteNote] of Object.entries(remoteNotes)) {
    if (deletedIds[noteId]) continue;

    const processedRemoteNote = processNotePaths(noteId, remoteNote);
    const existingNote = mergedNotes[noteId];

    if (!existingNote) {
      mergedNotes[noteId] = processedRemoteNote;
    } else if (
      processedRemoteNote.updatedAt &&
      existingNote.updatedAt &&
      new Date(processedRemoteNote.updatedAt) > new Date(existingNote.updatedAt)
    ) {
      mergedNotes[noteId] = processedRemoteNote;
    }
  }

  return mergedNotes;
}

function processNotePaths(noteId: string, note: Note): Note {
  const processedNote = { ...note };

  if (
    processedNote.content &&
    typeof processedNote.content === "object" &&
    "content" in processedNote.content &&
    Array.isArray(processedNote.content.content)
  ) {
    processedNote.content.content = processedNote.content.content.map(
      (node: any) => {
        // Handle images: assets://<noteId>/file → note-assets/<noteId>/file
        if (
          node.type === "image" &&
          node.attrs &&
          node.attrs.src &&
          node.attrs.src.startsWith(`assets://${noteId}/`)
        ) {
          const filename = node.attrs.src.replace(`assets://${noteId}/`, "");
          node.attrs.src = `note-assets/${noteId}/${filename}`;
        }

        // Handle file embeds, audio, video
        if (
          (node.type === "fileEmbed" ||
            node.type === "Audio" ||
            node.type === "Video") &&
          node.attrs &&
          node.attrs.src &&
          node.attrs.src.startsWith(`file-assets://${noteId}/`)
        ) {
          const filename = node.attrs.src.replace(`file-assets://${noteId}/`, "");
          node.attrs.src = `file-assets/${noteId}/${filename}`;
        }

        return node;
      }
    );
  }

  return processedNote;
}
