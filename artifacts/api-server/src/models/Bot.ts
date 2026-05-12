import { mongoose } from "../lib/mongodb";

const botSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    tagline: { type: String, required: true },
    bio: { type: String, default: "" },
    avatar: { type: String, required: true },
    interests: { type: [String], default: [] },
    scripts: { type: [String], default: [] },
    isOnline: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Bot = mongoose.models.Bot || mongoose.model("Bot", botSchema);
