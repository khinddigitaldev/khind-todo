import { LoginForm } from "./login-form";

// Signed-in visitors never see this page: proxy.ts sends them to "/".
export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold">KHIND Todo</h1>
        <p className="text-sm text-zinc-500">Sign in, or create an account to start.</p>
      </div>
      <LoginForm />
    </main>
  );
}
