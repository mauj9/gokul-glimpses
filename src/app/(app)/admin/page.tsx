import type { Metadata } from "next";
import Link from "next/link";
import { requireGlobalAdmin } from "@/lib/auth/guards";
import { createServiceClient } from "@/lib/supabase/service";
import { envAdminEmails } from "@/lib/auth/admin";
import { Button, Card, Chip, PageTitle } from "@/components/ui";
import { ParvaForm, GrantAdminForm } from "./forms";
import { setParvaStatus, deleteParva, revokeGlobalAdmin } from "./actions";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireGlobalAdmin();
  const service = createServiceClient();

  const [{ data: parvas }, { data: grants }] = await Promise.all([
    service
      .from("parvas")
      .select("id, name, status, starts_on, ends_on, spaces(count)")
      .order("created_at", { ascending: false }),
    service.from("admin_grants").select("email, source").order("email"),
  ]);
  const envAdmins = envAdminEmails();

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle>🛡️ Admin console</PageTitle>
        <Link
          href="/admin/audit"
          className="text-sm font-semibold text-peacock underline-offset-2 hover:underline"
        >
          📋 Audit log
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-ink">Parvas</h2>
        {(parvas ?? []).map((parva) => (
          <Card key={parva.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/parvas/${parva.id}`}
                className="font-display font-bold text-peacock-deep underline-offset-2 hover:underline"
              >
                {parva.name}
              </Link>
              <p className="text-sm text-ink-soft">
                {parva.starts_on ?? "…"} → {parva.ends_on ?? "…"} ·{" "}
                {parva.spaces?.[0]?.count ?? 0} spaces
              </p>
            </div>
            <Chip
              className={
                parva.status === "active" ? "" : "!bg-mango-soft text-ink-soft"
              }
            >
              {parva.status === "active" ? "🟢 Active" : "🔒 Closed"}
            </Chip>
            <div className="flex flex-col gap-1">
              <form action={setParvaStatus}>
                <input type="hidden" name="parva_id" value={parva.id} />
                <input
                  type="hidden"
                  name="status"
                  value={parva.status === "active" ? "closed" : "active"}
                />
                <Button variant="soft" type="submit" className="!min-h-9 !px-3 text-sm">
                  {parva.status === "active" ? "Close" : "Reopen"}
                </Button>
              </form>
              <form action={deleteParva}>
                <input type="hidden" name="parva_id" value={parva.id} />
                <Button
                  variant="ghost"
                  type="submit"
                  className="!min-h-9 !px-3 text-sm text-danger"
                >
                  Delete
                </Button>
              </form>
            </div>
          </Card>
        ))}
        <Card>
          <p className="mb-3 font-display font-bold text-peacock-deep">
            New parva
          </p>
          <ParvaForm />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-ink">
          Global admins
        </h2>
        <Card className="space-y-2">
          {envAdmins.map((email) => (
            <div key={email} className="flex items-center justify-between">
              <span className="text-sm">{email}</span>
              <Chip>env</Chip>
            </div>
          ))}
          {(grants ?? [])
            .filter((g) => !envAdmins.includes(g.email))
            .map((g) => (
              <div key={g.email} className="flex items-center justify-between">
                <span className="text-sm">{g.email}</span>
                <form action={revokeGlobalAdmin}>
                  <input type="hidden" name="email" value={g.email} />
                  <Button
                    variant="ghost"
                    type="submit"
                    className="!min-h-8 !px-2 text-xs text-danger"
                  >
                    Revoke
                  </Button>
                </form>
              </div>
            ))}
          <GrantAdminForm />
        </Card>
      </section>
    </main>
  );
}
