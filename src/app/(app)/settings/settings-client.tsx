"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CategoryTree } from "@/components/features/category-tree";
import { updateSetting } from "@/actions/settings";
import { generateAllMissingSnapshots } from "@/actions/snapshots";
import type { CategoryGroup, Category } from "@/db/queries/categories";

// ─── Types ──────────────────────────────────────────────

interface SettingsClientProps {
  groups: CategoryGroup[];
  parentCategories: Category[];
  settings: Record<string, unknown>;
}

type SectionId = "categories" | "export" | "preferences" | "data" | "about";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "categories", label: "Categories" },
  { id: "export", label: "Data Export" },
  { id: "preferences", label: "Preferences" },
  { id: "data", label: "Data Management" },
  { id: "about", label: "About" },
];

const DATE_FORMAT_OPTIONS = [
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
];

const CURRENCY_OPTIONS = [
  { label: "$ (USD)", value: "$" },
  { label: "\u20AC (EUR)", value: "\u20AC" },
  { label: "\u00A3 (GBP)", value: "\u00A3" },
];

const DEFAULT_PAGE_OPTIONS = [
  { label: "Dashboard", value: "/dashboard" },
  { label: "Transactions", value: "/transactions" },
  { label: "Budget", value: "/budget" },
  { label: "Analysis", value: "/analysis" },
  { label: "Accounts", value: "/accounts" },
  { label: "Income", value: "/income" },
  { label: "Expenses", value: "/expenses" },
  { label: "Goals", value: "/goals" },
  { label: "Events", value: "/events" },
  { label: "Wishlist", value: "/wishlist" },
  { label: "Investments", value: "/investments" },
  { label: "Retirement", value: "/retirement" },
  { label: "Settings", value: "/settings" },
];

// ─── Component ──────────────────────────────────────────

export function SettingsClient({
  groups,
  parentCategories,
  settings: initialSettings,
}: SettingsClientProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("categories");

  return (
    <div className="mx-auto max-w-4xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage categories, preferences, and data exports
        </p>
      </div>

      {/* Section Navigation */}
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 p-1">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === section.id
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {/* Section Content */}
      {activeSection === "categories" && (
        <CategoryTree groups={groups} parentCategories={parentCategories} />
      )}
      {activeSection === "export" && <ExportSection />}
      {activeSection === "preferences" && (
        <PreferencesSection settings={initialSettings} />
      )}
      {activeSection === "data" && (
        <DataManagementSection settings={initialSettings} />
      )}
      {activeSection === "about" && <AboutSection />}
    </div>
  );
}

// ─── Export Section ─────────────────────────────────────

