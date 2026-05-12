import { useState } from "react";
import { useLocation } from "wouter";
import { useFetchPaymentHistory, getFetchPaymentHistoryQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  Receipt,
  Wallet,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";

type TxStatus = "completed" | "pending" | "failed" | "cancelled" | "timeout";

interface StatusConfig {
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
  rowClass: string;
}

const STATUS_CONFIG: Record<TxStatus, StatusConfig> = {
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="h-4 w-4" />,
    badgeClass: "bg-green-500/10 text-green-600 border-green-500/20",
    rowClass: "border-l-green-500",
  },
  pending: {
    label: "Pending",
    icon: <Clock className="h-4 w-4 animate-pulse" />,
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    rowClass: "border-l-amber-500",
  },
  failed: {
    label: "Failed",
    icon: <XCircle className="h-4 w-4" />,
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    rowClass: "border-l-destructive",
  },
  cancelled: {
    label: "Cancelled",
    icon: <AlertCircle className="h-4 w-4" />,
    badgeClass: "bg-muted text-muted-foreground border-border",
    rowClass: "border-l-muted-foreground",
  },
  timeout: {
    label: "Timed Out",
    icon: <Clock className="h-4 w-4" />,
    badgeClass: "bg-muted text-muted-foreground border-border",
    rowClass: "border-l-muted-foreground",
  },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function TransactionRow({ tx }: { tx: any }) {
  const cfg = STATUS_CONFIG[tx.status as TxStatus] ?? STATUS_CONFIG.failed;
  const isCompleted = tx.status === "completed";

  return (
    <div
      className={`bg-card border rounded-xl p-4 border-l-4 ${cfg.rowClass} transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: type + ref */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {tx.type === "platform" ? "Platform Unlock" : "Companion Unlock"}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 rounded-full font-medium border ${cfg.badgeClass}`}
            >
              <span className="flex items-center gap-0.5">
                {cfg.icon}
                <span className="ml-0.5">{cfg.label}</span>
              </span>
            </Badge>
          </div>

          {tx.transactionRef && (
            <div className="flex items-center mt-1">
              <span className="text-[10px] font-mono text-muted-foreground">{tx.transactionRef}</span>
              <CopyButton value={tx.transactionRef} />
            </div>
          )}

          {/* M-Pesa receipt */}
          {isCompleted && tx.mpesaReceiptNumber && (
            <div className="mt-2 flex items-center gap-1.5 bg-green-500/5 border border-green-500/20 rounded-lg px-2.5 py-1.5">
              <Receipt className="h-3 w-3 text-green-600 flex-shrink-0" />
              <span className="text-[11px] font-mono font-semibold text-green-700">
                {tx.mpesaReceiptNumber}
              </span>
              <CopyButton value={tx.mpesaReceiptNumber} />
            </div>
          )}

          {/* Failure reason */}
          {!isCompleted && tx.resultDesc && tx.status !== "pending" && (
            <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
              {tx.resultDesc}
            </p>
          )}

          {/* Timestamps */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span>Initiated: {formatDate(tx.createdAt)}</span>
            {isCompleted && tx.completedAt && (
              <span className="text-green-600">✓ {formatDate(tx.completedAt)}</span>
            )}
          </div>

          {/* M-Pesa checkout ID */}
          <div className="flex items-center mt-1">
            <span className="text-[9px] text-muted-foreground/60 font-mono">
              {tx.checkoutRequestId}
            </span>
          </div>
        </div>

        {/* Right: amount */}
        <div className="text-right flex-shrink-0">
          <div
            className={`text-xl font-bold font-mono ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}
          >
            Ksh {tx.amount}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">M-Pesa</div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold font-mono ${accent ?? "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function WalletPage() {
  const [, setLocation] = useLocation();
  const { phone, session } = useAuth();
  const [page, setPage] = useState(1);

  const params = { phone: phone || "", page, limit: 15 };
  const { data, isLoading, isFetching, refetch } = useFetchPaymentHistory(params, {
    query: {
      queryKey: getFetchPaymentHistoryQueryKey(params),
      enabled: !!phone,
      refetchInterval: 15000,
    },
  });

  if (!phone || (!isLoading && !session?.platformUnlocked)) {
    setLocation("/");
    return null;
  }

  const transactions = data?.transactions ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  // Compute summaries
  const completed = transactions.filter((t) => t.status === "completed");
  const totalSpentAll = transactions.reduce(
    (sum, t) => (t.status === "completed" ? sum + t.amount : sum),
    0,
  );
  const pendingCount = transactions.filter((t) => t.status === "pending").length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-16 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground -ml-2"
                onClick={() => setLocation("/account")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="h-5 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h1 className="font-serif font-bold text-base text-foreground leading-tight">
                    Transaction History
                  </h1>
                  <p className="text-[11px] text-muted-foreground">{phone}</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5 text-muted-foreground"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Summary Cards */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <SummaryCard
              label="Total Transactions"
              value={String(total)}
              sub="all time"
            />
            <SummaryCard
              label="Total Spent"
              value={`Ksh ${totalSpentAll}`}
              sub={`${completed.length} completed`}
              accent="text-primary"
            />
            <SummaryCard
              label="Pending"
              value={String(pendingCount)}
              sub="awaiting M-Pesa"
              accent={pendingCount > 0 ? "text-amber-600" : "text-muted-foreground"}
            />
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && transactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h2 className="font-serif text-xl font-bold text-foreground mb-2">No Transactions Yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your M-Pesa payment records will appear here once you make your first transaction.
            </p>
          </div>
        )}

        {/* Transaction list */}
        {!isLoading && transactions.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total} transactions
              </p>
            </div>

            <div className="space-y-3">
              {transactions.map((tx) => (
                <TransactionRow key={tx._id} tx={tx} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1.5"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1.5"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
