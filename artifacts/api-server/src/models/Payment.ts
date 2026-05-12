import { mongoose } from "../lib/mongodb";

const paymentSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    type: { type: String, enum: ["platform", "bot"], required: true },
    botId: { type: String, default: null },

    // Amounts stored both as KES (human) and cents (precision)
    amount: { type: Number, required: true },
    amountCents: { type: Number, required: true },

    // M-Pesa STK identifiers
    checkoutRequestId: { type: String, required: true, index: true },
    merchantRequestId: { type: String, default: null, index: true },

    // Unique internal reference e.g. TXN-PLATFORM-1748001234-ABC123
    transactionRef: { type: String, default: null, index: true },

    // Transaction lifecycle
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled", "timeout"],
      default: "pending",
      index: true,
    },
    resultCode: { type: String, default: null },
    resultDesc: { type: String, default: null },

    // M-Pesa confirmed fields (populated on success)
    mpesaReceiptNumber: { type: String, default: null, index: true },
    mpesaTransactionDate: { type: String, default: null },
    mpesaPhoneNumber: { type: String, default: null },
    mpesaBalance: { type: String, default: null },
    completedAt: { type: Date, default: null },

    // Raw payloads for full auditability
    metadata: {
      stkPushResponse: { type: mongoose.Schema.Types.Mixed, default: null },
      callbackData: { type: mongoose.Schema.Types.Mixed, default: null },
      queryData: { type: mongoose.Schema.Types.Mixed, default: null },
    },
  },
  { timestamps: true },
);

export const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
