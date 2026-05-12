import { Router, type IRouter } from "express";
import { stkPush, queryStkPushStatus, mapResultCode, extractCallbackItems } from "../lib/mpesa";
import { Payment } from "../models/Payment";
import { User } from "../models/User";
import { generateSessionToken, generateTransactionRef } from "../lib/code";
import { isValidKenyanPhone } from "../lib/phone";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Initiate Platform Payment ────────────────────────────────────────────────

router.post("/payments/initiate-platform", async (req, res): Promise<void> => {
  const { phone } = req.body;

  if (!phone) {
    res.status(400).json({ error: "phone is required" });
    return;
  }

  const normalizedPhone = String(phone).trim();
  if (!isValidKenyanPhone(normalizedPhone)) {
    res.status(400).json({ error: "Invalid phone number format" });
    return;
  }

  const user = await User.findOne({ phone: normalizedPhone });
  if (user?.platformUnlocked) {
    res.json({ message: "Platform already unlocked", checkoutRequestId: "already_unlocked" });
    return;
  }

  try {
    const transactionRef = generateTransactionRef("platform");
    const result = await stkPush(normalizedPhone, 50, "CHATCONNECT", "Unlock Chat Platform – Ksh 50");

    await Payment.create({
      phone: normalizedPhone,
      type: "platform",
      botId: null,
      amount: 50,
      amountCents: 5000,
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      transactionRef,
      status: "pending",
      metadata: {
        stkPushResponse: result,
      },
    });

    logger.info({ phone: normalizedPhone, checkoutRequestId: result.CheckoutRequestID, transactionRef }, "Platform STK push initiated");

    res.json({
      message: "STK push sent. Enter your M-Pesa PIN.",
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      transactionRef,
    });
  } catch (err) {
    req.log.error({ err }, "STK push failed");
    res.status(500).json({ error: "Payment initiation failed. Please try again." });
  }
});

// ─── Initiate Bot Payment ─────────────────────────────────────────────────────

router.post("/payments/initiate-bot", async (req, res): Promise<void> => {
  const { phone, botId } = req.body;

  if (!phone || !botId) {
    res.status(400).json({ error: "phone and botId are required" });
    return;
  }

  const normalizedPhone = String(phone).trim();
  if (!isValidKenyanPhone(normalizedPhone)) {
    res.status(400).json({ error: "Invalid phone number format" });
    return;
  }

  const user = await User.findOne({ phone: normalizedPhone });
  if (user?.unlockedBots?.includes(botId)) {
    res.json({ message: "Bot already unlocked", checkoutRequestId: "already_unlocked" });
    return;
  }

  try {
    const transactionRef = generateTransactionRef("bot");
    const result = await stkPush(normalizedPhone, 20, `BOT-${String(botId).slice(0, 8)}`, "Unlock Companion – Ksh 20");

    await Payment.create({
      phone: normalizedPhone,
      type: "bot",
      botId,
      amount: 20,
      amountCents: 2000,
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      transactionRef,
      status: "pending",
      metadata: {
        stkPushResponse: result,
      },
    });

    logger.info({ phone: normalizedPhone, botId, checkoutRequestId: result.CheckoutRequestID, transactionRef }, "Bot STK push initiated");

    res.json({
      message: "STK push sent. Enter your M-Pesa PIN.",
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      transactionRef,
    });
  } catch (err) {
    req.log.error({ err }, "STK push failed");
    res.status(500).json({ error: "Payment initiation failed. Please try again." });
  }
});

// ─── M-Pesa Callback ─────────────────────────────────────────────────────────

