export interface FileSystemItem {
  name: string;
  absoluteParentPath: string;
  updatedAt: string;
}


export interface FileItem extends FileSystemItem {
  content: {
    type: "link";
    target: string;
  } | {
    type: "binary";
    size: number;
  } | {
    type: "text";
    text: string;
  };
}


export interface FolderItem extends FileSystemItem {
  folders: FolderItem[];
  files: FileItem[];
}


export const CODEBASE = {

  content: null as FolderItem | FileItem | null,

};
