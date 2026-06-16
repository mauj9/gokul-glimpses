import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getActiveChildId } from "@/lib/active-child";
import { Button, Card, PageTitle } from "@/components/ui";
import { ChildCard } from "./child-card";
import { ChildForm } from "./child-form";
import { DeleteAccountButton } from "./delete-account";

export const metadata: Metadata = { title: "My family" };

export default async function FamilyPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: children }, activeChildId] = await Promise.all([
    supabase
      .from("children")
      .select("id, first_name, age, city, state, avatar")
      .eq("parent_id", user.id)
      .order("created_at"),
    getActiveChildId(),
  ]);

  const kids = children ?? [];

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <PageTitle>My family</PageTitle>
        <form action="/auth/signout" method="post">
          <Button variant="ghost" type="submit" className="!min-h-9 text-sm">
            Sign out
          </Button>
        </form>
      </div>

      {kids.length === 0 ? (
        <Card className="text-center">
          <p className="mb-1 text-4xl">🌱</p>
          <p className="font-semibold text-ink">
            Add a family member to start sharing glimpses!
          </p>
          <p className="mb-4 text-sm text-ink-soft">
            Just a name or nickname and age — no photos needed for their
            profile.
          </p>
          <ChildForm />
        </Card>
      ) : (
        <>
          {kids.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              isActive={child.id === activeChildId}
            />
          ))}
          <Card>
            <p className="mb-3 font-display font-bold text-peacock-deep">
              Add another family member
            </p>
            <ChildForm />
          </Card>
        </>
      )}

      <div className="pt-6 text-center">
        <DeleteAccountButton />
      </div>
    </main>
  );
}
