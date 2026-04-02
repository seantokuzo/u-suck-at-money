"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const primaryTabs = [
  { label: "Home", href: "/dashboard", icon: "\u2302" },
  { label: "Accounts", href: "/accounts", icon: "\uD83C\uDFE6" },
  { label: "Txns", href: "/transactions", icon: "\uD83D\uDCB3" },
  { label: "Budget", href: "/budget", icon: "\uD83D\uDCCA" },
];

const moreTabs = [
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

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMoreOpen(false)}
          />

          {/* Menu */}
          <div className="absolute bottom-16 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950 px-4 pb-2 pt-4">
            <div className="grid grid-cols-4 gap-2">
              {moreTabs.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md px-1 py-2 text-xs transition-colors",
                      isActive
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-zinc-950 lg:hidden">
        <div className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {primaryTabs.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors",
                  isActive ? "text-zinc-100" : "text-zinc-500"
                )}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors",
              moreOpen ? "text-zinc-100" : "text-zinc-500"
            )}
          >
            <span className="text-lg">{"\u2026"}</span>
            More
          </button>
        </div>
      </nav>
    </>
  );
}
