"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user } = useUser();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        {user && (
          <p className="text-sm text-muted-foreground">
            Welcome back, <span className="font-medium text-foreground">{user.firstName || user.emailAddresses[0]?.emailAddress}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
