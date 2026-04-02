"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/accounts": "Accounts",
  "/transactions": "Transactions",
  "/budget": "Budget",
  "/income": "Income",
  "/expenses": "Expenses",
  "/events": "Events",
  "/wishlist": "Wishlist",
  "/goals": "Goals",
  "/retirement": "Retirement",
  "/investments": "Investments",
  "/import": "Import",
  "/analysis": "Analysis",
  "/settings": "Settings",
};

interface HeaderProps {
  userName?: string | null;
}

export function Header({ userName }: HeaderProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "U Suck At Money";

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex items-center gap-4">
        {userName && (
          <span className="text-sm text-zinc-400">{userName}</span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          )}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