function ExportSection() {
  const [exportingTx, setExportingTx] = useState(false);
  const [exportingAcct, setExportingAcct] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  async function downloadExport(
    type: "transactions" | "accounts" | "all",
    setLoading: (v: boolean) => void,
  ) {
    setLoading(true);
    try {
      const response = await fetch(`/api/export?type=${type}`);
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `export-${type}.${type === "all" ? "json" : "csv"}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Export Transactions</CardTitle>
          <CardDescription>
            Download all transactions as a CSV file with dates, amounts,
            descriptions, categories, and tags.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="secondary"
            loading={exportingTx}
            onClick={() => downloadExport("transactions", setExportingTx)}
          >
            Export Transactions CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Accounts</CardTitle>
          <CardDescription>
            Download all accounts as a CSV file with names, types, institutions,
            and current balances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="secondary"
            loading={exportingAcct}
            onClick={() => downloadExport("accounts", setExportingAcct)}
          >
            Export Accounts CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export All Data</CardTitle>
          <CardDescription>
            Download a complete JSON backup of all your data: transactions,
            accounts, categories, income sources, recurring expenses, goals,
            events, wishlist items, retirement plans, and HSA plans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="secondary"
            loading={exportingAll}
            onClick={() => downloadExport("all", setExportingAll)}
          >
            Export All Data (JSON)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Preferences Section ────────────────────────────────

function PreferencesSection({ settings }: { settings: Record<string, unknown> }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const dateFormat = (settings.dateFormat as string) ?? "MM/DD/YYYY";
  const currency = (settings.currency as string) ?? "$";
  const defaultPage = (settings.defaultPage as string) ?? "/dashboard";

  async function handleChange(key: string, value: string) {
    setSaving(key);
    setSaved(null);
    try {
      const result = await updateSetting(key, value);
      if (result.success) {
        setSaved(key);
        // Clear the saved indicator after 2 seconds
        setTimeout(() => setSaved(null), 2000);
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
          <CardDescription>
            Customize how dates and currency are displayed throughout the app.
            Changes are saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Date Format */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  label="Date Format"
                  options={DATE_FORMAT_OPTIONS}
                  defaultValue={dateFormat}
                  onChange={(e) => handleChange("dateFormat", e.target.value)}
                  disabled={saving === "dateFormat"}
                />
              </div>
              {saving === "dateFormat" && (
                <span className="mt-6 text-xs text-zinc-500">Saving...</span>
              )}
              {saved === "dateFormat" && (
                <Badge variant="success" className="mt-6">Saved</Badge>
              )}
            </div>

            {/* Currency */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  label="Currency Display"
                  options={CURRENCY_OPTIONS}
                  defaultValue={currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  disabled={saving === "currency"}
                />
              </div>
              {saving === "currency" && (
                <span className="mt-6 text-xs text-zinc-500">Saving...</span>
              )}
              {saved === "currency" && (
                <Badge variant="success" className="mt-6">Saved</Badge>
              )}
            </div>

            {/* Default Page */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  label="Default Page on Login"
                  options={DEFAULT_PAGE_OPTIONS}
                  defaultValue={defaultPage}
                  onChange={(e) => handleChange("defaultPage", e.target.value)}
                  disabled={saving === "defaultPage"}
                />
              </div>
              {saving === "defaultPage" && (
                <span className="mt-6 text-xs text-zinc-500">Saving...</span>
              )}
              {saved === "defaultPage" && (
                <Badge variant="success" className="mt-6">Saved</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Data Management Section ────────────────────────────

function DataManagementSection({ settings }: { settings: Record<string, unknown> }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ generated: number; months: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastRegenerated = settings.lastSnapshotRegeneration as string | undefined;

  function handleRegenerate() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await generateAllMissingSnapshots();
        setResult(res);
        // Store the timestamp
        await updateSetting("lastSnapshotRegeneration", new Date().toISOString());
      } catch {
        setError("Failed to regenerate snapshots. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Snapshots</CardTitle>
          <CardDescription>
            Regenerate monthly snapshots for all months that have transactions
            but are missing aggregated data. This recalculates income, expenses,
            category breakdowns, and account balances for each month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lastRegenerated && (
              <p className="text-sm text-zinc-400">
                Last regenerated:{" "}
                <span className="text-zinc-300">
                  {new Date(lastRegenerated).toLocaleString()}
                </span>
              </p>
            )}

            <div className="rounded-md border border-yellow-600/30 bg-yellow-600/10 px-4 py-3">
              <p className="text-sm text-yellow-400">
                This operation scans all transactions and rebuilds missing
                monthly snapshots. It&apos;s safe to run — existing snapshots
                are not affected. Only months without a snapshot will be
                generated.
              </p>
            </div>

            <Button
              variant="secondary"
              loading={isPending}
              onClick={handleRegenerate}
            >
              Regenerate All Missing Snapshots
            </Button>

            {result && (
              <div className="rounded-md border border-green-600/30 bg-green-600/10 px-4 py-3">
                <p className="text-sm text-green-400">
                  {result.generated === 0
                    ? "All snapshots are up to date. Nothing to regenerate."
                    : `Generated ${result.generated} snapshot${result.generated === 1 ? "" : "s"}: ${result.months.join(", ")}`}
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-600/30 bg-red-600/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── About Section ──────────────────────────────────────

function AboutSection() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>U Suck At Money</CardTitle>
          <CardDescription>
            Personal finance command center
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Version:</span>
              <Badge variant="default">0.1.0</Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Built with:</span>
              <span className="text-sm text-zinc-300">
                Next.js, Drizzle ORM, Tailwind CSS
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Source:</span>
              <a
                href="https://github.com/seantokuzo/u-suck-at-money"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
              >
                github.com/seantokuzo/u-suck-at-money
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
