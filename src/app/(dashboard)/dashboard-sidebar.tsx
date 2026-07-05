"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UploadCloud,
  Activity,
  FileCheck2,
  Settings,
  Scale,
  Menu,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

const NAV_ITEMS = [
  { href: "/upload", label: "Upload & Verify", icon: UploadCloud },
  { href: "/runs", label: "Verification Runs", icon: Activity },
  { href: "/reports", label: "Reports", icon: FileCheck2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarContent({
  orgActive,
  showUserButton = true,
  onNavigate,
}: {
  orgActive: boolean;
  showUserButton?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary/20">
          <Scale className="size-5 text-sidebar-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-sidebar-foreground">
            {BRAND.company}
          </h2>
          <p className="text-[0.65rem] text-sidebar-foreground/50">
            {orgActive ? "Verify — Organization" : "Verify workspace"}
          </p>
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
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          {showUserButton ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-8",
                },
              }}
            />
          ) : (
            <div className="size-8 rounded-full bg-sidebar-accent" />
          )}
          <span className="text-xs text-sidebar-foreground/50">Account</span>
        </div>
      </div>
    </>
  );
}

export function DashboardSidebar({
  orgActive,
  showUserButton = true,
}: {
  orgActive: boolean;
  showUserButton?: boolean;
}) {
  // Desktop sidebar is always rendered; mobile uses the dialog drawer below.
  return (
    <>
      {/* Desktop: persistent rail, hidden below lg */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarContent orgActive={orgActive} showUserButton={showUserButton} />
      </aside>
    </>
  );
}

/**
 * Mobile top-bar hamburger. Renders only below lg (where the desktop rail is
 * hidden). Opens a left-side drawer containing the same sidebar content. This
 * is the single highest-impact responsive fix across the dashboard — previously
 * every dashboard page showed a 256px rail on a phone.
 */
export function MobileSidebarTrigger({
  orgActive,
  showUserButton = true,
}: {
  orgActive: boolean;
  showUserButton?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            className="lg:hidden"
          />
        }
      >
        <Menu />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="fixed top-0 left-0 h-full max-h-none w-[min(20rem,85vw)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none rounded-r-xl p-0 data-open:slide-in-from-left data-closed:slide-out-to-left sm:max-w-none"
      >
        <DialogTitle className="sr-only">{BRAND.company} navigation</DialogTitle>
        <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
          <SidebarContent
            orgActive={orgActive}
            showUserButton={showUserButton}
            onNavigate={() => setOpen(false)}
          />
        </div>
        <DialogClose aria-label="Close navigation" className="sr-only" />
      </DialogContent>
    </Dialog>
  );
}
