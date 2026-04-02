"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "\u2302" },
  { label: "Accounts", href: "/accounts", icon: "\uD83C\uDFE6" },
  { label: "Transactions", href: "/transactions", icon: "\uD83D\uDCB3" },
  { label: "Budget", href: "/budget", icon: "\uD83D\uDCCA" },
  { label: "Income", href: "/income", icon: "\uD83D\uDCB0" },
  { label: "Expenses", href: "/expenses", icon: "\uD83D\uDCC9" },
  { label: "Events", href: "/events", icon: "\uD83D\uDCC5" },
  { label: "Wishlist", href: "/wishlist", icon: "\u2B50" },
  { label: "Goals", href: "/goals", icon: "\uD83C\uDFAF" },
  { label: "Retirement", href: "/retirement", icon: "\uD83C\uDFD6\uFE0F" },
  { label: "Investments", href: "/investments", icon: "\uD83D\uDCC8" },
  { label: "Import", href: "/import", icon: "\uD83D\uDCE5" },
  { label: "Analysis", href: "/analysis", icon: "\uD83D\uDD0D" },
  { label: "Settings", href: "/settings", icon: "\u2699\uFE0F" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
      {/* App name */}
      <div className="flex h-16 items-center border-b border-zinc-800 px-6">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          U Suck At Money
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                  )}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
