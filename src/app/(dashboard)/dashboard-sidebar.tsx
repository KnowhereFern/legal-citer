"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UploadCloud,
  Activity,
  FileCheck2,
  Settings,
  Scale,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href: "/upload", label: "Upload & Verify", icon: UploadCloud },
  { href: "/runs", label: "Verification Runs", icon: Activity },
  { href: "/reports", label: "Reports", icon: FileCheck2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar({ orgActive }: { orgActive: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary/20">
          <Scale className="size-5 text-sidebar-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Legal Citer
          </h2>
          {orgActive ? (
            <p className="text-[0.65rem] text-sidebar-foreground/50">
              Organization workspace
            </p>
          ) : (
            <p className="text-[0.65rem] text-sidebar-foreground/50">
              Personal workspace
            </p>
          )}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-8",
              },
            }}
          />
          <span className="text-xs text-sidebar-foreground/50">
            Account
          </span>
        </div>
      </div>
    </aside>
  );
}
