import { Router, type IRouter } from "express";
import { User } from "../models/User";
import { Bot } from "../models/Bot";
import { ChatMessage } from "../models/ChatMessage";

const router: IRouter = Router();

async function resolveUserByToken(phone: string, token: string | undefined) {
  if (!token) return null;
  return User.findOne({ phone, sessionToken: token });
}

function extractBearerToken(req: { headers: Record<string, string | string[] | undefined> }): string | undefined {
  const auth = req.headers["authorization"];
  if (!auth || typeof auth !== "string") return undefined;
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return undefined;
  return parts[1];
}

router.get("/chat/conversations", async (req, res): Promise<void> => {
  const phone = (req.query["phone"] as string)?.trim();
  if (!phone) {
    res.status(400).json({ error: "phone is required" });
    return;
  }

  const botIds: string[] = await ChatMessage.distinct("botId", { phone });

  const conversations = await Promise.all(
    botIds.map(async (botId) => {
      const bot = await Bot.findById(botId).lean();
      const count = await ChatMessage.countDocuments({ botId, phone });
      const last = await ChatMessage.findOne({ botId, phone })
        .sort({ createdAt: -1 })
        .lean();
      return {
        botId,
        botName: bot?.name ?? "Unknown",
        botAvatar: bot?.avatar ?? "",
        messageCount: count,
        lastMessage: last?.text ?? "",
        lastMessageAt: (last as any)?.createdAt?.toISOString() ?? new Date().toISOString(),
      };
    }),
  );

  conversations.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  res.json(conversations);
});

router.get("/chat/messages", async (req, res): Promise<void> => {
  const botId = req.query["botId"] as string;
  const phone = (req.query["phone"] as string)?.trim();

  if (!botId || !phone) {
    res.status(400).json({ error: "botId and phone are required" });
    return;
  }

  const messages = await ChatMessage.find({ botId, phone })
    .sort({ createdAt: 1 })
    .limit(100);

  const result = messages.map((m) => ({
    _id: m._id.toString(),
    botId: m.botId,
    phone: m.phone,
    role: m.role,
    text: m.text,
    createdAt: (m as any).createdAt?.toISOString() ?? new Date().toISOString(),
  }));

  res.json(result);
});

router.post("/chat/messages", async (req, res): Promise<void> => {
  const { phone, botId, text } = req.body;

  if (!phone || !botId || !text) {
    res.status(400).json({ error: "phone, botId, and text are required" });
    return;
  }

  const normalizedPhone = String(phone).trim();
  const token = extractBearerToken(req as any);

  // Require a valid session token — prevents unauthorised access by anyone who only knows the phone number
  const authedUser = await resolveUserByToken(normalizedPhone, token);
  if (!authedUser) {
    res.status(401).json({ error: "Invalid or missing session token. Please log in again." });
    return;
  }

  if (!authedUser.platformUnlocked) {
    res.status(403).json({ error: "Platform access not unlocked. Pay Ksh 50 to continue." });
    return;
  }

  if (!authedUser.unlockedBots.includes(botId)) {
    res.status(403).json({ error: "This bot is locked. Pay Ksh 20 to unlock." });
    return;
  }

  const bot = await Bot.findById(botId);
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }

  await ChatMessage.create({ botId, phone: normalizedPhone, role: "user", text });

  const scripts: string[] = bot.scripts ?? [];
  const messageCount = await ChatMessage.countDocuments({ botId, phone: normalizedPhone, role: "bot" });
  const replyText =
    scripts.length > 0
      ? scripts[messageCount % scripts.length]
      : "Thanks for chatting with me! Keep the conversation going...";

  const reply = await ChatMessage.create({
    botId,
    phone: normalizedPhone,
    role: "bot",
    text: replyText,
  });

  res.json({
    _id: reply._id.toString(),
    botId: reply.botId,
    phone: reply.phone,
    role: reply.role,
    text: reply.text,
    createdAt: (reply as any).createdAt?.toISOString() ?? new Date().toISOString(),
  });
});

export default router;
