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
      "content" in cleanedNote.content
    ) {
      if (cleanedNote.content.content) {
        cleanedNote.content.content = cleanedNote.content.content.map(
          (node: any) => {
            if (node.type === "image" && node.attrs && node.attrs.src) {
              node.attrs.src = node.attrs.src.replace(
                `note-assets/${noteId}/`,
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
                `file-assets/${noteId}/`,
                "file-assets://"
              );
            }
            return node;
          }
        );
      }
    }

    cleanedNotes[noteId] = cleanedNote;
  }

  return cleanedNotes;
}

export interface SyncData {
  data: {
    notes: Record<string, Note>;
    labels?: string[];
    lockStatus?: Record<string, any>;
    isLocked?: Record<string, any>;
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

  const mergedLockStatus = {
    ...(localData.lockStatus || {}),
    ...(remoteData.lockStatus || {}),
  };

  const mergedIsLocked = {
    ...(localData.isLocked || {}),
    ...(remoteData.isLocked || {}),
  };

  console.log("Data merged successfully");

  return {
    data: {
      notes: mergedNotes,
      labels: mergedLabels,
      lockStatus: mergedLockStatus,
      isLocked: mergedIsLocked,
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

  for (const [noteId, localNote] of Object.entries(localNotes)) {
    if (deletedIds[noteId]) continue;
    mergedNotes[noteId] = localNote;
  }

  for (const [noteId, remoteNote] of Object.entries(remoteNotes)) {
    if (deletedIds[noteId]) continue;

    const localNote = mergedNotes[noteId];
    const processedRemoteNote = processNotePaths(noteId, remoteNote);

    if (!localNote) {
      mergedNotes[noteId] = processedRemoteNote;
    } else if (
      processedRemoteNote.updatedAt &&
      localNote.updatedAt &&
      new Date(processedRemoteNote.updatedAt) > new Date(localNote.updatedAt)
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
    "content" in processedNote.content
  ) {
    if (processedNote.content.content) {
      processedNote.content.content = processedNote.content.content.map(
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

  console.log(`Processed note paths for note ID: ${noteId}`, processedNote);

  return processedNote;
}
