import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { deleteTodo, signOut, toggleTodo } from "./actions";
import { AddTodoForm } from "./add-todo-form";

type Todo = { id: number; title: string; is_done: boolean };

// The title shows instantly. Everything that needs the login cookie lives in
// <TodoSection>, which streams in behind <Suspense> (required by Next.js 16).
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">KHIND Todo</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading your todos…</p>}>
        <TodoSection />
      </Suspense>
    </main>
  );
}

async function TodoSection() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  // No "where user_id = …" needed: Row Level Security only returns this user's rows.
  const { data, error } = await supabase
    .from("todos")
    .select("id, title, is_done")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load todos: ${error.message}`);
  const todos: Todo[] = data ?? [];
  const remaining = todos.filter((todo) => !todo.is_done).length;

  return (
    <>
      <div className="flex items-center justify-between gap-4 text-sm text-zinc-500">
        <p>
          {user.email} · {remaining} left
        </p>
        <form action={signOut}>
          <button className="underline hover:text-zinc-900 dark:hover:text-zinc-100">Sign out</button>
        </form>
      </div>

      <AddTodoForm />

      {todos.length === 0 ? (
        <p className="py-8 text-center text-zinc-500">Nothing here yet. Add your first todo above.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </ul>
      )}
    </>
  );
}

function TodoItem({ todo }: { todo: Todo }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <form action={toggleTodo}>
        <input type="hidden" name="id" value={todo.id} />
        <input type="hidden" name="is_done" value={String(!todo.is_done)} />
        <button
          aria-label={todo.is_done ? `Mark "${todo.title}" as not done` : `Mark "${todo.title}" as done`}
          className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
            todo.is_done
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-400"
          }`}
        >
          {todo.is_done ? "✓" : ""}
        </button>
      </form>
      <span className={`flex-1 break-words ${todo.is_done ? "text-zinc-400 line-through" : ""}`}>
        {todo.title}
      </span>
      <form action={deleteTodo}>
        <input type="hidden" name="id" value={todo.id} />
        <button
          aria-label={`Delete "${todo.title}"`}
          className="rounded px-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          ✕
        </button>
      </form>
    </li>
  );
}
