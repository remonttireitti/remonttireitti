"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdDemoFormat, AdScene } from "@/lib/ad-demo-scenes";
import { AdDemoVisual } from "@/components/marketing/ad-demo-visuals";
import "./ad-demo.css";

export function AdDemoPlayer({
  scenes,
  format,
  showChrome = true,
  loop = true,
}: {
  scenes: AdScene[];
  format: AdDemoFormat;
  showChrome?: boolean;
  loop?: boolean;
}) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [sceneKey, setSceneKey] = useState(0);

  const scene = scenes[sceneIndex];
  const durationMs = scene?.durationMs ?? 5000;

  const frameClass =
    format === "pysty"
      ? "aspect-[9/16] w-[min(100vw,420px)]"
      : "aspect-video w-[min(100vw,960px)]";

  const totalProgress = useMemo(() => {
    const prior = scenes
      .slice(0, sceneIndex)
      .reduce((sum, s) => sum + (s.durationMs ?? 5000), 0);
    const total = scenes.reduce((sum, s) => sum + (s.durationMs ?? 5000), 0);
    return (prior + progress * durationMs) / total;
  }, [sceneIndex, progress, durationMs, scenes]);

  useEffect(() => {
    setProgress(0);
    setSceneKey((k) => k + 1);
    const started = Date.now();

    const tick = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const ratio = Math.min(1, elapsed / durationMs);
      setProgress(ratio);

      if (elapsed >= durationMs) {
        window.clearInterval(tick);
        setSceneIndex((current) => {
          const next = current + 1;
          if (next >= scenes.length) {
            return loop ? 0 : current;
          }
          return next;
        });
      }
    }, 40);

    return () => window.clearInterval(tick);
  }, [sceneIndex, durationMs, scenes.length, loop]);

  if (!scene) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 via-white to-orange-50/80 shadow-2xl ring-1 ring-white/10 ${frameClass}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_55%)]" />

        <div className="relative flex h-full flex-col px-6 py-8 sm:px-10 sm:py-10">
          <div
            key={sceneKey}
            className="ad-scene-enter flex flex-1 flex-col items-center justify-center text-center"
          >
            <div className="mb-8 flex min-h-[44%] w-full items-center justify-center">
              <AdDemoVisual visual={scene.visual} active />
            </div>

            <div className="space-y-3">
              <h1 className="text-balance text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                {scene.headline}
              </h1>
              {scene.subline && (
                <p className="text-balance text-sm leading-relaxed text-stone-600 sm:text-base">
                  {scene.subline}
                </p>
              )}
            </div>
          </div>

          {showChrome && (
            <div className="mt-6 space-y-3">
              <div className="flex justify-center gap-1.5">
                {scenes.map((s, i) => (
                  <span
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === sceneIndex
                        ? "w-6 bg-orange-600"
                        : i < sceneIndex
                          ? "w-1.5 bg-sky-400"
                          : "w-1.5 bg-stone-300"
                    }`}
                  />
                ))}
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-stone-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-orange-500 transition-[width] duration-75"
                  style={{ width: `${totalProgress * 100}%` }}
                />
              </div>
              <p className="text-center text-[10px] font-medium uppercase tracking-widest text-stone-400">
                {sceneIndex + 1} / {scenes.length} · 30 s
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
