import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { UserRow, type UserRowData } from "./user-row";

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users" />
      <Card title="How to add someone">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Supabase → Authentication → Users → <b>Add user</b> → Create new user (tick Auto Confirm) or <b>Invite</b>.</li>
          <li>They appear below as <b>Inspector</b>. Change the role here and press Save.</li>
          <li>To remove access, untick <b>Active</b>. Their past records keep their name.</li>
        </ol>
      </Card>
      <Suspense fallback={<p className="text-zinc-500">Loading users…</p>}>
        <Users />
      </Suspense>
    </>
  );
}

async function Users() {
  const me = await requireProfile("admin");
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, email, full_name, role, active").order("email");
  if (error) throw new Error(`Could not load users: ${error.message}`);
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      {((data ?? []) as UserRowData[]).map((u) => <UserRow key={u.id} user={u} isMe={u.id === me.id} />)}
    </div>
  );
}
