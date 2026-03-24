import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Theme types
export type ThemeMode = 'light' | 'dark';
export type ThemeColor = 'indigo' | 'purple' | 'blue';

export interface ThemeState {
  mode: ThemeMode;
  color: ThemeColor;
  setMode: (mode: ThemeMode) => void;
  setColor: (color: ThemeColor) => void;
  toggleMode: () => void;
}

// User types
export interface UserState {
  id: string | null;
  name: string | null;
  avatar: string | null;
  email: string | null;
  isLoggedIn: boolean;
  setUser: (user: Partial<UserState>) => void;
  logout: () => void;
}

// Settings types
export interface SettingsState {
  language: 'zh-CN' | 'en-US';
  notifications: boolean;
  autoSave: boolean;
  fontSize: 'small' | 'medium' | 'large';
  setLanguage: (lang: 'zh-CN' | 'en-US') => void;
  toggleNotifications: () => void;
  toggleAutoSave: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
}

// Theme store
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      color: 'indigo',
      setMode: (mode) => {
        set({ mode });
        // Apply theme class to document
        if (mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      setColor: (color) => set({ color }),
      toggleMode: () => {
        const newMode = get().mode === 'dark' ? 'light' : 'dark';
        get().setMode(newMode);
      },
    }),
    {
      name: 'axonclaw-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// User store
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      id: null,
      name: 'Axon',
      avatar: null,
      email: null,
      isLoggedIn: true,
      setUser: (user) => set({ ...user, isLoggedIn: true }),
      logout: () => set({ 
        id: null, 
        name: null, 
        avatar: null, 
        email: null, 
        isLoggedIn: false 
      }),
    }),
    {
      name: 'axonclaw-user',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Settings store
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      notifications: true,
      autoSave: true,
      fontSize: 'medium',
      setLanguage: (lang) => set({ language: lang }),
      toggleNotifications: () => set((state) => ({ notifications: !state.notifications })),
      toggleAutoSave: () => set((state) => ({ autoSave: !state.autoSave })),
      setFontSize: (size) => set({ fontSize: size }),
    }),
    {
      name: 'axonclaw-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Combined root store for easy access
export const useStore = () => ({
  theme: useThemeStore(),
  user: useUserStore(),
  settings: useSettingsStore(),
});

export default useStore;
