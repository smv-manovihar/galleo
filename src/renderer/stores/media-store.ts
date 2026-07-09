import { create } from 'zustand';
import type { MediaItem } from '../../shared/types/media';

interface MediaState {
  items: MediaItem[];
  selectedItemId: string | null;
  isLoading: boolean;
  searchQuery: string;
  filterType: 'all' | 'photo' | 'video';
  filterQuality: 'all' | 'blurry' | 'dark' | 'duplicates' | 'screenshots' | 'small' | 'pending';
  sortBy: 'date-desc' | 'date-asc' | 'score-desc' | 'score-asc' | 'size-desc';
  activeRootPath: string | null;
  
  // Scanning State
  isScanning: boolean;
  isStopping: boolean;
  scanProgress: {
    scannedCount: number;
    totalCount: number;
    currentFile?: string;
  };

  fetchMediaItems: (folderPath: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterType: (type: 'all' | 'photo' | 'video') => void;
  setFilterQuality: (quality: 'all' | 'blurry' | 'dark' | 'duplicates' | 'screenshots' | 'small' | 'pending') => void;
  setSortBy: (sort: 'date-desc' | 'date-asc' | 'score-desc' | 'score-asc' | 'size-desc') => void;
  setSelectedItemId: (id: string | null) => void;
  setActiveRootPath: (path: string | null) => void;
  
  // Scan Actions
  startScan: (rootPaths: string[], forceRescan?: boolean) => Promise<void>;
  cancelScan: () => Promise<void>;
  getFilteredItems: () => MediaItem[];
}

export const useMediaStore = create<MediaState>((set, get) => ({
  items: [],
  selectedItemId: null,
  isLoading: false,
  searchQuery: '',
  filterType: 'all',
  filterQuality: 'all',
  sortBy: 'date-desc',
  activeRootPath: null,
  
  isScanning: false,
  isStopping: false,
  scanProgress: {
    scannedCount: 0,
    totalCount: 0
  },

  fetchMediaItems: async (folderPath: string) => {
    set({ isLoading: true, activeRootPath: folderPath });
    try {
      const items = await window.api.getMediaItems(folderPath);
      set({ items, isLoading: false });
    } catch {
      set({ items: [], isLoading: false });
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterType: (filterType) => set({ filterType }),
  setFilterQuality: (filterQuality) => set({ filterQuality }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSelectedItemId: (selectedItemId) => set({ selectedItemId }),
  setActiveRootPath: (activeRootPath) => set({ activeRootPath }),

  startScan: async (rootPaths: string[], forceRescan: boolean = false) => {
    if (rootPaths.length === 0) return;
    
    set({
      isScanning: true,
      isStopping: false,
      scanProgress: { scannedCount: 0, totalCount: 0, currentFile: 'Discovered directories...' }
    });

    // Register IPC listener callbacks
    const cleanupProgress = window.api.onScanProgress((payload) => {
      set((state) => {
        // Merge streamed items with existing list, avoiding duplicate items by keying ID
        const itemMap = new Map(state.items.map(i => [i.id, i]));
        for (const item of payload.items) {
          itemMap.set(item.id, item);
        }
        return {
          items: Array.from(itemMap.values()),
          scanProgress: {
            scannedCount: payload.scannedCount,
            totalCount: payload.totalCount,
            currentFile: payload.currentFile
          }
        };
      });
    });

    const cleanupComplete = window.api.onScanComplete(async () => {
      cleanupProgress();
      cleanupComplete();
      set({ isScanning: false, isStopping: false });
      // Refresh current folder items to load newly populated EXIF/duplicates
      const { activeRootPath } = get();
      if (activeRootPath) {
        await get().fetchMediaItems(activeRootPath);
      }
    });

    const res = await window.api.startScan(rootPaths, forceRescan);
    if (!res.ok) {
      cleanupProgress();
      cleanupComplete();
      set({ isScanning: false, isStopping: false });
    }
  },

  cancelScan: async () => {
    set({ isStopping: true });
    await window.api.cancelScan();
  },

  getFilteredItems: () => {
    const { items, searchQuery, filterType, filterQuality, sortBy } = get();
    let result = [...items];

    // 1. Text Search Filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.path.toLowerCase().includes(q)
      );
    }

    // 2. Type Filter (photo / video)
    if (filterType !== 'all') {
      result = result.filter(item => item.mediaType === filterType);
    }

    // 3. Quality Metrics Filter
    if (filterQuality !== 'all') {
      if (filterQuality === 'pending') {
        result = result.filter(item => item.reviewState === 'pending');
      } else if (filterQuality === 'blurry') {
        result = result.filter(item => item.quality?.isBlurry === true);
      } else if (filterQuality === 'dark') {
        result = result.filter(item => item.quality?.isDark === true);
      } else if (filterQuality === 'screenshots') {
        result = result.filter(item => item.quality?.isScreenshot === true);
      } else if (filterQuality === 'small') {
        result = result.filter(item => item.quality?.isSmall === true);
      } else if (filterQuality === 'duplicates') {
        result = result.filter(item => item.isDuplicate === true);
      }
    }

    // 4. Sorting logic
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.dateTarget).getTime() - new Date(a.dateTarget).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.dateTarget).getTime() - new Date(b.dateTarget).getTime();
      }
      if (sortBy === 'score-desc') {
        const scoreA = a.quality?.compositeScore ?? 0;
        const scoreB = b.quality?.compositeScore ?? 0;
        return scoreB - scoreA;
      }
      if (sortBy === 'score-asc') {
        const scoreA = a.quality?.compositeScore ?? 0;
        const scoreB = b.quality?.compositeScore ?? 0;
        return scoreA - scoreB;
      }
      if (sortBy === 'size-desc') {
        return b.size - a.size;
      }
      return 0;
    });

    return result;
  }
}));
