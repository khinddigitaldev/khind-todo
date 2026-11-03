import { Card, PageHeader } from "@/components/ui";
import { PasswordForm } from "./password-form";

export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader title="Change password" />
      <div className="max-w-sm">
        <Card>
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
