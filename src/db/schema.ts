import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────

export const accountTypeEnum = pgEnum("account_type", [
  "checking",
  "savings",
  "brokerage",
  "401k",
  "hsa",
  "credit_card",
  "other",
]);

export const frequencyEnum = pgEnum("frequency", [
  "weekly",
  "biweekly",
  "semi_monthly",
  "monthly",
  "quarterly",
  "annual",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "planned",
  "booked",
  "paid",
  "completed",
  "cancelled",
]);

export const wishlistPriorityEnum = pgEnum("wishlist_priority", [
  "p1",
  "p2",
  "p3",
]);

export const wishlistStatusEnum = pgEnum("wishlist_status", [
  "wishlist",
  "researching",
  "ready_to_buy",
  "purchased",
]);

export const goalTypeEnum = pgEnum("goal_type", [
  "savings",
  "checking_target",
  "debt_payoff",
  "investment",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "completed",
  "abandoned",
]);

export const payScheduleEnum = pgEnum("pay_schedule", [
  "biweekly",
  "semi_monthly",
  "monthly",
]);

export const incomeTypeEnum = pgEnum("income_type", [
  "salary",
  "bonus",
  "side_income",
]);

export const importStatusEnum = pgEnum("import_status", [
  "pending",
  "completed",
  "failed",
]);

// ─── Tables ──────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    parentId: uuid("parent_id").references((): any => categories.id),
    budgetAmountCents: integer("budget_amount_cents"),
    color: varchar("color", { length: 7 }),
    icon: varchar("icon", { length: 50 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("categories_name_parent_uniq").on(table.name, table.parentId),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    type: accountTypeEnum("type").notNull(),
    institution: varchar("institution", { length: 100 }),
    currentBalanceCents: integer("current_balance_cents").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("accounts_type_idx").on(table.type),
    index("accounts_is_active_idx").on(table.isActive),
  ],
);

export const balanceSnapshots = pgTable(
  "balance_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    balanceCents: integer("balance_cents").notNull(),
    snapshotDate: date("snapshot_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("snapshots_account_date_uniq").on(
      table.accountId,
      table.snapshotDate,
    ),
    index("snapshots_date_idx").on(table.snapshotDate),
  ],
);

export const imports = pgTable(
  "imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fileName: varchar("file_name", { length: 500 }).notNull(),
    fileHash: varchar("file_hash", { length: 64 }).notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    rowCount: integer("row_count").notNull(),
    importedCount: integer("imported_count").notNull().default(0),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    status: importStatusEnum("status").notNull().default("pending"),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("imports_file_hash_uniq").on(table.fileHash),
    index("imports_account_idx").on(table.accountId),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    date: date("date").notNull(),
    amountCents: integer("amount_cents").notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    merchant: varchar("merchant", { length: 200 }),
    categoryId: uuid("category_id").references(() => categories.id),
    notes: text("notes"),
    tags: text("tags").array().notNull().default([]),
    isSplit: boolean("is_split").notNull().default(false),
    importId: uuid("import_id").references(() => imports.id),
    excludeFromTotals: boolean("exclude_from_totals")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("transactions_date_idx").on(table.date),
    index("transactions_account_idx").on(table.accountId),
    index("transactions_category_idx").on(table.categoryId),
    index("transactions_import_idx").on(table.importId),
    index("transactions_dedup_idx").on(
      table.date,
      table.amountCents,
      table.description,
    ),
  ],
);

export const transactionSplits = pgTable(
  "transaction_splits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    amountCents: integer("amount_cents").notNull(),
    notes: varchar("notes", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("splits_transaction_idx").on(table.transactionId),
    index("splits_category_idx").on(table.categoryId),
  ],
);

export const recurringExpenses = pgTable(
  "recurring_expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    categoryId: uuid("category_id").references(() => categories.id),
    frequency: frequencyEnum("frequency").notNull(),
    dueDay: integer("due_day"),
    dueMonth: integer("due_month"),
    isAutoPay: boolean("is_auto_pay").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    accountId: uuid("account_id").references(() => accounts.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("recurring_active_idx").on(table.isActive),
    index("recurring_category_idx").on(table.categoryId),
  ],
);

