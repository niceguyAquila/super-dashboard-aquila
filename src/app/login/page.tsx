import { LoginForm } from "@/components/auth/login-form";
import { needsBootstrap } from "@/lib/actions/users";

export default async function LoginPage() {
  const needsSetup = await needsBootstrap();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_oklch(0.96_0.025_195)_0%,_var(--shell-bg)_55%)] px-4">
      <LoginForm needsSetup={needsSetup} />
    </main>
  );
}
