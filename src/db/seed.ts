import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { categories, settings } from "./schema";

// ─── DB Client ──────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

// ─── Category Definitions ───────────────────────────────

interface ParentCategory {
  name: string;
  color: string;
  icon: string;
  children: string[];
}

const CATEGORY_TREE: ParentCategory[] = [
  {
    name: "Food & Drink",
    color: "#ef4444",
    icon: "🍔",
    children: ["Groceries", "Dining Out", "Coffee", "Alcohol", "Fast Food"],
  },
  {
    name: "Housing",
    color: "#f97316",
    icon: "🏠",
    children: ["Rent", "Utilities", "Internet", "Home Maintenance"],
  },
  {
    name: "Transport",
    color: "#eab308",
    icon: "🚗",
    children: [
      "Gas",
      "Car Payment",
      "Car Insurance",
      "Rideshare",
      "Parking",
      "Public Transit",
    ],
  },
  {
    name: "Shopping",
    color: "#84cc16",
    icon: "🛍️",
    children: ["Clothing", "Electronics", "Home Goods", "Amazon"],
  },
  {
    name: "Entertainment",
    color: "#22c55e",
    icon: "🎮",
    children: ["Streaming", "Gaming", "Movies", "Music", "Events/Concerts"],
  },
  {
    name: "Health",
    color: "#14b8a6",
    icon: "💪",
    children: ["Gym", "Medical", "Dental", "Pharmacy", "Vision"],
  },
  {
    name: "Personal",
    color: "#06b6d4",
    icon: "✂️",
    children: ["Haircuts", "Subscriptions", "Education"],
  },
  {
    name: "Gifts & Donations",
    color: "#3b82f6",
    icon: "🎁",
    children: ["Gifts", "Charity"],
  },
  {
    name: "Travel",
    color: "#6366f1",
    icon: "✈️",
    children: ["Flights", "Hotels", "Activities", "Food (Travel)"],
  },
  {
    name: "Income",
    color: "#8b5cf6",
    icon: "💰",
    children: ["Salary", "Bonus", "Side Income", "Refund"],
  },
  {
    name: "Transfer",
    color: "#a855f7",
    icon: "🔄",
    children: ["Account Transfer"],
  },
];

// ─── Default Settings ───────────────────────────────────

const DEFAULT_SETTINGS = [
  { key: "currency", value: "USD" },
  { key: "dateFormat", value: "MM/DD/YYYY" },
  { key: "theme", value: "dark" },
] as const;

// ─── Seed Logic ─────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding database...\n");

  // --- Categories ---
  let sortOrder = 0;
  let parentsInserted = 0;
  let childrenInserted = 0;

  for (const parent of CATEGORY_TREE) {
    // Insert parent category
    const [inserted] = await db
      .insert(categories)
      .values({
        name: parent.name,
        color: parent.color,
        icon: parent.icon,
        sortOrder: sortOrder++,
        isDefault: false,
      })
      .onConflictDoNothing()
      .returning({ id: categories.id, name: categories.name });

    // Get the parent's ID — either just inserted or already exists
    let parentId: string;
    if (inserted) {
      parentId = inserted.id;
      parentsInserted++;
      console.log(`  + ${parent.icon} ${parent.name}`);
    } else {
      const [existing] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.name, parent.name));
      parentId = existing.id;
      console.log(`  = ${parent.icon} ${parent.name} (already exists)`);
    }

    // Insert children
    for (const childName of parent.children) {
      const [childInserted] = await db
        .insert(categories)
        .values({
          name: childName,
          parentId,
          color: parent.color,
          icon: parent.icon,
          sortOrder: sortOrder++,
          isDefault: false,
        })
        .onConflictDoNothing()
        .returning({ id: categories.id });

      if (childInserted) {
        childrenInserted++;
        console.log(`    + ${childName}`);
      } else {
        console.log(`    = ${childName} (already exists)`);
      }
    }
  }

  // Insert "Uncategorized" (no parent, isDefault: true)
  const [uncatInserted] = await db
    .insert(categories)
    .values({
      name: "Uncategorized",
      color: "#6b7280",
      icon: "❓",
      sortOrder: sortOrder++,
      isDefault: true,
    })
    .onConflictDoNothing()
    .returning({ id: categories.id });

  if (uncatInserted) {
    parentsInserted++;
    console.log(`  + ❓ Uncategorized (default)`);
  } else {
    console.log(`  = ❓ Uncategorized (already exists)`);
  }

  console.log(
    `\n  Categories: ${parentsInserted} parents, ${childrenInserted} children inserted`,
  );

  // --- Settings ---
  console.log("\n⚙️  Seeding settings...\n");
  let settingsInserted = 0;

  for (const setting of DEFAULT_SETTINGS) {
    const [inserted] = await db
      .insert(settings)
      .values({
        key: setting.key,
        value: setting.value,
      })
      .onConflictDoNothing()
      .returning({ id: settings.id });

    if (inserted) {
      settingsInserted++;
      console.log(`  + ${setting.key} = ${JSON.stringify(setting.value)}`);
    } else {
      console.log(
        `  = ${setting.key} = ${JSON.stringify(setting.value)} (already exists)`,
      );
    }
  }

  console.log(`\n  Settings: ${settingsInserted} inserted`);

  // --- Done ---
  console.log("\n✅ Seed complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
