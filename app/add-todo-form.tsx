"use client";

import { useActionState } from "react";
import { MAX_TITLE_LENGTH } from "@/lib/validation";
import { addTodo, type AddTodoState } from "./actions";

export function AddTodoForm() {
  const [state, formAction, pending] = useActionState<AddTodoState, FormData>(addTodo, {});

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="title"
          placeholder="What do you need to do?"
          aria-label="New todo"
          required
          maxLength={MAX_TITLE_LENGTH}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
