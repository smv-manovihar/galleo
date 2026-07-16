import { create } from 'zustand';
import type { MediaItem } from '../../shared/types/media';
import { useSettingsStore } from './settings-store';

interface MediaState {
  items: MediaItem[];
  selectedItemId: string | null;
  isLoading: boolean;
  searchQuery: string;
  filterType: 'all' | 'photo' | 'video';
  filterReviewState: 'all' | 'pending' | 'kept' | 'trash';
  filterQuality: 'all' | 'blurry' | 'dark' | 'duplicates' | 'screenshots' | 'small';
  sortBy: 'date-desc' | 'date-asc' | 'score-desc' | 'score-asc' | 'size-desc';
  activeRootPath: string | null;

  fetchMediaItems: (folderPath: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterType: (type: 'all' | 'photo' | 'video') => void;
  setFilterReviewState: (state: 'all' | 'pending' | 'kept' | 'trash') => void;
  setFilterQuality: (quality: 'all' | 'blurry' | 'dark' | 'duplicates' | 'screenshots' | 'small') => void;
  setSortBy: (sort: 'date-desc' | 'date-asc' | 'score-desc' | 'score-asc' | 'size-desc') => void;
  setSelectedItemId: (id: string | null) => void;
  setActiveRootPath: (path: string | null) => void;
  getFilteredItems: () => MediaItem[];
}

export const useMediaStore = create<MediaState>((set, get) => ({
  items: [],
  selectedItemId: null,
  isLoading: false,
  searchQuery: '',
  filterType: 'all',
  filterReviewState: 'all',
  filterQuality: 'all',
  sortBy: 'date-desc',
  activeRootPath: null,

  fetchMediaItems: async (folderPath: string) => {
    set({ isLoading: true, activeRootPath: folderPath });
    try {
      const items = await window.api.getMediaItems(folderPath);

      // Filter out items belonging to disabled root folders
      const { settings } = useSettingsStore.getState();
      const disabledPrefixes = settings.folders.roots
        .filter(r => !r.enabled)
        .map(r => r.path.replace(/\\/g, '/').toLowerCase());

      const visibleItems = disabledPrefixes.length === 0
        ? items
        : items.filter(item => {
            const normalizedPath = item.path.replace(/\\/g, '/').toLowerCase();
            return !disabledPrefixes.some(prefix => normalizedPath.startsWith(prefix));
          });

      set({ items: visibleItems, isLoading: false });
    } catch {
      set({ items: [], isLoading: false });
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterType: (filterType) => set({ filterType }),
  setFilterReviewState: (filterReviewState) => set({ filterReviewState }),
  setFilterQuality: (filterQuality) => set({ filterQuality }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSelectedItemId: (selectedItemId) => set({ selectedItemId }),
  setActiveRootPath: (activeRootPath) => set({ activeRootPath }),

  getFilteredItems: () => {
    const { items, searchQuery, filterType, filterReviewState, filterQuality, sortBy } = get();
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

    // 3. Review State Filter
    if (filterReviewState !== 'all') {
      if (filterReviewState === 'pending') {
        result = result.filter(item => item.reviewState === 'pending');
      } else if (filterReviewState === 'kept') {
        result = result.filter(item => item.reviewState === 'keep');
      } else if (filterReviewState === 'trash') {
        result = result.filter(item => item.reviewState === 'delete');
      }
    }

    // 4. Quality Metrics Filter
    if (filterQuality !== 'all') {
      if (filterQuality === 'blurry') {
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
