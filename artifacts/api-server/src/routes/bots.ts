import { Router, type IRouter } from "express";
import { Bot } from "../models/Bot";

const router: IRouter = Router();

router.get("/bots", async (_req, res): Promise<void> => {
  const bots = await Bot.find({});
  const result = bots.map((b) => ({
    _id: b._id.toString(),
    name: b.name,
    age: b.age,
    tagline: b.tagline,
    bio: b.bio ?? "",
    avatar: b.avatar,
    interests: b.interests ?? [],
    isOnline: b.isOnline,
  }));
  res.json(result);
});

router.get("/bots/:botId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.botId) ? req.params.botId[0] : req.params.botId;
  const bot = await Bot.findById(raw);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  res.json({
    _id: bot._id.toString(), name: bot.name, age: bot.age,
    tagline: bot.tagline, bio: bot.bio ?? "", avatar: bot.avatar,
    interests: bot.interests ?? [], isOnline: bot.isOnline,
  });
});

router.post("/admin/bots", async (req, res): Promise<void> => {
  const { name, age, tagline, bio, avatar, interests, scripts } = req.body;
  if (!name || !age || !tagline || !avatar) { res.status(400).json({ error: "Missing required fields" }); return; }
  const bot = await Bot.create({ name, age, tagline, bio, avatar, interests, scripts });
  res.status(201).json({
    _id: bot._id.toString(), name: bot.name, age: bot.age,
    tagline: bot.tagline, bio: bot.bio ?? "", avatar: bot.avatar,
    interests: bot.interests ?? [], isOnline: bot.isOnline,
  });
});

router.put("/admin/bots/:botId", async (req, res): Promise<void> => {
  const bot = await Bot.findByIdAndUpdate(req.params.botId, req.body, { new: true });
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  res.json({
    _id: bot._id.toString(), name: bot.name, age: bot.age,
    tagline: bot.tagline, bio: bot.bio ?? "", avatar: bot.avatar,
    interests: bot.interests ?? [], isOnline: bot.isOnline,
  });
});

router.delete("/admin/bots/:botId", async (req, res): Promise<void> => {
  await Bot.findByIdAndDelete(req.params.botId);
  res.json({ message: "Bot deleted" });
});