router.post("/payments/callback", async (req, res): Promise<void> => {
  // Always respond 200 immediately so Safaricom doesn't retry
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });

  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) return;

    const { CheckoutRequestID, MerchantRequestID, ResultCode, ResultDesc, CallbackMetadata } = body;

    const payment = await Payment.findOne({ checkoutRequestId: CheckoutRequestID });
    if (!payment) {
      logger.warn({ CheckoutRequestID }, "Payment not found for callback");
      return;
    }

    const resultCodeStr = String(ResultCode ?? "");
    const mappedStatus = mapResultCode(resultCodeStr);

    payment.resultCode = resultCodeStr;
    payment.resultDesc = ResultDesc ?? "";
    if (MerchantRequestID) payment.merchantRequestId = MerchantRequestID;

    // Store full callback payload for auditability
    payment.metadata = {
      ...payment.metadata,
      callbackData: body,
    };

    if (ResultCode === 0) {
      const items: Array<{ Name: string; Value: unknown }> = CallbackMetadata?.Item ?? [];
      const extracted = extractCallbackItems(items);

      payment.status = "completed";
      payment.completedAt = new Date();
      payment.mpesaReceiptNumber = extracted["MpesaReceiptNumber"] ?? null;
      payment.mpesaTransactionDate = extracted["TransactionDate"] ?? null;
      payment.mpesaPhoneNumber = extracted["PhoneNumber"] ?? null;
      payment.mpesaBalance = extracted["Balance"] ?? null;

      // Verify amount matches what we expected
      const paidAmount = extracted["Amount"] ? Number(extracted["Amount"]) : null;
      if (paidAmount && paidAmount !== payment.amount) {
        logger.warn(
          { checkoutRequestId: CheckoutRequestID, expected: payment.amount, received: paidAmount },
          "Amount mismatch in callback",
        );
      }

      await payment.save();

      let user = await User.findOne({ phone: payment.phone });
      if (!user) user = await User.create({ phone: payment.phone });

      if (payment.type === "platform" && !user.platformUnlocked) {
        user.platformUnlocked = true;
        user.unlockedBy = "payment";
        if (!user.sessionToken) user.sessionToken = generateSessionToken();
        await user.save();
        logger.info(
          { phone: payment.phone, receipt: payment.mpesaReceiptNumber, ref: payment.transactionRef },
          "Platform unlocked via callback",
        );
      } else if (payment.type === "bot" && payment.botId) {
        if (!user.unlockedBots.includes(payment.botId)) {
          user.unlockedBots.push(payment.botId);
          if (!user.sessionToken) user.sessionToken = generateSessionToken();
          await user.save();
          logger.info(
            { phone: payment.phone, botId: payment.botId, receipt: payment.mpesaReceiptNumber, ref: payment.transactionRef },
            "Bot unlocked via callback",
          );
        }
      }
    } else {
      payment.status = mappedStatus === "pending" ? "failed" : mappedStatus;
      await payment.save();
      logger.info({ CheckoutRequestID, ResultCode, ResultDesc }, "Payment not completed via callback");
    }
  } catch (err) {
    logger.error({ err }, "Error processing M-Pesa callback");
  }
});

// ─── Unlock helpers ───────────────────────────────────────────────────────────

async function unlockPlatform(phone: string): Promise<string | null> {
  let user = await User.findOne({ phone });
  if (!user) user = await User.create({ phone });
  if (!user.platformUnlocked) {
    user.platformUnlocked = true;
    user.unlockedBy = "payment";
  }
  if (!user.sessionToken) user.sessionToken = generateSessionToken();
  await user.save();
  logger.info({ phone }, "Platform unlocked via STK query");
  return user.sessionToken;
}

async function unlockBot(phone: string, botId: string): Promise<string | null> {
  let user = await User.findOne({ phone });
  if (!user) user = await User.create({ phone });
  if (!user.unlockedBots.includes(botId)) {
    user.unlockedBots.push(botId);
  }
  if (!user.sessionToken) user.sessionToken = generateSessionToken();
  await user.save();
  logger.info({ phone, botId }, "Bot unlocked via STK query");
  return user.sessionToken;
}

// ─── Payment Status ───────────────────────────────────────────────────────────

