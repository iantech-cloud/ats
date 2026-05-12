import { Router, type IRouter } from "express";
import { User } from "../models/User";
import { generateSessionToken } from "../lib/code";
import { isValidKenyanPhone } from "../lib/phone";

const router: IRouter = Router();

// GET /auth/session — look up existing user session (does NOT create users)
router.get("/auth/session", async (req, res): Promise<void> => {
  const phone = (req.query["phone"] as string)?.trim();

  if (!phone) {
    res.status(400).json({ error: "phone is required" });
    return;
  }

  if (!isValidKenyanPhone(phone)) {
    res.status(400).json({ error: "Invalid phone number format" });
    return;
  }

  const user = await User.findOne({ phone });

  if (!user) {
    res.json({
      phone,
      platformUnlocked: false,
      unlockedBots: [],
      hasAccessCode: false,
      sessionToken: null,
    });
    return;
  }

  const hasAccessCode = user.unlockedBy === "admin" && !!user.accessCode;

  // For M-Pesa paid users re-logging in: issue/refresh session token automatically
  let sessionToken: string | null = null;
  if (user.platformUnlocked && user.unlockedBy === "payment") {
    if (!user.sessionToken) {
      user.sessionToken = generateSessionToken();
      await user.save();
    }
    sessionToken = user.sessionToken;
  }

  res.json({
    phone: user.phone,
    platformUnlocked: user.platformUnlocked,
    unlockedBots: user.unlockedBots,
    hasAccessCode,
    sessionToken,
  });
});

// POST /auth/verify — verify platform access code (admin-unlocked users, single-use)
router.post("/auth/verify", async (req, res): Promise<void> => {
  const { phone, code } = req.body as { phone?: string; code?: string };

  if (!phone || !code) {
    res.status(400).json({ error: "phone and code are required" });
    return;
  }

  const normalizedPhone = phone.trim();
  const normalizedCode = code.trim().toUpperCase();

  if (!isValidKenyanPhone(normalizedPhone)) {
    res.status(400).json({ error: "Invalid phone number format" });
    return;
  }

  const user = await User.findOne({ phone: normalizedPhone });
  if (!user || !user.accessCode || user.accessCode !== normalizedCode) {
    res.status(401).json({ error: "Invalid access code. Please check with whoever granted you access." });
    return;
  }

  // Issue a fresh session token and immediately expire the code (single-use)
  user.sessionToken = generateSessionToken();
  user.accessCode = null;
  await user.save();

  res.json({
    valid: true,
    phone: user.phone,
    platformUnlocked: user.platformUnlocked,
    unlockedBots: user.unlockedBots,
    sessionToken: user.sessionToken,
  });
});

// POST /auth/verify-bot — verify a bot-level access code (single-use)
router.post("/auth/verify-bot", async (req, res): Promise<void> => {
  const { phone, botId, code } = req.body as { phone?: string; botId?: string; code?: string };

  if (!phone || !botId || !code) {
    res.status(400).json({ error: "phone, botId, and code are required" });
    return;
  }

  const normalizedPhone = phone.trim();
  const normalizedCode = code.trim().toUpperCase();

  if (!isValidKenyanPhone(normalizedPhone)) {
    res.status(400).json({ error: "Invalid phone number format" });
    return;
  }

  const user = await User.findOne({ phone: normalizedPhone });
  if (!user) {
    res.status(401).json({ error: "Invalid bot access code." });
    return;
  }

  const entry = (user.botAccessCodes ?? []).find(
    (b: any) => b.botId === botId && b.code === normalizedCode,
  );
  if (!entry) {
    res.status(401).json({ error: "Invalid bot access code." });
    return;
  }

  // Consume the code immediately (single-use)
  user.botAccessCodes = (user.botAccessCodes ?? []).filter(
    (b: any) => b.botId !== botId,
  );

  // Grant access to the bot if not already unlocked
  if (!user.unlockedBots.includes(botId)) {
    user.unlockedBots.push(botId);
  }

  // Ensure a session token exists
  if (!user.sessionToken) {
    user.sessionToken = generateSessionToken();
  }

  await user.save();

  res.json({
    valid: true,
    phone: user.phone,
    botId,
    platformUnlocked: user.platformUnlocked,
    unlockedBots: user.unlockedBots,
    sessionToken: user.sessionToken,
  });
});

export default router;
