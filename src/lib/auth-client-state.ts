/** Client-only hint so nav does not flash "Kirjaudu" during session revalidation. */

export const AUTH_LOGGED_IN_HINT_KEY = "rr_auth_logged_in";

export function rememberLoggedIn(): void {
  try {
    sessionStorage.setItem(AUTH_LOGGED_IN_HINT_KEY, "1");
  } catch {
    /* private mode / blocked storage */
  }
}

export function forgetLoggedIn(): void {
  try {
    sessionStorage.removeItem(AUTH_LOGGED_IN_HINT_KEY);
  } catch {
    /* ignore */
  }
}

export function hadLoggedInHint(): boolean {
  try {
    return sessionStorage.getItem(AUTH_LOGGED_IN_HINT_KEY) === "1";
  } catch {
    return false;
  }
}
