import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/iqc/types";
import { signOut } from "./actions";

const LINKS: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/inspections", label: "Inspections" },
  { href: "/approvals", label: "Approvals", roles: ["qa"] },
  { href: "/ncrs", label: "NCRs" },
  { href: "/master/suppliers", label: "Suppliers" },
  { href: "/master/parts", label: "Parts" },
  { href: "/master/templates", label: "Templates", roles: ["qa"] },
  { href: "/master/sampling", label: "Sampling" },
  { href: "/admin/users", label: "Users", roles: ["admin"] },
  { href: "/admin/backup", label: "Backup", roles: ["admin", "qa"] },
];

export async function Nav() {
  const profile = await requireProfile();
  const links = LINKS.filter((l) => !l.roles || l.roles.includes(profile.role));
  return (
    <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-2">
      <span className="mr-3 font-semibold">KHIND IQC</span>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
          {l.label}
        </Link>
      ))}
      <span className="ml-auto text-sm text-zinc-500">
        {profile.fullName} · {ROLE_LABELS[profile.role]}
      </span>
      <form action={signOut}>
        <button className="min-h-11 px-3 text-sm underline">Sign out</button>
      </form>
    </nav>
  );
}
