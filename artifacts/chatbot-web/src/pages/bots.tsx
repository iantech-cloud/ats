import { useListBots } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export default function Bots() {
  const { data: bots, isLoading } = useListBots();
  const { session, phone } = useAuth();
  const [, setLocation] = useLocation();

  if (!phone || !session?.platformUnlocked) {
    setLocation("/");
    return null;
  }

  const unlockedBots = session?.unlockedBots || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">Find Your Match</h1>
        <p className="text-muted-foreground mt-2">Discover companions ready to chat with you right now.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {bots?.map((bot) => {
            const isUnlocked = unlockedBots.includes(bot._id);
            return (
              <div 
                key={bot._id} 
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => setLocation(isUnlocked ? `/chat/${bot._id}` : `/pay?type=bot&botId=${bot._id}`)}
              >
                <div className="aspect-[3/4] relative bg-muted overflow-hidden">
                  <img 
                    src={bot.avatar} 
                    alt={bot.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                    <div className={`h-2 w-2 rounded-full ${bot.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                    <span className="text-xs font-medium text-white">{bot.isOnline ? 'Online' : 'Offline'}</span>
                  </div>

                  {/* Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-serif text-2xl font-bold text-white mb-1">
                      {bot.name}, {bot.age}
                    </h3>
                    <p className="text-white/80 text-sm line-clamp-1">{bot.tagline}</p>
                    
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {bot.interests?.slice(0, 2).map((interest, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {!isUnlocked && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity p-6 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-3 text-primary">
                      <Lock className="h-6 w-6" />
                    </div>
                    <h4 className="font-semibold text-lg mb-1">Unlock {bot.name}</h4>
                    <p className="text-sm text-muted-foreground mb-4">Pay Ksh 20 to start chatting</p>
                    <Button variant="default" className="w-full rounded-full">Unlock Now</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
