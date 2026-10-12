"use client";

import { useActionState } from "react";
import { buttonClass, inputClass } from "@/components/ui";
import { ROLE_LABELS, type Role } from "@/lib/iqc/types";
import { updateUser } from "./actions";
import type { FormState } from "../../master/actions";

export type UserRowData = { id: string; email: string; full_name: string; role: Role; active: boolean };

export function UserRow({ user, isMe }: { user: UserRowData; isMe: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateUser, {});
  return (
    <form action={action} className="grid items-center gap-2 border-t border-zinc-200 p-3 first:border-t-0 sm:grid-cols-[1fr_1fr_10rem_6rem_auto] dark:border-zinc-800">
      <input type="hidden" name="id" value={user.id} />
      <span className="truncate text-sm">{user.email}{isMe && " (you)"}</span>
      <input name="fullName" defaultValue={user.full_name} aria-label="Name" disabled={isMe} className={inputClass} />
      <select name="role" defaultValue={user.role} aria-label="Role" disabled={isMe} className={inputClass}>
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </select>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={user.active} disabled={isMe} className="h-5 w-5" /> Active
      </label>
      <div className="flex items-center gap-2">
        {!isMe && <button disabled={pending} className={buttonClass.secondary}>Save</button>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.ok && <span className="text-sm text-green-700">{state.ok}</span>}
      </div>
    </form>
  );
}
