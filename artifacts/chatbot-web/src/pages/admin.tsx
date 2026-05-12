import { useState } from "react";
import {
  useFetchAdminStats,
  getFetchAdminStatsQueryKey,
  useFetchAdminUsers,
  getFetchAdminUsersQueryKey,
  useFetchAdminRevenue,
  getFetchAdminRevenueQueryKey,
  useListBots,
  getListBotsQueryKey,
  useDeleteBot,
  useUpdateBot,
  useCreateBot,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, DollarSign, MessageSquare, Bot, Trash2,
  Edit2, Plus, X, ShieldCheck, RefreshCw, TrendingUp,
  Unlock, Copy, Check, Loader2, KeyRound, AlertCircle,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="bg-card border rounded-2xl p-5 flex items-start gap-4 shadow-sm">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg hover:bg-primary/20 transition-colors"
    >
      {code}
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// ── Success popup (shared for platform + bot unlocks) ─────────────────────────

interface UnlockResult {
  phone: string;
  accessCode: string;
  type: "platform" | "bot";
  botName?: string;
}

function UnlockSuccessModal({ result, onClose }: { result: UnlockResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4" onClick={e => e.stopPropagation()}>
        <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
          <Unlock className="h-7 w-7" />
        </div>
        <h2 className="font-serif text-xl font-bold">
          {result.type === "platform" ? "User Unlocked" : `Bot Unlocked`}
        </h2>
        <p className="text-sm text-muted-foreground">
          {result.type === "platform"
            ? <>Share this access code with <span className="font-medium">{result.phone}</span>. They can use it to log into the platform.</>
            : <>Share this code with <span className="font-medium">{result.phone}</span> to unlock <span className="font-medium">{result.botName ?? "the bot"}</span>.</>
          }
        </p>
        <div className="bg-muted rounded-2xl p-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            {result.type === "platform" ? "Platform Access Code" : "Bot Access Code"}
          </p>
          <p className="text-3xl font-mono font-bold tracking-widest text-primary">{result.accessCode}</p>
          <CopyCode code={result.accessCode} />
        </div>
        <p className="text-xs text-amber-600 bg-amber-500/10 px-3 py-2 rounded-xl">
          ⚠️ Single-use — shown once only. This code expires after the user enters it.
        </p>
        <Button className="w-full rounded-full" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

// ── Bot unlock picker ─────────────────────────────────────────────────────────

function BotUnlockPicker({
  phone,
  password,
  bots,
  onSuccess,
  onClose,
}: {
  phone: string;
  password: string;
  bots: any[];
  onSuccess: (result: UnlockResult) => void;
  onClose: () => void;
}) {
  const [selectedBotId, setSelectedBotId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBotId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(phone)}/bots/${encodeURIComponent(selectedBotId)}/unlock`,
        { method: "POST", headers: { "x-admin-password": password } },
      );
      const data = await res.json();
      if (res.ok) {
        const bot = bots.find(b => b._id === selectedBotId);
        onSuccess({ phone, accessCode: data.accessCode, type: "bot", botName: bot?.name });
      } else {
        setError(data.error ?? "Failed to unlock bot");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Unlock Bot for User</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{phone}</p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleUnlock} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Select Companion</label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={selectedBotId}
              onChange={e => setSelectedBotId(e.target.value)}
            >
              <option value="">— Choose a companion —</option>
              {bots.map(b => (
                <option key={b._id} value={b._id}>{b.name}, {b.age}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              type="submit"
              className="rounded-full flex-1"
              disabled={!selectedBotId || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><KeyRound className="h-3.5 w-3.5 mr-1.5" />Generate Code</>}
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={onClose} className="rounded-full">Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const [password, setPassword] = useState("");
  const [verifiedPassword, setVerifiedPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "bots">("overview");

  // Bot state
  const [editingBot, setEditingBot] = useState<any | null>(null);
  const [showAddBot, setShowAddBot] = useState(false);
  const [newBot, setNewBot] = useState({
    name: "", age: "", tagline: "", bio: "", avatar: "", interests: "", scripts: "",
  });

  // Unlock state
  const [unlockResult, setUnlockResult] = useState<UnlockResult | null>(null);
  const [unlockingPhone, setUnlockingPhone] = useState<string | null>(null);
  const [botPickerPhone, setBotPickerPhone] = useState<string | null>(null);

  const headers = { "x-admin-password": verifiedPassword };

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useFetchAdminStats({
    query: { queryKey: getFetchAdminStatsQueryKey(), enabled: authed, retry: false },
    request: { headers },
  });

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useFetchAdminUsers(
    undefined,
    {
      query: { queryKey: getFetchAdminUsersQueryKey(), enabled: authed && activeTab === "users", retry: false },
      request: { headers },
    }
  );

  const { data: revenue } = useFetchAdminRevenue({
    query: { queryKey: getFetchAdminRevenueQueryKey(), enabled: authed && activeTab === "overview", retry: false },
    request: { headers },
  });

  // Bots always loaded when authed (needed for bot unlock picker in any tab)
  const { data: bots, isLoading: botsLoading, refetch: refetchBots } = useListBots({
    query: { queryKey: getListBotsQueryKey(), enabled: authed },
  });

  const deleteBot = useDeleteBot();
  const updateBot = useUpdateBot();
  const createBot = useCreateBot();

  // ── Login: verify password with server BEFORE granting access ──────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        setVerifiedPassword(password);
        setAuthed(true);
      } else if (res.status === 401) {
        setLoginError("Incorrect admin password. Please try again.");
        setPassword("");
      } else if (res.status === 500) {
        setLoginError("Admin password not configured on the server.");
      } else {
        setLoginError("Server error. Please try again.");
      }
    } catch {
      setLoginError("Network error. Please check your connection.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleDeleteBot = (botId: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    deleteBot.mutate({ botId }, {
      request: { headers },
      onSuccess: () => refetchBots(),
    } as any);
  };

  const handleUpdateBot = () => {
    if (!editingBot) return;
    const scripts = editingBot.scripts
      ? (typeof editingBot.scripts === "string"
          ? editingBot.scripts.split("\n").map((s: string) => s.trim()).filter(Boolean)
          : editingBot.scripts)
      : [];
    updateBot.mutate(
      {
        botId: editingBot._id,
        data: {
          name: editingBot.name, age: parseInt(editingBot.age),
          tagline: editingBot.tagline, bio: editingBot.bio, avatar: editingBot.avatar,
          interests: typeof editingBot.interests === "string"
            ? editingBot.interests.split(",").map((s: string) => s.trim()).filter(Boolean)
            : editingBot.interests,
          scripts,
        },
      },
      { onSuccess: () => { setEditingBot(null); refetchBots(); } }
    );
  };

  const handleCreateBot = () => {
    const scripts = newBot.scripts.split("\n").map((s) => s.trim()).filter(Boolean);
    createBot.mutate(
      {
        data: {
          name: newBot.name, age: parseInt(newBot.age), tagline: newBot.tagline,
          bio: newBot.bio, avatar: newBot.avatar,
          interests: newBot.interests.split(",").map((s) => s.trim()).filter(Boolean),
          scripts,
        },
      },
      {
        onSuccess: () => {
          setShowAddBot(false);
          setNewBot({ name: "", age: "", tagline: "", bio: "", avatar: "", interests: "", scripts: "" });
          refetchBots();
        },
      }
    );
  };

  const handlePlatformUnlockUser = async (phone: string) => {
    setUnlockingPhone(phone);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(phone)}/unlock`, {
        method: "POST",
        headers: { "x-admin-password": verifiedPassword },
      });
      const data = await res.json();
      if (res.ok) {
        setUnlockResult({ phone: data.phone, accessCode: data.accessCode, type: "platform" });
        refetchUsers();
      }
    } finally {
      setUnlockingPhone(null);
    }
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card border rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold">Admin Access</h1>
            <p className="text-muted-foreground text-sm mt-1">Enter the admin password to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-center"
              autoComplete="current-password"
              disabled={loginLoading}
              autoFocus
            />
            {loginError && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-xl">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}
            <Button type="submit" className="w-full rounded-full" disabled={!password || loginLoading}>
              {loginLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying…</> : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "users" as const, label: `Users (${stats?.totalUsers ?? "…"})` },
    { id: "bots" as const, label: `Bots (${stats?.totalBots ?? "…"})` },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">

      {/* ── Unlock success popup ── */}
      {unlockResult && (
        <UnlockSuccessModal result={unlockResult} onClose={() => setUnlockResult(null)} />
      )}

      {/* ── Bot picker modal ── */}
      {botPickerPhone && bots && (
        <BotUnlockPicker
          phone={botPickerPhone}
          password={verifiedPassword}
          bots={bots}
          onSuccess={(result) => {
            setUnlockResult(result);
            setBotPickerPhone(null);
            refetchUsers();
          }}
          onClose={() => setBotPickerPhone(null)}
        />
      )}

      {/* ── Header ── */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-xs">ChatConnect platform management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => { refetchStats(); refetchUsers(); refetchBots(); }}>
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </Button>
            <Button variant="outline" size="sm" className="rounded-full text-muted-foreground" onClick={() => { setAuthed(false); setVerifiedPassword(""); setPassword(""); }}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 flex gap-1 pb-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            ) : !stats ? (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-3 rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Failed to load stats. Check your admin password.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Users className="h-5 w-5" />} label="Total Users" value={stats.totalUsers ?? 0} sub="registered phones" />
                <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total Revenue" value={`Ksh ${(stats.totalRevenue ?? 0).toLocaleString()}`} sub={`${stats.completedPayments ?? 0} payments`} />
                <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Messages Sent" value={(stats.totalMessages ?? 0).toLocaleString()} />
                <StatCard icon={<Bot className="h-5 w-5" />} label="Active Bots" value={stats.totalBots ?? 0} sub={`${stats.botPayments ?? 0} unlocks`} />
              </div>
            )}

            {revenue?.chart && revenue.chart.length > 0 && (
              <div className="bg-card border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold text-sm">Revenue — Last 30 Days</h2>
                </div>
                <div className="flex items-end gap-1 h-28">
                  {revenue.chart.map((d) => {
                    const max = Math.max(...revenue.chart.map((x) => x.amount), 1);
                    const pct = (d.amount / max) * 100;
                    return (
                      <div key={d.date} className="flex-1 group relative" title={`${d.date}: Ksh ${d.amount}`}>
                        <div className="w-full rounded-t bg-primary/60 group-hover:bg-primary transition-colors" style={{ height: `${Math.max(pct, 4)}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                  <span>{revenue.chart[0]?.date}</span>
                  <span>{revenue.chart[revenue.chart.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border rounded-2xl p-5">
                  <p className="text-xs text-muted-foreground font-medium">Platform Unlocks (Ksh 50)</p>
                  <p className="text-2xl font-bold mt-1">{stats.platformPayments}</p>
                  <p className="text-xs text-muted-foreground">= Ksh {(stats.platformPayments * 50).toLocaleString()}</p>
                </div>
                <div className="bg-card border rounded-2xl p-5">
                  <p className="text-xs text-muted-foreground font-medium">Bot Unlocks (Ksh 20)</p>
                  <p className="text-2xl font-bold mt-1">{stats.botPayments}</p>
                  <p className="text-xs text-muted-foreground">= Ksh {(stats.botPayments * 20).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Users ── */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="bg-card border rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Platform Code</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bot Codes</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bots</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Msgs</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Revenue</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Joined</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="border-b">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(j => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                      </tr>
                    ))
                  ) : usersData?.users.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No users yet</td></tr>
                  ) : (
                    (usersData?.users as any[])?.map((u: any) => (
                      <tr key={u._id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{u.phone}</td>
                        <td className="px-4 py-3">
                          {u.platformUnlocked ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.unlockedBy === "admin" ? "bg-blue-500/10 text-blue-600" : "bg-green-500/10 text-green-600"}`}>
                              {u.unlockedBy === "admin" ? "Admin" : "Paid"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Locked</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.accessCode
                            ? <CopyCode code={u.accessCode} />
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {(u.botAccessCodes ?? []).length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {(u.botAccessCodes as any[]).map((b: any) => {
                                const bot = bots?.find(bt => bt._id === b.botId);
                                return (
                                  <div key={b.botId} className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{bot?.name ?? "Bot"}</span>
                                    <CopyCode code={b.code} />
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{u.unlockedBotsCount}</td>
                        <td className="px-4 py-3 text-center">{u.messageCount}</td>
                        <td className="px-4 py-3 font-semibold text-primary">Ksh {u.revenue}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full gap-1 text-xs h-7 px-2.5"
                              onClick={() => handlePlatformUnlockUser(u.phone)}
                              disabled={unlockingPhone === u.phone}
                              title="Unlock platform access"
                            >
                              {unlockingPhone === u.phone
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <><Unlock className="h-3 w-3" />{u.platformUnlocked ? "Re-unlock" : "Unlock"}</>
                              }
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full gap-1 text-xs h-7 px-2.5"
                              onClick={() => setBotPickerPhone(u.phone)}
                              title="Grant free bot access"
                            >
                              <KeyRound className="h-3 w-3" />Bot
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {usersData && (
                <div className="px-4 py-3 border-t text-xs text-muted-foreground flex items-center justify-between">
                  <span>Showing {usersData.users.length} of {usersData.total} users</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => refetchUsers()}>Refresh</Button>
                </div>
              )}
            </div>

            <AddUserPanel
              password={verifiedPassword}
              onUnlocked={(phone, code) => { setUnlockResult({ phone, accessCode: code, type: "platform" }); refetchUsers(); }}
            />
          </div>
        )}

        {/* ── Bots ── */}
        {activeTab === "bots" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{bots?.length ?? 0} companions configured</p>
              <Button size="sm" className="rounded-full gap-1.5" onClick={() => setShowAddBot(true)}>
                <Plus className="h-4 w-4" />Add Bot
              </Button>
            </div>

            {showAddBot && (
              <div className="bg-card border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">New Companion</h3>
                  <button onClick={() => setShowAddBot(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Name *" value={newBot.name} onChange={e => setNewBot(p => ({ ...p, name: e.target.value }))} />
                  <Input placeholder="Age *" type="number" value={newBot.age} onChange={e => setNewBot(p => ({ ...p, age: e.target.value }))} />
                </div>
                <Input placeholder="Tagline *" value={newBot.tagline} onChange={e => setNewBot(p => ({ ...p, tagline: e.target.value }))} />
                <Input placeholder="Bio" value={newBot.bio} onChange={e => setNewBot(p => ({ ...p, bio: e.target.value }))} />
                <Input placeholder="Avatar URL *" value={newBot.avatar} onChange={e => setNewBot(p => ({ ...p, avatar: e.target.value }))} />
                <Input placeholder="Interests (comma-separated)" value={newBot.interests} onChange={e => setNewBot(p => ({ ...p, interests: e.target.value }))} />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Chat Scripts — one line per response</p>
                  <textarea
                    className="w-full min-h-[140px] rounded-xl border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder={"Hey! So happy you're here.\nTell me something interesting about yourself."}
                    value={newBot.scripts}
                    onChange={e => setNewBot(p => ({ ...p, scripts: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateBot} disabled={createBot.isPending || !newBot.name || !newBot.age || !newBot.tagline || !newBot.avatar} className="rounded-full">
                    {createBot.isPending ? "Creating…" : "Create Bot"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddBot(false)} className="rounded-full">Cancel</Button>
                </div>
              </div>
            )}

            {editingBot && (
              <div className="bg-card border-2 border-primary/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Editing: {editingBot.name}</h3>
                  <button onClick={() => setEditingBot(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Name" value={editingBot.name} onChange={e => setEditingBot((p: any) => ({ ...p, name: e.target.value }))} />
                  <Input placeholder="Age" type="number" value={editingBot.age} onChange={e => setEditingBot((p: any) => ({ ...p, age: e.target.value }))} />
                </div>
                <Input placeholder="Tagline" value={editingBot.tagline} onChange={e => setEditingBot((p: any) => ({ ...p, tagline: e.target.value }))} />
                <Input placeholder="Bio" value={editingBot.bio} onChange={e => setEditingBot((p: any) => ({ ...p, bio: e.target.value }))} />
                <Input placeholder="Avatar URL" value={editingBot.avatar} onChange={e => setEditingBot((p: any) => ({ ...p, avatar: e.target.value }))} />
                <Input
                  placeholder="Interests (comma-separated)"
                  value={Array.isArray(editingBot.interests) ? editingBot.interests.join(", ") : editingBot.interests}
                  onChange={e => setEditingBot((p: any) => ({ ...p, interests: e.target.value }))}
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Chat Scripts — one line per response</p>
                  <textarea
                    className="w-full min-h-[140px] rounded-xl border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={Array.isArray(editingBot.scripts) ? editingBot.scripts.join("\n") : editingBot.scripts ?? ""}
                    onChange={e => setEditingBot((p: any) => ({ ...p, scripts: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdateBot} disabled={updateBot.isPending} className="rounded-full">
                    {updateBot.isPending ? "Saving…" : "Save Changes"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingBot(null)} className="rounded-full">Cancel</Button>
                </div>
              </div>
            )}

            {botsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {bots?.map((bot) => (
                  <div key={bot._id} className="bg-card border rounded-2xl p-4 flex gap-3 items-start">
                    <img src={bot.avatar} alt={bot.name} className="h-14 w-14 rounded-xl object-cover flex-shrink-0 border" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{bot.name}, {bot.age}</p>
                          <p className="text-xs text-muted-foreground truncate">{bot.tagline}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingBot({ ...bot, age: bot.age.toString(), interests: bot.interests?.join(", ") ?? "", scripts: (bot as any).scripts ?? [] })}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBot(bot._id, bot.name)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {bot.interests?.slice(0, 3).map((interest, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md">{interest}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add User Panel ─────────────────────────────────────────────────────────────

function AddUserPanel({ password, onUnlocked }: {
  password: string;
  onUnlocked: (phone: string, code: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(phone.trim())}/unlock`, {
        method: "POST",
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (res.ok) {
        onUnlocked(data.phone, data.accessCode);
        setPhone("");
        setShow(false);
      } else {
        setError(data.error ?? "Failed to unlock user");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!show) {
    return (
      <Button variant="outline" className="rounded-full gap-1.5" onClick={() => setShow(true)}>
        <Unlock className="h-4 w-4" />Unlock a phone number
      </Button>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 space-y-3 max-w-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Unlock a phone number</h3>
        <button onClick={() => setShow(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
      </div>
      <form onSubmit={handleUnlock} className="space-y-3">
        <Input type="tel" placeholder="e.g. 0712345678" value={phone} onChange={e => setPhone(e.target.value)} autoFocus />
        {error && <p className="text-destructive text-xs">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" type="submit" disabled={loading || !phone.trim()} className="rounded-full">
            {loading ? "Unlocking…" : "Unlock & Get Code"}
          </Button>
          <Button size="sm" variant="outline" type="button" onClick={() => setShow(false)} className="rounded-full">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
