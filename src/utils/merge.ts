import { Folder, Note } from "../store/types";

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
    folders?: Record<string, Folder>;
    labels?: string[];
    deletedIds?: Record<string, number>;
    deletedFolderIds?: Record<string, number>;
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

  const mergedDeletedFolderIds = { ...(localData.deletedFolderIds || {}) };
  for (const [id, timestamp] of Object.entries(remoteData.deletedFolderIds || {})) {
    if (!mergedDeletedFolderIds[id] || timestamp > mergedDeletedFolderIds[id]) {
      mergedDeletedFolderIds[id] = timestamp;
    }
  }

  const mergedNotes = mergeNotesWithDeletedIds(
    localData.notes || {},
    remoteData.notes || {},
    mergedDeletedIds,
    mergedDeletedFolderIds
  );

  const mergedFolders = mergeFoldersWithDeletedIds(
    localData.folders || {},
    remoteData.folders || {},
    mergedDeletedFolderIds
  );


  const allLabels = [...(localData.labels || []), ...(remoteData.labels || [])];
  const mergedLabels = [...new Set(allLabels)];

  console.log("Data merged successfully");

  return {
    data: {
      notes: mergedNotes,
      folders: mergedFolders,
      labels: mergedLabels,
      deletedIds: mergedDeletedIds,
    },
  };
}

export function mergeNotesWithDeletedIds(
  localNotes: Record<string, Note>,
  remoteNotes: Record<string, Note>,
  deletedIds: Record<string, number>,
  deletedFolderIds: Record<string, number>
): Record<string, Note> {
  const mergedNotes: Record<string, Note> = {};

  // Process local notes
  for (const [noteId, localNoteRaw] of Object.entries(localNotes)) {
    if (deletedIds[noteId]) continue;

    let localNote = { ...localNoteRaw }; // <-- now mutable

    // If folder was deleted after note updated → nullify folderId
    if (localNote.folderId && deletedFolderIds[localNote.folderId]) {
      const folderDeletionTime = deletedFolderIds[localNote.folderId];
      const noteUpdateTime = localNote.updatedAt ? new Date(localNote.updatedAt).getTime() : 0;

      if (folderDeletionTime > noteUpdateTime) {
        localNote.folderId = null; // ✅ safe now
      }
    }

    mergedNotes[noteId] = processNotePaths(noteId, localNote);
  }


  // Process remote notes
  for (const [noteId, remoteNoteRaw] of Object.entries(remoteNotes)) {
    if (deletedIds[noteId]) continue;

    let remoteNote = { ...remoteNoteRaw };

    if (remoteNote.folderId && deletedFolderIds[remoteNote.folderId]) {
      const folderDeletionTime = deletedFolderIds[remoteNote.folderId];
      const noteUpdateTime = remoteNote.updatedAt ? new Date(remoteNote.updatedAt).getTime() : 0;

      if (folderDeletionTime > noteUpdateTime) {
        remoteNote.folderId = null;
      }
    }

    const processedRemoteNote = processNotePaths(noteId, remoteNote);
    const existingNote = mergedNotes[noteId];

    if (
      !existingNote ||
      (processedRemoteNote.updatedAt &&
        existingNote.updatedAt &&
        new Date(processedRemoteNote.updatedAt) > new Date(existingNote.updatedAt))
    ) {
      mergedNotes[noteId] = processedRemoteNote;
    }
  }

  return mergedNotes;
}

export function mergeFoldersWithDeletedIds(
  localFolders: Record<string, Folder>,
  remoteFolders: Record<string, Folder>,
  deletedFolderIds: Record<string, number>
): Record<string, Folder> {
  const mergedFolders: Record<string, Folder> = {};

  // Process local folders
  for (const [folderId, localFolder] of Object.entries(localFolders)) {
    if (
      deletedFolderIds[folderId] &&
      localFolder.updatedAt &&
      deletedFolderIds[folderId] >= new Date(localFolder.updatedAt).getTime()
    ) {
      continue;
    }
    mergedFolders[folderId] = localFolder;
  }

  // Process remote folders
  for (const [folderId, remoteFolder] of Object.entries(remoteFolders)) {
    if (
      deletedFolderIds[folderId] &&
      remoteFolder.updatedAt &&
      deletedFolderIds[folderId] >= new Date(remoteFolder.updatedAt).getTime()
    ) {
      continue;
    }

    const existingFolder = mergedFolders[folderId];
    if (
      !existingFolder ||
      (remoteFolder.updatedAt &&
        existingFolder.updatedAt &&
        new Date(remoteFolder.updatedAt).getTime() > new Date(existingFolder.updatedAt).getTime())
    ) {
      mergedFolders[folderId] = remoteFolder;
    }
  }

  return mergedFolders;
}


export function processNotePaths(noteId: string, note: Note): Note {
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
