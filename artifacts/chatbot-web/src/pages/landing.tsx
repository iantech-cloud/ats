import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { PhoneModal } from "@/components/phone-modal";
import { ShieldCheck, MessageCircleHeart, Zap } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const { phone, session } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [, setLocation] = useLocation();

  const handleStart = () => {
    if (!phone) {
      setShowModal(true);
    } else if (!session?.platformUnlocked) {
      setLocation("/pay?type=platform");
    } else {
      setLocation("/account");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-32 px-4 flex flex-col items-center text-center bg-gradient-to-b from-background to-secondary/30">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-6 text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Premium Chat Service
        </div>
        
        <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mb-6 text-foreground">
          Conversations that feel <span className="text-primary italic">alive</span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mb-10">
          Connect with human-like AI companions. Deep, engaging, and exclusive. Unlock the platform and start your journey today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button size="lg" className="text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/25 hover:scale-105 transition-transform" onClick={handleStart}>
            {session?.platformUnlocked ? "View Your Matches" : "Chat Online Now"}
          </Button>
        </div>

        <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Secure M-Pesa</span>
          <span className="flex items-center gap-1.5">Ksh 50 Entry</span>
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-5xl px-4 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-card border shadow-sm">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <MessageCircleHeart className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg">Intimate Chats</h3>
          <p className="text-muted-foreground text-sm">Experience conversations tailored to your interests and personality.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-card border shadow-sm">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <Zap className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg">Instant Connection</h3>
          <p className="text-muted-foreground text-sm">No waiting. They are always online, always ready to talk to you.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-card border shadow-sm">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg">Premium & Private</h3>
          <p className="text-muted-foreground text-sm">Ksh 50 platform access. Ksh 20 per companion. Completely confidential.</p>
        </div>
      </section>

      <PhoneModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}
