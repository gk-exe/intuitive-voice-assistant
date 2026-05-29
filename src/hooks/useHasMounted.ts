import { useEffect, useState } from "react";

/**
 * useHasMounted
 * -------------
 * Returns `true` only after the first client-side render. Use to gate
 * UI that depends on client-only state (localStorage, persisted Zustand
 * stores, window APIs) so SSR markup matches the first paint and the
 * user never sees a hydration flash.
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
