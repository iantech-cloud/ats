import {
  useListBots,
  useFetchPaymentStatus,
  useInitiateBotPayment,
  useFetchConversations,
  getFetchConversationsQueryKey,
  getFetchPaymentStatusQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Lock,
  MessageCircle,
  CheckCircle,
  User,
  Phone,
  LogOut,
  Clock,
  ChevronRight,
  Bell,
  Receipt,
} from "lucide-react";
import { useState, useEffect } from "react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Account() {
  const { data: bots, isLoading: botsLoading } = useListBots();
  const { session, phone, clearAuth, isLoadingSession } = useAuth();
  const [, setLocation] = useLocation();
  const initiateBot = useInitiateBotPayment();
  const [unlockingBotId, setUnlockingBotId] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );

  const { checkForNewMessages, requestPermission } = useNotifications();

  const { data: status, isLoading: statusLoading } = useFetchPaymentStatus(
    { phone: phone || "" },
    {
      query: {
        enabled: !!phone,
        refetchInterval: 5000,
        queryKey: getFetchPaymentStatusQueryKey({ phone: phone || "" }),
      },
    },
  );

  const { data: conversations, isLoading: convsLoading } = useFetchConversations(
    { phone: phone || "" },
    { query: { queryKey: getFetchConversationsQueryKey({ phone: phone || "" }), enabled: !!phone, refetchInterval: 8000 } },
  );

  // Fire browser notifications when conversations update with new messages
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      checkForNewMessages(conversations);
    }
  }, [conversations, checkForNewMessages]);

  const handleEnableNotifications = async () => {
    await requestPermission();
    setNotifPermission(
      typeof Notification !== "undefined" ? Notification.permission : "denied",
    );
  };

  if (!phone || (!isLoadingSession && !session?.platformUnlocked)) {
    setLocation("/");
    return null;
  }

  const unlockedBots = status?.unlockedBots ?? session?.unlockedBots ?? [];
  const isLoading = botsLoading || isLoadingSession || statusLoading;

  const handleUnlockBot = (botId: string) => {
    if (!phone) return;
    setUnlockingBotId(botId);
    initiateBot.mutate(
      { data: { phone, botId } },
      {
        onSuccess: (data) => {
          setLocation(`/pay?type=bot&botId=${botId}&checkoutRequestId=${data.checkoutRequestId}`);
        },
        onError: () => setUnlockingBotId(null),
      },
    );
  };

  const handleLogout = () => {
    clearAuth();
    setLocation("/");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Account Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-foreground leading-tight">
                  My Account
                </h2>
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Phone className="h-3 w-3" />
                  <span>{phone}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 text-xs font-medium">
                <CheckCircle className="h-3.5 w-3.5" />
                Platform Unlocked
              </div>
              {/* Notification bell */}
              {notifPermission !== "granted" && notifPermission !== "denied" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1.5 text-muted-foreground"
                  onClick={handleEnableNotifications}
                  title="Enable notifications for new messages"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Notify me</span>
                </Button>
              )}
              {notifPermission === "granted" && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  <Bell className="h-3 w-3" />
                  <span className="hidden sm:inline">Notifications on</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5 text-muted-foreground"
                onClick={() => setLocation("/wallet")}
              >
                <Receipt className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Transactions</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5 text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-4 flex gap-5 text-sm">
            <div>
              <span className="font-semibold text-foreground text-base">
                {unlockedBots.length}
              </span>
              <span className="text-muted-foreground ml-1">Unlocked</span>
            </div>
            <div className="w-px bg-border" />
            <div>
              <span className="font-semibold text-foreground text-base">
                {bots?.length ?? 0}
              </span>
              <span className="text-muted-foreground ml-1">Available</span>
            </div>
            <div className="w-px bg-border" />
            <div>
              <span className="font-semibold text-foreground text-base">
                {conversations?.length ?? 0}
              </span>
              <span className="text-muted-foreground ml-1">Conversations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* ── Left: Bot Grid ── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-serif text-xl font-bold text-foreground">
                All Companions
              </h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                Unlock any companion for Ksh 20 to start chatting
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {bots?.map((bot) => {
                const isUnlocked = unlockedBots.includes(bot._id);
                const isUnlocking =
                  unlockingBotId === bot._id && initiateBot.isPending;

                return (
                  <div
                    key={bot._id}
                    className="group relative flex flex-col rounded-2xl overflow-hidden bg-card border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div className="aspect-[3/4] relative bg-muted overflow-hidden">
                      <img
                        src={bot.avatar}
                        alt={bot.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

                      {/* Online badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${bot.isOnline ? "bg-green-400" : "bg-gray-400"}`}
                        />
                        <span className="text-[10px] font-medium text-white">
                          {bot.isOnline ? "Online" : "Away"}
                        </span>
                      </div>

                      {/* Unlocked badge */}
                      {isUnlocked && (
                        <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/90">
                          <CheckCircle className="h-2.5 w-2.5 text-white" />
                          <span className="text-[9px] font-bold text-white">
                            Unlocked
                          </span>
                        </div>
                      )}

                      {/* Name overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="font-serif text-lg font-bold text-white leading-tight">
                          {bot.name}, {bot.age}
                        </h3>
                        <p className="text-white/70 text-xs line-clamp-1 mt-0.5">
                          {bot.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-3 bg-card">
                      {isUnlocked ? (
                        <Button
                          size="sm"
                          className="w-full rounded-full gap-1.5 text-xs"
                          onClick={() => setLocation(`/chat/${bot._id}`)}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Chat Now
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full rounded-full gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => handleUnlockBot(bot._id)}
                          disabled={isUnlocking}
                        >
                          {isUnlocking ? (
                            <span className="animate-pulse">Sending...</span>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" />
                              Unlock Ksh 20
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: Chat History Sidebar ── */}
        <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div className="bg-card border rounded-2xl overflow-hidden h-full">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm text-foreground">
                Recent Conversations
              </h2>
            </div>

            {convsLoading ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No conversations yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Unlock a companion and start chatting
                </p>
              </div>
            ) : (
              <div className="divide-y overflow-y-auto max-h-[calc(100vh-280px)]">
                {conversations.map((conv) => (
                  <button
                    key={conv.botId}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left group"
                    onClick={() => setLocation(`/chat/${conv.botId}`)}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={conv.botAvatar}
                        alt={conv.botName}
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {conv.botName}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {timeAgo(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {conv.messageCount} messages
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 group-hover:text-muted-foreground transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
