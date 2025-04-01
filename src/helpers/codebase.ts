export interface FileSystemItem {
  fileName: string;
  folderPath: string;
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


export const CODEBASE = {

  files: [] as FileItem[],

};
