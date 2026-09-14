"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  SESSION_IDLE_MS,
  SESSION_TAB_HEARTBEAT_MS,
  getLastSessionActivity,
  getOrCreateTabId,
  heartbeatOpenTab,
  isSessionIdle,
  loginRedirectForReason,
  registerOpenTab,
  touchSessionActivity,
  unregisterOpenTab,
  type SessionLogoutReason,
} from "@/lib/session-timeout";

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

function signOutOnServerClose() {
  fetch("/api/auth/sign-out", { method: "POST", keepalive: true }).catch(() => {
    /* välilehti sulkeutuu — parhaan mukaan */
  });
}

export function SessionIdleGuard() {
  useEffect(() => {
    const supabase = createClient();
    let active = false;
    let tabId = getOrCreateTabId();
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let lastMouseMove = 0;

    async function logout(reason: SessionLogoutReason, serverOnly = false) {
      if (!active) return;
      active = false;
      if (!serverOnly) {
        await supabase.auth.signOut();
        window.location.assign(loginRedirectForReason(reason));
        return;
      }
      signOutOnServerClose();
    }

    function scheduleIdleCheck() {
      if (idleTimer) clearTimeout(idleTimer);
      const last = getLastSessionActivity() ?? Date.now();
      const remaining = SESSION_IDLE_MS - (Date.now() - last);
      idleTimer = setTimeout(
        () => {
          if (isSessionIdle()) {
            void logout("idle");
          } else {
            scheduleIdleCheck();
          }
        },
        Math.max(remaining, 1000),
      );
    }

    function onActivity() {
      if (!active) return;
      touchSessionActivity();
      scheduleIdleCheck();
    }

    function onMouseMove() {
      const now = Date.now();
      if (now - lastMouseMove < 60_000) return;
      lastMouseMove = now;
      onActivity();
    }

    function onVisibilityChange() {
      if (!active || document.visibilityState !== "visible") return;
      if (isSessionIdle()) {
        void logout("idle");
      } else {
        heartbeatOpenTab(tabId);
        scheduleIdleCheck();
      }
    }

    function onPageHide(event: PageTransitionEvent) {
      if (!active || event.persisted) return;
      const remainingTabs = unregisterOpenTab(tabId);
      if (remainingTabs === 0) {
        signOutOnServerClose();
      }
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;

      active = true;
      tabId = getOrCreateTabId();
      registerOpenTab(tabId);

      if (isSessionIdle()) {
        void logout("idle");
        return;
      }

      scheduleIdleCheck();

      for (const event of ACTIVITY_EVENTS) {
        window.addEventListener(event, onActivity, { passive: true });
      }
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      window.addEventListener("pagehide", onPageHide);

      heartbeatTimer = setInterval(() => {
        if (!active) return;
        heartbeatOpenTab(tabId);
        if (isSessionIdle()) {
          void logout("idle");
        }
      }, SESSION_TAB_HEARTBEAT_MS);
    });

    return () => {
      active = false;
      if (idleTimer) clearTimeout(idleTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return null;
}
