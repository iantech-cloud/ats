import { useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";

interface PhoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectAfter?: string;
}

type ModalStep = "phone" | "checking" | "code" | "verifying";

export function PhoneModal({ open, onOpenChange, redirectAfter = "/pay?type=platform" }: PhoneModalProps) {
  const [phoneInput, setPhoneInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [step, setStep] = useState<ModalStep>("phone");
  const [error, setError] = useState("");
  const { setPhone, setSessionToken } = useAuth();
  const [, setLocation] = useLocation();

  const reset = () => {
    setStep("phone");
    setPhoneInput("");
    setCodeInput("");
    setError("");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = phoneInput.trim();
    if (phone.length < 9) return;

    setStep("checking");
    setError("");

    try {
      const res = await fetch(`/api/auth/session?phone=${encodeURIComponent(phone)}`);

      if (res.status === 429) {
        setStep("phone");
        setError("Too many attempts. Please wait a few minutes and try again.");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStep("phone");
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      const data = await res.json();

      if (data.platformUnlocked) {
        if (data.hasAccessCode) {
          // Admin-unlocked user — must verify with access code before access is granted
          setStep("code");
        } else {
          // M-Pesa-paid user — session token was issued by the server
          setPhone(phone);
          if (data.sessionToken) setSessionToken(data.sessionToken);
          handleClose(false);
          setLocation("/account");
        }
      } else {
        // Not unlocked — send to payment
        setPhone(phone);
        handleClose(false);
        setLocation(redirectAfter);
      }
    } catch {
      setStep("phone");
      setError("Network error. Please check your connection and try again.");
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = phoneInput.trim();
    const code = codeInput.trim().toUpperCase();
    if (!code) return;

    setStep("verifying");
    setError("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      if (res.status === 429) {
        setStep("code");
        setError("Too many attempts. Please wait a few minutes and try again.");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setPhone(phone);
        if (data.sessionToken) setSessionToken(data.sessionToken);
        handleClose(false);
        setLocation("/account");
      } else {
        const data = await res.json();
        setStep("code");
        setError(data.error || "Invalid access code. Please check and try again.");
      }
    } catch {
      setStep("code");
      setError("Network error. Please check your connection and try again.");
    }
  };

  const isLoading = step === "checking" || step === "verifying";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-primary/20 shadow-xl shadow-primary/5">

        {/* ── Step: phone input ── */}
        {(step === "phone" || step === "checking") && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Enter your number</DialogTitle>
              <DialogDescription>
                We need your M-Pesa number to unlock your premium chat experience.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePhoneSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (M-Pesa)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="text-lg py-6"
                  autoFocus
                  disabled={isLoading}
                  autoComplete="tel"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button
                type="submit"
                className="w-full py-6 text-lg"
                disabled={phoneInput.trim().length < 9 || isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking…</>
                ) : "Continue"}
              </Button>
            </form>
          </>
        )}

        {/* ── Step: access code ── */}
        {(step === "code" || step === "verifying") && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <DialogTitle className="font-serif text-2xl text-center">Enter Access Code</DialogTitle>
              <DialogDescription className="text-center">
                Your account is protected. Enter the 6-character code you received when your access was granted.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCodeSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="code">Access Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="e.g. A3F2B1"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  className="text-lg py-6 text-center tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                  disabled={isLoading}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Entering for: <span className="font-medium">{phoneInput}</span>
                </p>
              </div>
              {error && <p className="text-destructive text-sm text-center">{error}</p>}
              <Button
                type="submit"
                className="w-full py-6 text-lg"
                disabled={codeInput.trim().length < 4 || isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…</>
                ) : "Verify & Enter"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setStep("phone"); setCodeInput(""); setError(""); }}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Use a different number
              </Button>
            </form>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
