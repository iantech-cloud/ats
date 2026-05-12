import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { User } from "../models/User";
import { Payment } from "../models/Payment";
import { Bot } from "../models/Bot";
import { ChatMessage } from "../models/ChatMessage";
import { generateAccessCode } from "../lib/code";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function requireAdminPassword(req: Request, res: Response, next: NextFunction): void {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({ error: "Admin password not configured on server" });
    return;
  }
  const provided = (req.headers["x-admin-password"] as string | undefined)?.trim();
  if (!provided) {
    res.status(401).json({ error: "Missing x-admin-password header" });
    return;
  }
  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(adminPassword, "utf8");
  const actual = Buffer.from(provided, "utf8");
  const match =
    expected.length === actual.length &&
    // timingSafeEqual requires same length — already checked above
    (() => {
      try {
        const crypto = require("crypto");
        return crypto.timingSafeEqual(expected, actual);
      } catch {
        return provided === adminPassword;
      }
    })();
  if (!match) {
    logger.warn({ ip: req.ip, path: req.path }, "Admin auth failed");
    res.status(401).json({ error: "Invalid admin password" });
    return;
  }
  next();
}

router.use("/admin", requireAdminPassword);

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [totalUsers, totalBots, payments, totalMessages] = await Promise.all([
    User.countDocuments(),
    Bot.countDocuments(),
    Payment.find({ status: "completed" }),
    ChatMessage.countDocuments(),
  ]);

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const platformPayments = payments.filter((p) => p.type === "platform").length;
  const botPayments = payments.filter((p) => p.type === "bot").length;

  res.json({
    totalUsers,
    totalBots,
    totalRevenue,
    totalMessages,
    platformPayments,
    botPayments,
    completedPayments: payments.length,
  });
});

// ─── Users list ───────────────────────────────────────────────────────────────

router.get("/admin/users", async (req, res): Promise<void> => {
  const page = parseInt(req.query["page"] as string) || 1;
  const limit = parseInt(req.query["limit"] as string) || 50;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(),
  ]);

  const usersWithRevenue = await Promise.all(
    users.map(async (u: any) => {
      const payments = await Payment.find({ phone: u.phone, status: "completed" }).lean();
      const revenue = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
      const msgCount = await ChatMessage.countDocuments({ phone: u.phone });
      return {
        _id: u._id.toString(),
        phone: u.phone,
        platformUnlocked: u.platformUnlocked,
        unlockedBy: u.unlockedBy ?? "payment",
        accessCode: u.unlockedBy === "admin" ? (u.accessCode ?? null) : null,
        botAccessCodes: (u.botAccessCodes ?? []).map((b: any) => ({
          botId: b.botId,
          code: b.code,
        })),
        unlockedBotsCount: u.unlockedBots?.length ?? 0,
        revenue,
        messageCount: msgCount,
        joinedAt: u.createdAt,
      };
    }),
  );

  res.json({ users: usersWithRevenue, total, page, limit });
});

// ─── Platform unlock ──────────────────────────────────────────────────────────

router.post("/admin/users/:phone/unlock", async (req, res): Promise<void> => {
  const phone = decodeURIComponent(req.params["phone"] as string);
  const code = generateAccessCode();

  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({
      phone,
      platformUnlocked: true,
      unlockedBy: "admin",
      accessCode: code,
      unlockedBots: [],
      botAccessCodes: [],
    });
  } else {
    user.platformUnlocked = true;
    user.unlockedBy = "admin";
    user.accessCode = code;
    user.sessionToken = null;
    await user.save();
  }

  logger.info({ phone }, "Platform manually unlocked by admin");
  res.json({ phone, accessCode: code, message: "User unlocked successfully" });
});

// ─── Bot unlock ───────────────────────────────────────────────────────────────

router.post("/admin/users/:phone/bots/:botId/unlock", async (req, res): Promise<void> => {
  const phone = decodeURIComponent(req.params["phone"] as string);
  const botId = req.params["botId"] as string;

  const bot = await Bot.findById(botId).lean();
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  const code = generateAccessCode();

  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({
      phone,
      platformUnlocked: false,
      unlockedBots: [],
      botAccessCodes: [{ botId, code }],
    });
  } else {
    // Remove any existing code for this bot, then add the new one
    user.botAccessCodes = (user.botAccessCodes ?? []).filter(
      (b: any) => b.botId !== botId,
    );
    user.botAccessCodes.push({ botId, code });
    await user.save();
  }

  logger.info({ phone, botId }, "Bot manually unlocked by admin");
  res.json({ phone, botId, accessCode: code, message: "Bot unlocked successfully. Share the code with the user." });
});

// ─── Revenue ──────────────────────────────────────────────────────────────────

router.get("/admin/revenue", async (_req, res): Promise<void> => {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const payments = await Payment.find({
    status: "completed",
    createdAt: { $gte: since },
  }).lean();

  const byDay: Record<string, number> = {};
  for (const p of payments) {
    const day = new Date((p as any).createdAt).toISOString().split("T")[0];
    byDay[day] = (byDay[day] ?? 0) + (p.amount ?? 0);
  }

  const chart = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  res.json({ chart });
});

export default router;
