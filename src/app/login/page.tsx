import { LoginForm } from "@/components/auth/login-form";
import { needsBootstrap } from "@/lib/actions/users";

export default async function LoginPage() {
  const needsSetup = await needsBootstrap();

  return (
    <main className="flex min-h-screen items-center justify-center bg-shell-bg px-4">
      <LoginForm needsSetup={needsSetup} />
    </main>
  );
}
