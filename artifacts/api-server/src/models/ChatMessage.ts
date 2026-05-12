import { mongoose } from "../lib/mongodb";

const chatMessageSchema = new mongoose.Schema(
  {
    botId: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ["user", "bot"], required: true },
    text: { type: String, required: true },
  },
  { timestamps: true },
);

export const ChatMessage =
  mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", chatMessageSchema);
