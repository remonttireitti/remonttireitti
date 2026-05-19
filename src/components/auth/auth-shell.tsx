import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-stone-600">{subtitle}</p>}
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-stone-500">
          <Link href="/" className="text-sky-700 hover:underline">
            ← Etusivulle
          </Link>
        </p>
      </main>
    </div>
  );
}
