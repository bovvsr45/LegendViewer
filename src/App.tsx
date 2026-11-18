import { lazy, Suspense, useEffect, useState } from "react";
import { Home } from "@/pages/Home";
// noVNC is a big dependency: keep it out of the initial bundle.
const Viewer = lazy(() => import("@/pages/Viewer"));
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "@/hooks/useTheme";
import type { Connection } from "@/types";

export default function App() {
  const ready = useAppStore((s) => s.ready);
  const load = useAppStore((s) => s.load);
  const settings = useAppStore((s) => s.settings);
  const [active, setActive] = useState<Connection | null>(null);

  useTheme(settings.theme);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Home onOpenViewer={setActive} />
      {active && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-[#0b0f19]" />}>
          <Viewer
            connection={active}
            scaleViewport={settings.scaleViewer}
            onClose={() => setActive(null)}
          />
        </Suspense>
      )}
    </>
  );
}
