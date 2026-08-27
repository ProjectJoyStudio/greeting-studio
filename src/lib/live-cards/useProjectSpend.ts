import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getLiveCardProjectSpend } from "./spend.functions";

export const LIVE_CARD_SPEND_KEY = "live-card-spend";

/**
 * One shared read of "spent on this live card": every stage of the same
 * project shows the identical cumulative total, page one included.
 */
export function useLiveCardProjectSpend(sessionId: string | null) {
  const load = useServerFn(getLiveCardProjectSpend);
  const query = useQuery({
    queryKey: [LIVE_CARD_SPEND_KEY, sessionId],
    queryFn: () => load({ data: { sessionId } }),
    enabled: Boolean(sessionId),
    staleTime: 5_000,
  });
  const queryClient = useQueryClient();
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: [LIVE_CARD_SPEND_KEY] }),
    [queryClient],
  );
  return { spent: query.data?.spent ?? 0, refresh };
}

/** Lets any paid live-card step push a fresh project total everywhere. */
export function useRefreshLiveCardSpend() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: [LIVE_CARD_SPEND_KEY] }),
    [queryClient],
  );
}
