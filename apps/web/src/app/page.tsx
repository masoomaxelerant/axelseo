import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-navy">
      <div className="text-center">
        <h1 className="font-display text-5xl font-bold text-white">
          Axel<span className="text-brand-orange">SEO</span>
        </h1>
        <p className="mt-4 text-lg text-gray-300">
          Internal SEO audit tool for Axelerant Digital
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-block rounded-lg bg-brand-orange px-8 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Open Dashboard
        </Link>
      </div>
    </main>
  );
}
