"use client";

import { Button } from "@portalpro/ui";
import { Bell, Menu, Search } from "lucide-react";

interface HeaderProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:px-8">
      {/* Left: Mobile menu + Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav className="hidden text-sm text-neutral-500 lg:block">
          <span className="font-medium text-neutral-800">Dashboard</span>
        </nav>
      </div>

      {/* Right: Search, Notifications, User Avatar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Search">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
        </Button>
        <div
          className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary"
          title={user.name}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
