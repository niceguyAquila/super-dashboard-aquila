import { LoginForm } from "@/components/auth/login-form";
import { needsBootstrap } from "@/lib/actions/users";

export default async function LoginPage() {
  const needsSetup = await needsBootstrap();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-100 via-background to-emerald-50/40 px-4">
      <LoginForm needsSetup={needsSetup} />
    </main>
  );
}