router.get("/payments/status", async (req, res): Promise<void> => {
  const phone = (req.query["phone"] as string)?.trim();
  const botId = req.query["botId"] as string | undefined;
  const checkoutRequestId = req.query["checkoutRequestId"] as string | undefined;

  if (!phone) {
    res.status(400).json({ error: "phone is required" });
    return;
  }

  if (!isValidKenyanPhone(phone)) {
    res.status(400).json({ error: "Invalid phone number format" });
    return;
  }

  const user = await User.findOne({ phone });
  let paymentStatus: string = "none";
  let resultCode: string | undefined;
  let resultDesc: string | undefined;
  let sessionToken: string | null = user?.sessionToken ?? null;
  let mpesaReceiptNumber: string | undefined;
  let transactionRef: string | undefined;
  let merchantRequestId: string | undefined;
  let amount: number | undefined;
  let completedAt: string | undefined;

  if (checkoutRequestId && checkoutRequestId !== "already_unlocked") {
    const mpesaQuery = await queryStkPushStatus(checkoutRequestId);

    if (mpesaQuery.success && mpesaQuery.data) {
      const mpesaData = mpesaQuery.data;
      const mpesaStatus = mpesaData.status;
      resultCode = mpesaData.resultCode;
      resultDesc = mpesaData.resultDesc;

      if (mpesaStatus !== "pending") {
        paymentStatus = mpesaStatus;
        const payment = await Payment.findOne({ checkoutRequestId });

        if (payment && payment.status === "pending") {
          const finalStatus = mpesaStatus === "completed" ? "completed" : mpesaStatus;
          payment.status = finalStatus;
          payment.resultCode = resultCode ?? null;
          payment.resultDesc = resultDesc ?? null;

          if (mpesaData.mpesaReceiptNumber) payment.mpesaReceiptNumber = mpesaData.mpesaReceiptNumber;
          if (mpesaData.mpesaTransactionDate) payment.mpesaTransactionDate = mpesaData.mpesaTransactionDate;
          if (mpesaData.mpesaPhoneNumber) payment.mpesaPhoneNumber = mpesaData.mpesaPhoneNumber;

          if (mpesaStatus === "completed") {
            payment.completedAt = new Date();
            payment.metadata = { ...payment.metadata, queryData: mpesaData.rawData };
          }

          await payment.save();

          if (mpesaStatus === "completed") {
            mpesaReceiptNumber = payment.mpesaReceiptNumber ?? undefined;
            transactionRef = payment.transactionRef ?? undefined;
            merchantRequestId = payment.merchantRequestId ?? undefined;
            amount = payment.amount;
            completedAt = payment.completedAt?.toISOString();

            if (payment.type === "platform") {
              sessionToken = await unlockPlatform(phone);
            } else if (payment.type === "bot" && payment.botId) {
              sessionToken = await unlockBot(phone, payment.botId);
            }
          }
        } else if (payment) {
          mpesaReceiptNumber = payment.mpesaReceiptNumber ?? undefined;
          transactionRef = payment.transactionRef ?? undefined;
          merchantRequestId = payment.merchantRequestId ?? undefined;
          amount = payment.amount;
          completedAt = payment.completedAt?.toISOString();
        }
      } else {
        const payment = await Payment.findOne({ checkoutRequestId });
        if (payment && payment.status !== "pending") {
          paymentStatus = payment.status;
          resultCode = payment.resultCode ?? undefined;
          resultDesc = payment.resultDesc ?? undefined;
          mpesaReceiptNumber = payment.mpesaReceiptNumber ?? undefined;
          transactionRef = payment.transactionRef ?? undefined;
          merchantRequestId = payment.merchantRequestId ?? undefined;
          amount = payment.amount;
          completedAt = payment.completedAt?.toISOString();
        } else {
          paymentStatus = "pending";
        }
      }
    } else {
      const payment = await Payment.findOne({ checkoutRequestId });
      if (payment) {
        paymentStatus = payment.status;
        resultCode = payment.resultCode ?? undefined;
        resultDesc = payment.resultDesc ?? undefined;
        mpesaReceiptNumber = payment.mpesaReceiptNumber ?? undefined;
        transactionRef = payment.transactionRef ?? undefined;
        merchantRequestId = payment.merchantRequestId ?? undefined;
        amount = payment.amount;
        completedAt = payment.completedAt?.toISOString();
      }
    }
  } else if (checkoutRequestId === "already_unlocked") {
    paymentStatus = "completed";
  } else {
    const query: Record<string, unknown> = { phone };
    if (botId) query["botId"] = botId;
    const latest = await Payment.findOne(query).sort({ createdAt: -1 });
    if (latest) {
      paymentStatus = latest.status;
      resultCode = latest.resultCode ?? undefined;
      resultDesc = latest.resultDesc ?? undefined;
      mpesaReceiptNumber = latest.mpesaReceiptNumber ?? undefined;
      transactionRef = latest.transactionRef ?? undefined;
      merchantRequestId = latest.merchantRequestId ?? undefined;
      amount = latest.amount;
      completedAt = latest.completedAt?.toISOString();
    }
  }

  const freshUser = await User.findOne({ phone });

  res.json({
    platformUnlocked: freshUser?.platformUnlocked ?? false,
    unlockedBots: freshUser?.unlockedBots ?? [],
    paymentStatus,
    resultCode,
    resultDesc,
    mpesaReceiptNumber,
    transactionRef,
    merchantRequestId,
    amount,
    completedAt,
    sessionToken: freshUser?.sessionToken ?? null,
  });
});

// ─── Transaction History ──────────────────────────────────────────────────────

router.get("/payments/history", async (req, res): Promise<void> => {
  const phone = (req.query["phone"] as string)?.trim();
  const page = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query["limit"] ?? "20"), 10)));

  if (!phone) {
    res.status(400).json({ error: "phone is required" });
    return;
  }

  if (!isValidKenyanPhone(phone)) {
    res.status(400).json({ error: "Invalid phone number format" });
    return;
  }

  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    Payment.find({ phone })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-metadata.stkPushResponse -metadata.callbackData -metadata.queryData")
      .lean(),
    Payment.countDocuments({ phone }),
  ]);

  const records = transactions.map((t: any) => ({
    _id: String(t._id),
    type: t.type,
    botId: t.botId ?? null,
    amount: t.amount,
    amountCents: t.amountCents,
    status: t.status,
    transactionRef: t.transactionRef ?? null,
    checkoutRequestId: t.checkoutRequestId,
    merchantRequestId: t.merchantRequestId ?? null,
    mpesaReceiptNumber: t.mpesaReceiptNumber ?? null,
    mpesaTransactionDate: t.mpesaTransactionDate ?? null,
    resultCode: t.resultCode ?? null,
    resultDesc: t.resultDesc ?? null,
    completedAt: t.completedAt ? (t.completedAt as Date).toISOString() : null,
    createdAt: (t.createdAt as Date).toISOString(),
  }));

  res.json({
    transactions: records,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export default router;
