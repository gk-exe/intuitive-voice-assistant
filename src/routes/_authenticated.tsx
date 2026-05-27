import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * Pathless layout for screens that require a signed-in user.
 *
 * In Phase 1 there's no gating logic — children just render. Once Supabase
 * is wired, this is where we'll add `beforeLoad` redirect-to-login.
 */
export const Route = createFileRoute("/_authenticated")({
  component: () => <Outlet />,
});