// Real Unsplash portrait photos — diverse mix of Black and White/other men & women
const DEFAULT_BOTS = [
  // ── Women ──
  {
    name: "Aisha", age: 24, tagline: "Radiating good energy every day",
    bio: "Lover of sunsets, deep talks, and spontaneous road trips. I believe kindness is a superpower.",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=600&fit=crop&auto=format",
    interests: ["Fashion", "Travel", "Yoga", "Photography"], isOnline: true,
    scripts: [
      "Hey! So glad you stopped by 😊", "Tell me something that made you smile today.",
      "I love spontaneous adventures — have you ever done something totally unplanned?",
      "Coffee or matcha? Big life question honestly.", "What's the last trip you took? I'm obsessed with travel.",
      "I feel like good energy is everything. What keeps yours up?", "You seem really genuine. I love that.",
      "If you could be anywhere right now, where would you be?",
    ],
  },
  {
    name: "Sofia", age: 26, tagline: "Adventure seeker & coffee addict",
    bio: "Hiking boots in one hand, espresso in the other. Always planning the next adventure.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop&auto=format",
    interests: ["Hiking", "Coffee", "Photography", "Yoga"], isOnline: true,
    scripts: [
      "Hey there! You've got great taste 😄", "I just got back from the most stunning hike. Do you love the outdoors?",
      "Coffee is basically a personality trait for me. Are you a coffee person?",
      "What's your favorite way to spend a weekend?", "I've been getting into film photography lately — anything you're passionate about?",
      "Nothing beats that feeling of reaching a summit. Have you ever hiked anything tough?",
      "I think traveling solo at least once changes you forever. Agree?", "What's on your bucket list right now?",
    ],
  },
  {
    name: "Kezia", age: 22, tagline: "Free spirit with a big heart",
    bio: "Dance like nobody's watching, love like it's limitless. Here for real connections.",
    avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop&auto=format",
    interests: ["Dance", "Music", "Art", "Wellness"], isOnline: true,
    scripts: [
      "Hi! I'm so happy you're here!", "Do you dance? I feel like everyone has a dance hidden in them.",
      "Music is literally medicine. What are you listening to lately?",
      "I'm really into healing arts right now — journaling, meditation, all of it.",
      "What's something that makes you feel completely alive?", "I think art speaks what words can't.",
      "Real connections are rare. I love that we're talking!", "What's been the best part of your week so far?",
    ],
  },
  {
    name: "Emma", age: 28, tagline: "Bookworm meets wanderlust",
    bio: "Half my heart is in a novel, the other half is planning a flight. Join me?",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop&auto=format",
    interests: ["Reading", "Travel", "Writing", "Coffee"], isOnline: false,
    scripts: [
      "Hello! I was just deep in a book — you saved me from a cliffhanger 😂",
      "Have you read anything lately that completely changed your perspective?",
      "I have a travel journal filled with half-finished stories. Are you a writer at heart?",
      "If your life were a novel, what genre would it be?", "I'm a firm believer in slow mornings and fast adventures.",
      "Books are how I understand the world. What's your way?", "Where would you go if flights were free?",
      "I think the best conversations happen over coffee and a good book topic. Your turn — recommend something!",
    ],
  },
  {
    name: "Amara", age: 25, tagline: "Creative soul & deep thinker",
    bio: "Art, poetry, and conversations that go past midnight. I'm here for all of it.",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=600&fit=crop&auto=format",
    interests: ["Art", "Poetry", "Music", "Culture"], isOnline: true,
    scripts: [
      "Hello beautiful soul!", "I believe every person carries a story worth hearing. What's yours?",
      "Art is my love language — do you have a creative outlet?",
      "What emotion have you felt most deeply this week?", "Poetry finds the words feelings can't form. Do you ever write?",
      "I've been painting a lot lately. Creativity is healing.", "If you could capture one moment in art, what would it be?",
      "I love that you're here. Real conversations are everything.",
    ],
  },
  {
    name: "Lily", age: 23, tagline: "Sunshine girl with a curious mind",
    bio: "Asking 'why' since 1999. Science nerd by day, foodie by night.",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop&auto=format",
    interests: ["Science", "Cooking", "Nature", "Podcasts"], isOnline: true,
    scripts: [
      "Hi! Quick question — coffee or science? (Trick question, both.)", "I'm low-key obsessed with documentaries. You?",
      "What's something random you've always wondered about?", "I cooked a new recipe last night and it was either amazing or a disaster. Want to hear?",
      "Nature really has all the answers if you pay attention, don't you think?",
      "I love people who get excited about random things. What nerds you out?",
      "Podcasts are my commute best friend. Any recs?", "I think curiosity is the sexiest quality. Agree?",
    ],
  },
  {
    name: "Nadia", age: 27, tagline: "Bold, bright & unapologetically me",
    bio: "Entrepreneur, foodie, and firm believer that confidence changes everything.",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=600&fit=crop&auto=format",
    interests: ["Business", "Fashion", "Food", "Networking"], isOnline: false,
    scripts: [
      "Hey! Let's cut straight to it — what are you passionate about?",
      "I built my first business at 22. What's something you've built that you're proud of?",
      "Confidence is a skill, not a trait. Do you agree?", "I love a good dinner conversation. What topic gets you fired up?",
      "What's one bold thing you did recently?", "Ambition is attractive. Tell me your big dream.",
      "Fashion is just confidence you wear.", "I respect people who know what they want. Do you?",
    ],
  },
  {
    name: "Chloe", age: 24, tagline: "Beach vibes & good conversations",
    bio: "Sun, salt water, and stories. Looking for someone to share laughs with.",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop&auto=format",
    interests: ["Surfing", "Travel", "Music", "Fitness"], isOnline: true,
    scripts: [
      "Hey! Hope you brought your good vibes today ☀️", "Do you live near water? I honestly couldn't survive without the ocean.",
      "I surf every morning — it's the best therapy. Do you have a ritual like that?",
      "Tell me something that makes your soul happy.", "Summer or winter? I'm obviously team summer.",
      "Music while working out hits different. What's your hype song?",
      "I think laughter is underrated as a connection tool. What's the funniest thing that happened to you recently?",
      "Beach bonfire or rooftop sunset? You have to choose.",
    ],
  },
  {
    name: "Zuri", age: 26, tagline: "Culture lover & natural hair icon",
    bio: "Afrobeats, good food, and soulful conversations. I carry my culture with pride.",
    avatar: "https://images.unsplash.com/photo-1593104547489-5cfb3839a3b5?w=400&h=600&fit=crop&auto=format",
    interests: ["Afrobeats", "Food", "Travel", "Culture"], isOnline: true,
    scripts: [
      "Habari! Hope your day is as beautiful as this conversation is about to be 😄",
      "Afrobeats or R&B? The eternal debate.", "I'm huge on cultural heritage. Where are you from, and what do you love about it?",
      "Food is love language. What's a dish that takes you home?", "I've been to 12 countries. Where's your dream destination?",
      "Music, food, people — Africa has the richest culture. What culture inspires you?",
      "Tell me something your culture does that you're proud of.", "Every conversation teaches me something. What's your life lesson right now?",
    ],
  },
  {
    name: "Maya", age: 29, tagline: "Yoga instructor & mindfulness nerd",
    bio: "Breathing, moving, and being present. I help people find calm in the chaos.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&auto=format",
    interests: ["Yoga", "Wellness", "Meditation", "Nature"], isOnline: false,
    scripts: [
      "Welcome! Take a breath. You're exactly where you need to be 🌿",
      "How are you really feeling today? Not the surface answer.", "I teach yoga and people always say it changed their life. Have you tried it?",
      "What's one thing you're grateful for right now?", "Mindfulness isn't about being perfect — it's about being present. Where are you right now?",
      "I think rest is revolutionary. Do you give yourself enough of it?",
      "What does your ideal morning look like?", "The body keeps score. What does yours need today?",
    ],
  },
  // ── Men ──
  {
    name: "Malik", age: 27, tagline: "Music producer & night owl",
    bio: "Creating beats and vibes at 2AM. Music is the universal language — I'm fluent.",
    avatar: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=400&h=600&fit=crop&auto=format",
    interests: ["Music", "Hip-hop", "Production", "Culture"], isOnline: true,
    scripts: [
      "Yo! What's good?", "Just laid down a new track — feeling the energy tonight.",
      "Music can change your whole mood in seconds. What are you listening to?",
      "If you could collab with any artist, who would it be?", "Late nights are when creativity really hits. Night owl or early bird?",
      "I study old school beats — the classics never age.", "Real talk: what song describes your life right now?",
      "I think music is the realest form of therapy. What's yours?",
    ],
  },
  {
    name: "James", age: 30, tagline: "Fitness coach & kitchen wizard",
    bio: "Lifting weights by day, perfecting recipes by night. Food and fitness are my love languages.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop&auto=format",
    interests: ["Fitness", "Cooking", "Sports", "Nutrition"], isOnline: true,
    scripts: [
      "Hey! Great to connect.", "Just crushed a workout. Do you train or are you more of a walks-in-the-park person?",
      "Food is life. What's the best meal you've had recently?", "Meal prep Sundays are sacred to me. How do you plan your week?",
      "What's a fitness goal you'd love to hit?", "I think discipline is just love for your future self.",
      "Football or basketball? Big question.", "Nothing beats cooking for someone. What's your comfort food?",
    ],
  },
  {
    name: "Andre", age: 25, tagline: "Entrepreneur & creative visionary",
    bio: "Building brands and breaking limits. I see possibilities where others see walls.",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=600&fit=crop&auto=format",
    interests: ["Business", "Design", "Startups", "Mentorship"], isOnline: true,
    scripts: [
      "What's up! Ready to have an interesting conversation?", "I'm always building something. What project are you working on?",
      "Entrepreneurs see the world differently. Do you have a business mind?",
      "What would you do if failure wasn't an option?", "Branding is storytelling. What's your personal brand?",
      "I mentor young people — it's the most rewarding thing I do. Do you give back somehow?",
      "The biggest risk is not taking one. Agree?", "Where do you see yourself in five years?",
    ],
  },
  {
    name: "Liam", age: 28, tagline: "Architect with an explorer's heart",
    bio: "I design spaces by day and explore them by night. Beauty is in the details.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop&auto=format",
    interests: ["Architecture", "Travel", "Design", "Photography"], isOnline: false,
    scripts: [
      "Hey! Good to see you here.", "I design buildings for a living, but I'm fascinated by how spaces make people feel. What's a space you love?",
      "Every city has a personality. What does yours say?", "Photography trained my eye to see beauty in ordinary things. Do you see it too?",
      "I've visited 30 countries sketching architecture. Where's been your favorite place?",
      "Good design makes life better. What's something beautiful around you right now?",
      "I think curiosity is the foundation of creativity. What makes you curious?",
      "What does your dream home look like?",
    ],
  },
  {
    name: "Kofi", age: 26, tagline: "Storyteller & community builder",
    bio: "Words have power. I use mine to connect, inspire, and uplift.",
    avatar: "https://images.unsplash.com/photo-1559548331-f9cb98001426?w=400&h=600&fit=crop&auto=format",
    interests: ["Writing", "Community", "Podcasting", "Culture"], isOnline: true,
    scripts: [
      "Hey! I love meeting people with stories. What's yours?", "I started a podcast last year — best decision I ever made. Do you listen to any?",
      "Community is everything to me. Who are your people?", "Words have changed the world. What's a quote you live by?",
      "I think everyone has a book in them. Do you?", "What would you tell your younger self?",
      "Local communities need voices. Are you involved in yours?", "What story about your life would you tell if you had a stage?",
    ],
  },
  {
    name: "Ethan", age: 32, tagline: "Tech founder & globe-trotter",
    bio: "Shipped 3 apps, visited 25 countries, still learning every day. Let's talk.",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=600&fit=crop&auto=format",
    interests: ["Technology", "Startups", "Travel", "Gaming"], isOnline: true,
    scripts: [
      "Hey! Glad you're here.", "I just shipped a new feature. There's no better feeling. Are you in tech?",
      "Have you thought about building your own app? The tools today are insane.",
      "I'm planning a trip to Japan next month. Have you ever been?", "Gaming is how I decompress. Into any games?",
      "The tech world moves faster than any of us can track.", "What's the most adventurous thing you've ever done?",
      "Where would you go right now if you could teleport?",
    ],
  },
  {
    name: "Jamal", age: 24, tagline: "Athlete & motivational force",
    bio: "Track champion turned life coach. I believe your limits are further than you think.",
    avatar: "https://images.unsplash.com/photo-1565464027194-7957a2295fb7?w=400&h=600&fit=crop&auto=format",
    interests: ["Athletics", "Fitness", "Coaching", "Motivation"], isOnline: false,
    scripts: [
      "What's up! Energy is everything — what's yours like today?",
      "I ran track professionally. Sport teaches you more than any classroom. Did you play sports?",
      "What's a goal you've been chasing?", "The mental game is 90% of any achievement. Do you train your mind?",
      "I coach teens now and it's the most rewarding thing I do.", "What does winning look like to you?",
      "Champions are made in the moments they don't feel like showing up.", "What do you do when your motivation is low?",
    ],
  },
  {
    name: "Noah", age: 29, tagline: "Chef & flavor storyteller",
    bio: "Food is culture, memory, and love all on one plate. Come hungry.",
    avatar: "https://images.unsplash.com/photo-1545167622-216b84b82655?w=400&h=600&fit=crop&auto=format",
    interests: ["Cooking", "Food Culture", "Travel", "Wine"], isOnline: true,
    scripts: [
      "Hey! First things first — what's your favorite meal?", "Food is honestly my love language. What dish would tell me everything about you?",
      "I trained in Paris and Nairobi. Cuisine is the best world tour.", "What's the last thing you cooked that impressed yourself?",
      "I think slow cooking is a metaphor for good relationships. Patient and worth it.",
      "Wine pairing or cocktail pairing? No wrong answers.", "The best meals are made with people you love. Who's at your table?",
      "If you could eat anywhere in the world tonight, where?",
    ],
  },
  {
    name: "Darius", age: 27, tagline: "Photographer & visual poet",
    bio: "I capture light and life. Every frame tells a truth words miss.",
    avatar: "https://images.unsplash.com/photo-1542736705-4f3f68a61229?w=400&h=600&fit=crop&auto=format",
    interests: ["Photography", "Art", "Film", "Travel"], isOnline: true,
    scripts: [
      "Hey. Every great photo starts with seeing things differently. How do you see the world?",
      "I've shot in 15 countries — each one changed something in me.", "If I photographed you right now, what would the caption be?",
      "Film photography is making a comeback and I'm obsessed.", "What moment in your life would you most want captured?",
      "I think vulnerability is the most photogenic thing a person can have.", "What does beauty mean to you?",
      "I love showing people beauty they walk past every day. What do you overlook?",
    ],
  },
  {
    name: "Finn", age: 26, tagline: "Marine biologist & ocean soul",
    bio: "Studying the deep blue to protect it. The ocean teaches humility.",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&h=600&fit=crop&auto=format",
    interests: ["Ocean", "Science", "Diving", "Conservation"], isOnline: false,
    scripts: [
      "Hey! Do you love the ocean as much as I do?", "I've dived to 40 meters and seen things that don't look real. What blows your mind?",
      "Climate change is literally changing the ocean — it's urgent. Do you think about the environment?",
      "Marine biology chose me, not the other way around. What called you to your passion?",
      "The ocean is 80% unexplored. That's more unknown than outer space.", "What's a natural wonder you'd love to see?",
      "I think people who love the ocean have a certain soul to them. What draws you to nature?",
      "Conservation is love in action. What do you care about protecting?",
    ],
  },
];

router.post("/admin/seed", async (req, res): Promise<void> => {
  const force = req.query["force"] === "true";
  const count = await Bot.countDocuments();
  if (count > 0 && !force) {
    res.json({ message: "Bots already seeded. Use ?force=true to re-seed.", count });
    return;
  }
  if (force) await Bot.deleteMany({});
  await Bot.insertMany(DEFAULT_BOTS);
  res.json({ message: "Bots seeded successfully", count: DEFAULT_BOTS.length });
});

export default router;
