import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useInitiatePlatformPayment,
  useInitiateBotPayment,
  useFetchPaymentStatus,
  getFetchPaymentStatusQueryKey,
  useFetchBot,
  getFetchBotQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Loader2,
  XCircle,
  RefreshCw,
  Clock,
  KeyRound,
  Smartphone,
} from "lucide-react";

type FailReason = "cancelled" | "timeout" | "failed";
type UnlockMode = "mpesa" | "code";

const FAIL_MESSAGES: Record<FailReason, { title: string; body: string }> = {
  cancelled: {
    title: "Payment Cancelled",
    body: "You cancelled the M-Pesa prompt. No amount was charged. You can try again.",
  },
  timeout: {
    title: "Prompt Timed Out",
    body: "The M-Pesa prompt expired before you responded. No amount was charged.",
  },
  failed: {
    title: "Payment Failed",
    body: "The payment could not be processed. Please check your M-Pesa balance and try again.",
  },
};

export default function Pay() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const type = searchParams.get("type") as "platform" | "bot" | null;
  const botId = searchParams.get("botId");

  const { phone, setPhone, setSessionToken } = useAuth();

  // Shared input state
  const [phoneInput, setPhoneInput] = useState(phone || "");
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  // M-Pesa flow state
  const [step, setStep] = useState<"input" | "waiting" | "failed">("input");
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState<FailReason>("failed");

  // Mode toggle — available for both platform and bot unlocks
  const [mode, setMode] = useState<UnlockMode>("mpesa");

  const initiatePlatform = useInitiatePlatformPayment();
  const initiateBot = useInitiateBotPayment();

  const { data: bot } = useFetchBot(botId || "", {
    query: { queryKey: getFetchBotQueryKey(botId || ""), enabled: type === "bot" && !!botId },
  });

  const statusParams = {
    phone: phone || phoneInput,
    botId: type === "bot" ? botId || undefined : undefined,
    checkoutRequestId: checkoutRequestId || undefined,
  };
  const { data: status } = useFetchPaymentStatus(statusParams, {
    query: {
      queryKey: getFetchPaymentStatusQueryKey(statusParams),
      enabled: step === "waiting" && !!(phone || phoneInput) && !!checkoutRequestId,
      refetchInterval: 1500,
    },
  });

  useEffect(() => {
    if (!type || (type === "bot" && !botId)) {
      setLocation("/");
    }
  }, [type, botId, setLocation]);

  useEffect(() => {
    if (step !== "waiting" || !status) return;

    const ps = status.paymentStatus;

    if ((status as any).sessionToken) {
      setSessionToken((status as any).sessionToken);
    }

    if (type === "platform" && status.platformUnlocked) {
      setLocation("/account");
      return;
    }
    if (type === "bot" && botId && status.unlockedBots?.includes(botId)) {
      setLocation(`/chat/${botId}`);
      return;
    }

    if (ps === "cancelled") { setFailReason("cancelled"); setStep("failed"); }
    else if (ps === "timeout") { setFailReason("timeout"); setStep("failed"); }
    else if (ps === "failed") { setFailReason("failed"); setStep("failed"); }
  }, [status, step, type, botId, setLocation, setSessionToken]);

  // ── M-Pesa submit ──────────────────────────────────────────────────────────
  const handleMpesaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput) return;
    setPhone(phoneInput);

    if (type === "platform") {
      initiatePlatform.mutate(
        { data: { phone: phoneInput } },
        {
          onSuccess: (data) => { setCheckoutRequestId(data.checkoutRequestId); setStep("waiting"); },
          onError: () => setStep("failed"),
        },
      );
    } else if (type === "bot" && botId) {
      initiateBot.mutate(
        { data: { phone: phoneInput, botId } },
        {
          onSuccess: (data) => { setCheckoutRequestId(data.checkoutRequestId); setStep("waiting"); },
          onError: () => setStep("failed"),
        },
      );
    }
  };

  // ── Access-code submit ─────────────────────────────────────────────────────
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ph = phoneInput.trim();
    const code = codeInput.trim().toUpperCase();
    if (!ph || !code) return;

    setCodeError("");
    setCodeLoading(true);

    try {
      let endpoint = "/api/auth/verify";
      let body: Record<string, string> = { phone: ph, code };

      if (type === "bot" && botId) {
        endpoint = "/api/auth/verify-bot";
        body = { phone: ph, botId, code };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        setCodeError("Too many attempts. Please wait a few minutes and try again.");
        setCodeLoading(false);
        return;
      }

      const data = await res.json();

      if (res.ok && data.valid) {
        setPhone(ph);
        if (data.sessionToken) setSessionToken(data.sessionToken);
        if (type === "platform") {
          setLocation("/account");
        } else if (type === "bot" && botId) {
          setLocation(`/chat/${botId}`);
        }
      } else {
        setCodeError(data.error || "Invalid access code. Please check and try again.");
        setCodeLoading(false);
      }
    } catch {
      setCodeError("Network error. Please check your connection and try again.");
      setCodeLoading(false);
    }
  };

  const handleRetry = () => {
    setStep("input");
    setCheckoutRequestId(null);
    setCodeError("");
    initiatePlatform.reset();
    initiateBot.reset();
  };

  const isPending = initiatePlatform.isPending || initiateBot.isPending;
  const amount = type === "platform" ? 50 : 20;
  const failMsg = FAIL_MESSAGES[failReason];
  const botName = bot?.name || "this companion";
  const codeLabel = type === "platform"
    ? "6-character code given to you when your platform access was granted."
    : `6-character code given to you for unlocking ${botName}.`;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-3xl p-8 shadow-xl text-center space-y-6">

        {/* Icon */}
        <div
          className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
            step === "failed"
              ? "bg-destructive/10 text-destructive"
              : mode === "code" && step === "input"
              ? "bg-amber-500/10 text-amber-600"
              : "bg-primary/10 text-primary"
          }`}
        >
          {step === "failed"
            ? failReason === "timeout" ? <Clock className="h-8 w-8" /> : <XCircle className="h-8 w-8" />
            : mode === "code" && step === "input"
            ? <KeyRound className="h-8 w-8" />
            : <ShieldCheck className="h-8 w-8" />}
        </div>

        {/* ── Step: input ─────────────────────────────────────────────────── */}
        {step === "input" && (
          <>
            <div>
              <h1 className="font-serif text-3xl font-bold">Secure Unlock</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {type === "platform"
                  ? "Choose how you'd like to unlock ChatConnect access."
                  : `Choose how you'd like to unlock ${botName}.`}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-xl border bg-muted/40 p-1 gap-1">
              <button
                type="button"
                onClick={() => { setMode("mpesa"); setCodeError(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  mode === "mpesa"
                    ? "bg-card shadow-sm text-foreground border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                M-Pesa
              </button>
              <button
                type="button"
                onClick={() => setMode("code")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  mode === "code"
                    ? "bg-card shadow-sm text-foreground border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Access Code
              </button>
            </div>

            {/* ── M-Pesa form ── */}
            {mode === "mpesa" && (
              <form onSubmit={handleMpesaSubmit} className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  {type === "platform"
                    ? "Pay Ksh 50 via M-Pesa STK push to get instant access."
                    : `Pay Ksh 20 to start chatting with ${botName}.`}
                </p>
                <Input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="M-Pesa number e.g. 0712345678"
                  className="text-center text-lg py-6"
                  disabled={isPending}
                />
                <Button
                  type="submit"
                  className="w-full py-6 text-lg rounded-full"
                  disabled={!phoneInput || isPending}
                >
                  {isPending
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : `Pay Ksh ${amount} via M-Pesa`}
                </Button>
              </form>
            )}

            {/* ── Access-code form ── */}
            {mode === "code" && (
              <form onSubmit={handleCodeSubmit} className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">Enter the {codeLabel}</p>
                <div className="space-y-3 text-left">
                  <div>
                    <Label htmlFor="code-phone" className="text-xs text-muted-foreground mb-1 block">
                      Phone Number
                    </Label>
                    <Input
                      id="code-phone"
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="e.g. 0712345678"
                      className="text-lg py-6"
                      disabled={codeLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="code-input" className="text-xs text-muted-foreground mb-1 block">
                      Access Code
                    </Label>
                    <Input
                      id="code-input"
                      type="text"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. A3F2B1"
                      className="text-center text-xl py-6 tracking-[0.4em] font-mono"
                      maxLength={6}
                      disabled={codeLoading}
                      autoComplete="off"
                      autoCapitalize="characters"
                    />
                  </div>
                </div>
                {codeError && (
                  <p className="text-destructive text-sm text-center">{codeError}</p>
                )}
                <Button
                  type="submit"
                  className="w-full py-6 text-lg rounded-full"
                  disabled={!phoneInput || codeInput.trim().length < 4 || codeLoading}
                >
                  {codeLoading
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : <><KeyRound className="h-4 w-4 mr-2" />Verify & Unlock</>}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Access codes are single-use and expire immediately after verification.
                </p>
              </form>
            )}
          </>
        )}

        {/* ── Step: waiting ─────────────────────────────────────────────── */}
        {step === "waiting" && (
          <>
            <h1 className="font-serif text-3xl font-bold">Check Your Phone</h1>
            <p className="text-muted-foreground">
              An M-Pesa prompt has been sent to{" "}
              <strong>{phoneInput || phone}</strong>. Enter your PIN to complete
              the Ksh {amount} payment.
            </p>
            <div className="py-8 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm font-medium animate-pulse text-primary">
                Waiting for confirmation…
              </p>
            </div>
            <button
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              onClick={handleRetry}
            >
              Didn't receive the prompt? Try again
            </button>
          </>
        )}

        {/* ── Step: failed ──────────────────────────────────────────────── */}
        {step === "failed" && (
          <>
            <h1 className="font-serif text-3xl font-bold text-destructive">{failMsg.title}</h1>
            <p className="text-muted-foreground">{failMsg.body}</p>
            <div className="pt-4 space-y-3">
              <Button className="w-full py-6 text-lg rounded-full gap-2" onClick={handleRetry}>
                <RefreshCw className="h-5 w-5" />Try Again
              </Button>
              <Button variant="ghost" className="w-full rounded-full text-muted-foreground" onClick={() => setLocation("/")}>
                Go Back
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
