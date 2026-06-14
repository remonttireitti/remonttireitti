"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const VISITOR_KEY = "rr-visitor-id";

function getVisitorSessionId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function trackPageView(path: string, referrer: string | null) {
  const sessionId = getVisitorSessionId();
  const payload = JSON.stringify({ path, referrer, sessionId });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/view", blob);
    return;
  }

  void fetch("/api/analytics/view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}

export function PageViewTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const initialReferrer = useRef<string | null>(null);

  useEffect(() => {
    if (initialReferrer.current === null) {
      initialReferrer.current = document.referrer || null;
    }

    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    trackPageView(pathname, initialReferrer.current);
  }, [pathname]);

  return null;
}
