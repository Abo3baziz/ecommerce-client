"use client";

import { create } from "zustand";

interface UiState {
  miniCartOpen: boolean;
  setMiniCartOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  miniCartOpen: false,
  setMiniCartOpen: (open) => set({ miniCartOpen: open }),
}));
