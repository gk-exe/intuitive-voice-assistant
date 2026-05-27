/**
 * Auth store (scaffold).
 *
 * UI-only state during Phase 1. The real implementation will read session
 * from Supabase and expose sign-in / sign-out actions. Keeping the surface
 * tiny so swapping in real auth doesn't ripple through the UI.
 */
import { create } from "zustand";

export interface SessionUser {
  id: string;
  name?: string;
  email?: string;
}

interface AuthState {
  user: SessionUser | null;
  hydrated: boolean;
  setUser: (user: SessionUser | null) => void;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: true, // flip to false once real session hydration is wired
  setUser: (user) => set({ user }),
  setHydrated: (v) => set({ hydrated: v }),
}));
