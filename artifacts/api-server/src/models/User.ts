import { mongoose } from "../lib/mongodb";

const botAccessCodeSchema = new mongoose.Schema(
  {
    botId: { type: String, required: true },
    code: { type: String, required: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    platformUnlocked: { type: Boolean, default: false },
    unlockedBots: { type: [String], default: [] },
    unlockedBy: { type: String, enum: ["payment", "admin"], default: null },
    accessCode: { type: String, default: null },
    botAccessCodes: { type: [botAccessCodeSchema], default: [] },
    sessionToken: { type: String, default: null },
  },
  { timestamps: true },
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
