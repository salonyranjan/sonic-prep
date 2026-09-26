import Link from "next/link";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { getCurrentUser, signOut } from "@/lib/actions/auth.action";

export default async function Layout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav
        aria-label="Main navigation"
        className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-lg text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-primary-200"
          >
            <BrandLogo size={36} className="rounded-[10px]" />
            SonicPrep
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/interview"
              className="inline-flex min-h-11 items-center rounded text-sm text-foreground hover:text-violet-700 dark:hover:text-primary-200"
            >
              Practice
            </Link>
            <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:block">
              {user.name}
            </span>
            <ThemeToggle />
            <form
              action={async () => {
                "use server";
                await signOut();
                redirect("/sign-in");
              }}
            >
              <button
                type="submit"
                aria-label="Sign out"
                className="flex size-11 items-center justify-center rounded-xl border border-border text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-violet-500"
              >
                <LogOut size={18} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </nav>
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        {children}
      </div>
    </div>
  );
}
