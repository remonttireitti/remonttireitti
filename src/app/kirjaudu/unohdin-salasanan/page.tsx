import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Unohditko salasanan?"
      subtitle="Lähetämme ohjeet salasanan vaihtoon sähköpostiisi"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
