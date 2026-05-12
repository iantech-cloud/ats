import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { 
  useFetchBot, 
  useFetchChatHistory, 
  useSendMessage,
  getFetchChatHistoryQueryKey 
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";

export default function Chat() {
  const { botId } = useParams();
  const { phone, session } = useAuth();
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: bot, isLoading: isLoadingBot } = useFetchBot(botId || "");
  const { data: messages, isLoading: isLoadingMessages } = useFetchChatHistory(
    { botId: botId || "", phone: phone || "" },
    { query: { enabled: !!botId && !!phone, queryKey: getFetchChatHistoryQueryKey({ botId: botId || "", phone: phone || "" }) } }
  );

  const sendMessage = useSendMessage();

  useEffect(() => {
    if (!phone) {
      setLocation("/");
      return;
    }
    if (session && !session.platformUnlocked) {
      setLocation("/pay?type=platform");
      return;
    }
    if (session && botId && !session.unlockedBots.includes(botId)) {
      setLocation(`/pay?type=bot&botId=${botId}`);
      return;
    }
  }, [phone, session, botId, setLocation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !botId || !phone) return;

    sendMessage.mutate(
      { data: { phone, botId, text: text.trim() } },
      {
        onSuccess: () => {
          setText("");
          queryClient.invalidateQueries({ queryKey: getFetchChatHistoryQueryKey({ botId, phone }) });
        }
      }
    );
  };

  if (isLoadingBot || !bot) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="h-16 border-b flex items-center px-4 shrink-0">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="ml-3 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-12 w-2/3 rounded-2xl" />
          <Skeleton className="h-12 w-2/3 rounded-2xl ml-auto" />
          <Skeleton className="h-12 w-2/3 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto w-full border-x bg-card shadow-sm">
      {/* Chat Header */}
      <header className="h-16 border-b bg-background/95 backdrop-blur shrink-0 flex items-center px-4 sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="mr-2 -ml-2" onClick={() => setLocation("/bots")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative">
          <img src={bot.avatar} alt={bot.name} className="h-10 w-10 rounded-full object-cover bg-muted" />
          <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${bot.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
        <div className="ml-3">
          <h2 className="font-semibold">{bot.name}</h2>
          <p className="text-xs text-muted-foreground">{bot.isOnline ? 'Online now' : 'Offline'}</p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-secondary/10">
        <div className="text-center pb-4 border-b border-border/50 mb-6">
          <img src={bot.avatar} alt={bot.name} className="h-20 w-20 rounded-full object-cover mx-auto mb-3 bg-muted" />
          <h3 className="font-serif text-xl font-bold">{bot.name}, {bot.age}</h3>
          <p className="text-sm text-muted-foreground">{bot.tagline}</p>
          <p className="text-sm mt-2 max-w-md mx-auto">{bot.bio}</p>
        </div>

        {isLoadingMessages ? (
          <div className="flex justify-center py-4"><Skeleton className="h-6 w-24 rounded-full" /></div>
        ) : messages?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Say hi to {bot.name}! 
          </div>
        ) : (
          messages?.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg._id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <img src={bot.avatar} alt={bot.name} className="h-8 w-8 rounded-full object-cover mr-2 shrink-0 mt-auto bg-muted" />
                )}
                <div className={`max-w-[75%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div 
                    className={`rounded-2xl px-4 py-2 ${
                      isUser 
                        ? "bg-primary text-primary-foreground rounded-br-sm" 
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {format(new Date(msg.createdAt), "HH:mm")}
                  </span>
                </div>
              </div>
            );
          })
        )}
        {sendMessage.isPending && (
          <div className="flex justify-end">
            <div className="bg-primary/50 text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 flex gap-1 items-center">
              <span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-background border-t shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="Type a message..." 
            className="rounded-full bg-muted/50 border-transparent focus-visible:ring-1"
            disabled={sendMessage.isPending}
          />
          <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!text.trim() || sendMessage.isPending}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
