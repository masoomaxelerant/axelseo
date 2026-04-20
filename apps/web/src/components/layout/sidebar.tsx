"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Users,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AxelerantLogo } from "@/components/brand/axelerant-logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/audits", label: "Audits", icon: Search },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r bg-brand-navy" role="navigation" aria-label="Main navigation">
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <Link href="/dashboard" aria-label="Go to dashboard">
          <AxelerantLogo className="text-xl" />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-orange text-white"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="text-[11px] text-gray-500">
          Axelerant Digital
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5">axelerant.com</p>
      </div>
    </aside>
  );
}
