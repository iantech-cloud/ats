import { useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "chatconnect_last_seen";

function getLastSeen(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function setLastSeen(botId: string, count: number) {
  const current = getLastSeen();
  current[botId] = count;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      permissionRef.current = result;
    }
  }, []);

  // Request permission once on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  /**
   * Check a list of conversations for new bot messages and fire notifications.
   * Call this inside a polling hook on the account page.
   */
  const checkForNewMessages = useCallback(
    (
      conversations: Array<{
        botId: string;
        botName: string;
        botAvatar: string;
        messageCount: number;
        lastMessage: string;
      }>,
    ) => {
      if (permissionRef.current !== "granted") return;

      const lastSeen = getLastSeen();

      for (const conv of conversations) {
        const prev = lastSeen[conv.botId];

        // Skip the very first time we see this bot (no baseline yet)
        if (prev === undefined) {
          setLastSeen(conv.botId, conv.messageCount);
          continue;
        }

        if (conv.messageCount > prev) {
          // New message arrived — fire a browser notification
          try {
            const notif = new Notification(`${conv.botName} sent you a message`, {
              body: conv.lastMessage.slice(0, 120),
              icon: conv.botAvatar,
              tag: `chatconnect-${conv.botId}`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...(({ renotify: true }) as any),
            } as NotificationOptions);

            // Clicking the notification focuses the window
            notif.onclick = () => {
              window.focus();
              notif.close();
            };
          } catch {
            // Notifications not supported or blocked — silent fail
          }

          setLastSeen(conv.botId, conv.messageCount);
        }
      }
    },
    [],
  );

  return { checkForNewMessages, requestPermission };
}
