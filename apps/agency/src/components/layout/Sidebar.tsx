"use client";

import {
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@portalpro/ui";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  MessageSquare,
  Receipt,
  Settings,
  UsersRound,
  Webhook,
  ChevronLeft,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { logoutAction } from "@/lib/auth-actions";

const mainNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Messages", href: "/messages", icon: MessageSquare, badge: 3 },
  { label: "Invoices", href: "/invoices", icon: Receipt },
];

const settingsNavItems = [
  { label: "Workspace", href: "/settings?tab=general", icon: Settings },
  { label: "Team", href: "/settings?tab=team", icon: UsersRound },
  { label: "Integrations", href: "/settings?tab=integrations", icon: Webhook },
];

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string | null;
    image?: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [, startTransition] = useTransition();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel =
    user.role === "OWNER"
      ? "Agency Owner"
      : user.role === "ADMIN"
        ? "Admin"
        : user.role === "EDITOR"
          ? "Editor"
          : "Viewer";

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-neutral-200 bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
        {collapsed ? (
          <Link href="/" aria-label="PortalPro home">
            <Image src="/logo-icon.png" alt="PortalPro" width={32} height={32} priority />
          </Link>
        ) : (
          <Link href="/">
            <Image src="/logo-full.png" alt="PortalPro" width={130} height={32} priority />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        <p className={cn("mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400", collapsed && "sr-only")}>
          Main
        </p>
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent text-[10px] font-bold text-neutral-900">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}

        <div className="my-4 border-t border-neutral-100" />

        <p className={cn("mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400", collapsed && "sr-only")}>
          Settings
        </p>
        {settingsNavItems.map((item) => {
          // Match on the full href (pathname + query) for settings tabs
          const [itemPath, itemQuery] = item.href.split("?");
          const itemTab = new URLSearchParams(itemQuery ?? "").get("tab");
          const currentTab = searchParams.get("tab");
          const isActive = pathname === itemPath && (itemTab ? currentTab === itemTab : !currentTab || currentTab === "general");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-neutral-200 p-3">
        <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2", collapsed && "justify-center px-2")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-neutral-800">{user.name}</p>
              <p className="truncate text-xs text-neutral-500">{roleLabel}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Logout confirmation dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
                <AlertTriangle className="h-5 w-5 text-error" />
              </div>
              <DialogTitle className="text-lg">Sign out of PortalPro?</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-neutral-500 leading-relaxed">
              You&apos;re signed in as <span className="font-medium text-neutral-700">{user.email}</span>.
              You&apos;ll need to enter your password to get back in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowLogoutDialog(false)}>
              Stay signed in
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => startTransition(() => logoutAction())}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
