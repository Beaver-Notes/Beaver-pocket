import { Note } from "../store/types";

export function revertAssetPaths(
  notes: Record<string, Note>
): Record<string, Note> {
  const cleanedNotes: Record<string, Note> = {};

  for (const [noteId, note] of Object.entries(notes)) {
    // Create a deep copy to avoid modifying the original
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
  notes: Record<string, Note>;
  labels?: string[];
  lockStatus?: Record<string, any>;
  isLocked?: Record<string, any>;
  deletedIds?: Record<string, number>;
}

export function mergeData(localData: SyncData, remoteData: SyncData): SyncData {
  // First merge deletedIds - keep the latest deletion timestamp
  const mergedDeletedIds = { ...(localData.deletedIds || {}) };
  for (const [id, timestamp] of Object.entries(remoteData.deletedIds || {})) {
    if (!mergedDeletedIds[id] || timestamp > mergedDeletedIds[id]) {
      mergedDeletedIds[id] = timestamp;
    }
  }

  // Process notes, taking into account deletedIds
  const mergedNotes = mergeNotesWithDeletedIds(
    localData.notes || {},
    remoteData.notes || {},
    mergedDeletedIds
  );

  // Combine labels (remove duplicates)
  const allLabels = [...(localData.labels || []), ...(remoteData.labels || [])];
  const mergedLabels = [...new Set(allLabels)];

  // Merge lockStatus - prefer remote in case of conflict
  const mergedLockStatus = {
    ...(localData.lockStatus || {}),
    ...(remoteData.lockStatus || {}),
  };

  // Merge isLocked - prefer remote in case of conflict
  const mergedIsLocked = {
    ...(localData.isLocked || {}),
    ...(remoteData.isLocked || {}),
  };

  console.log("Data merged successfully");

  return {
    notes: mergedNotes,
    labels: mergedLabels,
    lockStatus: mergedLockStatus,
    isLocked: mergedIsLocked,
    deletedIds: mergedDeletedIds,
  };
}

export function mergeNotesWithDeletedIds(
  localNotes: Record<string, Note>,
  remoteNotes: Record<string, Note>,
  deletedIds: Record<string, number>
): Record<string, Note> {
  const mergedNotes: Record<string, Note> = {};

  // Process all local notes that haven't been deleted
  for (const [noteId, localNote] of Object.entries(localNotes)) {
    // Skip if note has been deleted
    if (deletedIds[noteId]) continue;

    mergedNotes[noteId] = localNote;
  }

  // Process remote notes, adjusting paths and applying merge logic
  for (const [noteId, remoteNote] of Object.entries(remoteNotes)) {
    // Skip if note has been deleted
    if (deletedIds[noteId]) continue;

    const localNote = mergedNotes[noteId];

    // Adjust asset paths for imported notes
    const processedRemoteNote = processNotePaths(noteId, remoteNote);

    // Merge note logic
    if (!localNote) {
      // New note from remote
      mergedNotes[noteId] = processedRemoteNote;
    } else if (
      processedRemoteNote.updatedAt &&
      localNote.updatedAt &&
      new Date(processedRemoteNote.updatedAt) > new Date(localNote.updatedAt)
    ) {
      // Remote note is newer
      mergedNotes[noteId] = processedRemoteNote;
    }
  }

  return mergedNotes;
}

// Helper function to process note paths
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
