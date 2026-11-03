import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="text-sm text-zinc-500">Enter your email and we will send you a link to set a new password.</p>
      </div>
      <ForgotForm />
      <Link href="/login" className="text-sm underline">
        Back to sign in
      </Link>
    </main>
  );
}
