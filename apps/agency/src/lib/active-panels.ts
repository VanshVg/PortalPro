/**
 * Tracks which project MessagingPanels are currently mounted (i.e. the Messages tab is open).
 * ProjectSocketListener uses this to decide whether to fire unread indicator events or not.
 * Plain module-level Set — safe because this only lives in the browser bundle.
 */
export const activePanels = new Set<string>();
