import { supabase } from "@/integrations/supabase/client";

/**
 * Mobile resume tolerance.
 *
 * After Android Chrome puts a tab to sleep (screen lock, app switch), the
 * Supabase token can be missing or mid-refresh for a short moment. A server
 * call made in that window fails with a recoverable auth error — it must never
 * be treated as a catastrophic failure and must never sign the customer out.
 *
 * `withAuthRetry` waits for the session to come back and repeats the call.
 */
const RETRY_DELAYS_MS = [400, 1200, 2500];

export function isRecoverableAuthError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /unauthorized|401|jwt|token|failed to fetch|load failed|network/i.test(message);
}

/** Waits until the Supabase client has an access token again (best effort). */
async function waitForSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return true;
    const { data: refreshed } = await supabase.auth.refreshSession();
    return Boolean(refreshed.session?.access_token);
  } catch {
    return false;
  }
}

export async function withAuthRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isRecoverableAuthError(error) || attempt === RETRY_DELAYS_MS.length) break;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      await waitForSession();
    }
  }
  throw lastError;
}
