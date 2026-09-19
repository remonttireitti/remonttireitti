"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { forgetLoggedIn } from "@/lib/auth-client-state";
import {
  SESSION_IDLE_MS,
  getLastSessionActivity,
  isSessionIdle,
  loginRedirectForReason,
  touchSessionActivity,
  type SessionLogoutReason,
} from "@/lib/session-timeout";

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

/**
 * Idle-only session guard.
 *
 * Intentionally does NOT sign out on pagehide/tab close: that event also fires
 * on in-app navigations (and pre-hydration full loads), which cleared the
 * session and flashed /kirjaudu for already-authenticated company users.
 */
export function SessionIdleGuard() {
  useEffect(() => {
    const supabase = createClient();
    let active = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastMouseMove = 0;

    async function logout(reason: SessionLogoutReason) {
      if (!active) return;
      active = false;
      forgetLoggedIn();
      await supabase.auth.signOut();
      window.location.assign(loginRedirectForReason(reason));
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
        scheduleIdleCheck();
      }
    }

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      active = true;
      touchSessionActivity(getLastSessionActivity() ?? Date.now());

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
    });

    return () => {
      active = false;
      if (idleTimer) clearTimeout(idleTimer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