export const incomeSources = pgTable(
  "income_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    type: incomeTypeEnum("type").notNull(),
    paySchedule: payScheduleEnum("pay_schedule"),
    netPerPaycheckCents: integer("net_per_paycheck_cents"),
    grossPerPaycheckCents: integer("gross_per_paycheck_cents"),
    employerName: varchar("employer_name", { length: 200 }),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("income_active_idx").on(table.isActive),
    index("income_type_idx").on(table.type),
  ],
);

export const bonuses = pgTable("bonuses", {
  id: uuid("id").defaultRandom().primaryKey(),
  incomeSourceId: uuid("income_source_id")
    .notNull()
    .references(() => incomeSources.id),
  name: varchar("name", { length: 200 }).notNull(),
  expectedDate: date("expected_date"),
  expectedAmountCents: integer("expected_amount_cents"),
  actualDate: date("actual_date"),
  actualAmountCents: integer("actual_amount_cents"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const retirementPlans = pgTable(
  "retirement_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    accountId: uuid("account_id").references(() => accounts.id),
    annualLimitCents: integer("annual_limit_cents").notNull(),
    ytdContributionsCents: integer("ytd_contributions_cents")
      .notNull()
      .default(0),
    perPaycheckAmountCents: integer("per_paycheck_amount_cents"),
    employerMatchPct: integer("employer_match_pct"),
    employerMatchCap: integer("employer_match_cap"),
    vestedBalanceCents: integer("vested_balance_cents"),
    totalBalanceCents: integer("total_balance_cents"),
    year: integer("year").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("retirement_account_year_uniq").on(
      table.accountId,
      table.year,
    ),
  ],
);

export const hsaPlans = pgTable(
  "hsa_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    accountId: uuid("account_id").references(() => accounts.id),
    annualLimitCents: integer("annual_limit_cents").notNull(),
    ytdContributionsCents: integer("ytd_contributions_cents")
      .notNull()
      .default(0),
    perPaycheckAmountCents: integer("per_paycheck_amount_cents"),
    cashBalanceCents: integer("cash_balance_cents"),
    investmentBalanceCents: integer("investment_balance_cents"),
    year: integer("year").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("hsa_account_year_uniq").on(table.accountId, table.year),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    estimatedCostCents: integer("estimated_cost_cents"),
    actualCostCents: integer("actual_cost_cents"),
    targetDate: date("target_date"),
    categoryId: uuid("category_id").references(() => categories.id),
    status: eventStatusEnum("status").notNull().default("planned"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("events_status_idx").on(table.status),
    index("events_target_date_idx").on(table.targetDate),
  ],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    estimatedCostCents: integer("estimated_cost_cents"),
    actualCostCents: integer("actual_cost_cents"),
    priority: wishlistPriorityEnum("priority").notNull().default("p2"),
    categoryId: uuid("category_id").references(() => categories.id),
    url: text("url"),
    status: wishlistStatusEnum("status").notNull().default("wishlist"),
    purchaseDate: date("purchase_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("wishlist_status_idx").on(table.status),
    index("wishlist_priority_idx").on(table.priority),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    targetAmountCents: integer("target_amount_cents").notNull(),
    currentAmountCents: integer("current_amount_cents").notNull().default(0),
    targetDate: date("target_date"),
    type: goalTypeEnum("type").notNull(),
    status: goalStatusEnum("status").notNull().default("active"),
    accountId: uuid("account_id").references(() => accounts.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("goals_status_idx").on(table.status),
    index("goals_type_idx").on(table.type),
  ],
);

export const monthlySnapshots = pgTable(
  "monthly_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    month: varchar("month", { length: 7 }).notNull(), // "2026-04"
    totalIncomeCents: integer("total_income_cents").notNull().default(0),
    totalExpensesCents: integer("total_expenses_cents").notNull().default(0),
    netCashflowCents: integer("net_cashflow_cents").notNull().default(0),
    categoryBreakdown: jsonb("category_breakdown"), // { categoryId: amountCents }
    accountBalances: jsonb("account_balances"), // { accountId: balanceCents }
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("snapshots_month_uniq").on(table.month)],
);

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 100 }).notNull(),
    value: jsonb("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("settings_key_uniq").on(table.key)],
);

export const importPatterns = pgTable(
  "import_patterns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pattern: varchar("pattern", { length: 500 }).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("import_patterns_pattern_uniq").on(table.pattern)],
);
