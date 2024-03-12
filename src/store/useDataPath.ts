let remoteStorePath = '';
export function setStoreRemotePath(path: string) {
  remoteStorePath = path + '/';
}

function isUrl(url: string) {
  if (!url) {
    return false;
  }
  return /^.*:\/\//.test(url)
}

export function useDataPath() {
  return {
    getRemotePath(relativePath: string): string {
      if (isUrl(relativePath)) {
        return relativePath;
      }
      return `${remoteStorePath}${relativePath}`;
    }
  }
}
