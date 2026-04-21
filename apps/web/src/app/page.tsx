import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  const isLoggedIn = !!userId;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-navy">
      <div className="text-center">
        <h1 className="font-display text-5xl font-bold text-white">
          Axel<span className="text-brand-orange">SEO</span>
        </h1>
        <p className="mt-4 text-lg text-gray-300">
          Internal SEO audit tool for Axelerant Digital
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-block rounded-md bg-brand-orange px-8 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/sign-in"
                className="inline-block rounded-md bg-brand-orange px-8 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
              >
                Sign In
              </Link>
              <Link
                href="/auth/sign-up"
                className="inline-block rounded-md border border-white/20 px-8 py-3 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
