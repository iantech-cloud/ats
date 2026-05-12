import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { PhoneModal } from "./phone-modal";
import { MessageCircleHeart } from "lucide-react";

export function Navbar() {
  const { phone, session } = useAuth();
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [, setLocation] = useLocation();

  const handleAction = () => {
    if (!phone) {
      setShowPhoneModal(true);
    } else if (!session?.platformUnlocked) {
      setLocation("/pay?type=platform");
    } else {
      setLocation("/bots");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <MessageCircleHeart className="h-6 w-6" />
            <span className="font-serif text-xl font-bold tracking-tight">ChatConnect</span>
          </Link>
          <div className="flex items-center gap-4">
            {phone && (
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
                {phone}
              </span>
            )}
            <Button onClick={handleAction} variant={session?.platformUnlocked ? "secondary" : "default"}>
              {session?.platformUnlocked ? "View Matches" : "Chat Online"}
            </Button>
          </div>
        </div>
      </header>
      <PhoneModal open={showPhoneModal} onOpenChange={setShowPhoneModal} />
    </>
  );
}
