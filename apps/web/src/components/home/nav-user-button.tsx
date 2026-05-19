"use client";

import { UserButton } from "@clerk/nextjs";

export function NavUserButton() {
  return <UserButton afterSignOutUrl="/" />;
}
