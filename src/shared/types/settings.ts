export interface RootFolder {
  path: string;
  enabled: boolean;
  label?: string;
}

export interface AppSettings {
  folders: {
    roots: RootFolder[];
    destination: string;
    destinationMode: 'custom' | 'in-place';
    trashMode: 'recycle-bin' | 'app-trash' | 'permanent';
    appTrashPath?: string;
  };
  scanning: {
    includeSubfolders: boolean;
    maxDepth: number;
    excludePatterns: string[];
    minFileSize: number; // bytes
    maxFileSize: number; // bytes, 0 means unlimited
    supportedExtensions: string[];
  };
  quality: {
    blurThreshold: number; // 0-100 (below = blurry)
    darknessThreshold: number; // 0-255 (below = dark)
    duplicateHashDistance: number; // Hamming distance (default: 10)
    screenshotDetection: boolean;
    minResolution: number; // width * height, below = flagged as low res
  };
  organization: {
    folderPattern: string; // e.g. "YYYY/MM/", "YYYY-MM-DD/", "YYYY/MM - MonthName/"
    conflictResolution: 'rename' | 'skip' | 'overwrite';
    preserveOriginals: boolean; // Copy instead of move
  };
  ui: {
    theme: 'dark' | 'light' | 'system';
    fontSize?: 'sm' | 'md' | 'lg' | 'xl';
    gridColumns: number;
    thumbnailSize: 'sm' | 'md' | 'lg';
    confirmBeforeDelete: boolean;
    defaultView: 'grid' | 'list' | 'timeline';
    reviewOrder: 'worst-first' | 'oldest-first' | 'newest-first' | 'random';
  };
  performance: {
    thumbnailCacheMaxMB: number;
    scanBatchSize: number;
    maxConcurrentOps: number;
  };
}
