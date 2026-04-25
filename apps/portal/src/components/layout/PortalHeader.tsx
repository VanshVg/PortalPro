"use client";

import { Button } from "@portalpro/ui";
import { LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";

interface PortalHeaderProps {
  portalName: string;
  tenantName: string;
  tenantSlug: string;
  portalSlug: string;
  logoUrl: string | null;
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
}

export function PortalHeader({ portalName, tenantName, tenantSlug, portalSlug, logoUrl, user }: PortalHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const base = `/${tenantSlug}/${portalSlug}`;

  const navLinks = [
    { label: "Overview", href: base },
    { label: "Invoices", href: `${base}/invoices` },
  ];

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo + Portal Name */}
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <Image src={logoUrl} alt={tenantName} width={120} height={30} className="h-8 w-auto object-contain" />
          ) : (
            <div
              className="flex h-8 items-center rounded-lg px-3 text-sm font-bold text-white"
              style={{ backgroundColor: "var(--portal-primary, #1B4D6E)" }}
            >
              {tenantName}
            </div>
          )}
          <div className="hidden h-5 w-px bg-neutral-200 sm:block" />
          <span className="hidden text-sm font-medium text-neutral-600 sm:block">{portalName}</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "transition-colors hover:text-neutral-900",
                pathname === link.href ? "text-neutral-900 font-semibold" : "text-neutral-600",
              ].join(" ")}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: "var(--portal-primary, #1B4D6E)" }}
              title={user.name}
            >
              {initials}
            </div>
            <span className="text-sm font-medium text-neutral-700">{user.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => startTransition(() => signOut({ callbackUrl: "/login" }))}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <LogOut className="h-4 w-4" />
          </Button>
          <button
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 sm:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-neutral-100 bg-white px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-2 text-sm font-medium text-neutral-600">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={[
                  "rounded-lg px-3 py-2 hover:bg-neutral-50",
                  pathname === link.href ? "bg-neutral-50 font-semibold text-neutral-900" : "",
                ].join(" ")}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
