import Link from "next/link";
import { Suspense } from "react";
import { Notice } from "@/components/ui";
import { LoginForm } from "./login-form";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold">KHIND IQC</h1>
        <p className="text-sm text-zinc-500">Incoming quality control · demo system with fictional data</p>
      </div>
      <Suspense>
        <Reason searchParams={searchParams} />
      </Suspense>
      <LoginForm />
      <Link href="/forgot-password" className="text-sm underline">
        Forgot password?
      </Link>
      <p className="text-xs text-zinc-500">No account? Ask your admin to invite you.</p>
    </main>
  );
}

async function Reason({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { reason } = await searchParams;
  if (reason === "deactivated") return <Notice tone="red">Your account has been deactivated. Contact your admin.</Notice>;
  if (reason === "link")
    return <Notice tone="amber">That link has expired, was already used, or was opened in a different browser. Please ask for a new one.</Notice>;
  return null;
}
