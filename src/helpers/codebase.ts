export interface FileSystemItem {
  name: string;
}


export interface File extends FileSystemItem {
  content: {
    type: "binary";
  } | {
    type: "text";
    text: string;
  };
}


interface Folder extends FileSystemItem {
  folders: Folder[];
  files: File[];
}



export const CODEBASE = {

  content: {
    folders: [] as Folder[],
    files: [] as File[],
  },

  updatedAt: new Date(0),

}
