import { create } from 'zustand';

export type LobbyView = 'lobby' | 'online' | 'history' | 'rules' | 'stats';

interface UIState {
  currentGameId: string | null;
  replayGameId: string | null;
  showSettings: boolean;
  showAdmin: boolean;
  lobbyView: LobbyView;
  isMenuOpen: boolean;
  pushToast: { title: string; body: string; url: string } | null;
  swUpdateAvailable: boolean;
  appVersion: string;

  // Actions
  setCurrentGameId: (id: string | null) => void;
  setReplayGameId: (id: string | null) => void;
  setShowSettings: (show: boolean) => void;
  setShowAdmin: (show: boolean) => void;
  setLobbyView: (view: LobbyView) => void;
  setIsMenuOpen: (open: boolean) => void;
  setPushToast: (toast: { title: string; body: string; url: string } | null) => void;
  setSwUpdateAvailable: (available: boolean) => void;
  setAppVersion: (version: string) => void;
  handleNavClick: (view: LobbyView) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentGameId: null,
  replayGameId: null,
  showSettings: false,
  showAdmin: false,
  lobbyView: 'lobby',
  isMenuOpen: false,
  pushToast: null,
  swUpdateAvailable: false,
  appVersion: 'V0.1-Alpha',

  setCurrentGameId: (currentGameId) => set({ currentGameId }),
  setReplayGameId: (replayGameId) => set({ replayGameId }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setShowAdmin: (showAdmin) => set({ showAdmin }),
  setLobbyView: (lobbyView) => set({ lobbyView }),
  setIsMenuOpen: (isMenuOpen) => set({ isMenuOpen }),
  setPushToast: (pushToast) => set({ pushToast }),
  setSwUpdateAvailable: (swUpdateAvailable) => set({ swUpdateAvailable }),
  setAppVersion: (appVersion) => set({ appVersion }),

  handleNavClick: (view) =>
    set({
      lobbyView: view,
      currentGameId: null,
      replayGameId: null,
      isMenuOpen: false,
    }),
}));
