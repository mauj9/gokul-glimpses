"use client";

import { useState } from "react";
import { Button, Card, Chip } from "@/components/ui";
import { avatarEmoji } from "@/lib/avatars";
import { deleteChild, setActiveChild } from "./actions";
import { ChildForm } from "./child-form";

type Child = {
  id: string;
  first_name: string;
  age: number;
  city: string;
  state: string;
  avatar: string;
};

export function ChildCard({
  child,
  isActive,
}: {
  child: Child;
  isActive: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Card>
        <ChildForm child={child} onDone={() => setEditing(false)} />
      </Card>
    );
  }

  return (
    <Card className="flex items-center gap-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-mango-soft text-3xl">
        {avatarEmoji(child.avatar)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold text-peacock-deep">
          {child.first_name}, {child.age}
        </p>
        <p className="truncate text-sm text-ink-soft">
          {[child.city, child.state].filter(Boolean).join(", ") || "—"}
        </p>
        {isActive && <Chip className="mt-1">⭐ Posting as</Chip>}
      </div>
      <div className="flex flex-col gap-1">
        {!isActive && (
          <form action={setActiveChild}>
            <input type="hidden" name="child_id" value={child.id} />
            <Button variant="soft" type="submit" className="!min-h-9 !px-3 text-sm">
              Make active
            </Button>
          </form>
        )}
        <Button
          variant="ghost"
          onClick={() => setEditing(true)}
          className="!min-h-9 !px-3 text-sm"
        >
          Edit
        </Button>
        <form
          action={deleteChild}
          onSubmit={(e) => {
            if (
              !confirm(
                `Remove ${child.first_name}'s profile? Their posts will also disappear.`,
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="child_id" value={child.id} />
          <Button variant="ghost" type="submit" className="!min-h-9 !px-3 text-sm text-danger">
            Remove
          </Button>
        </form>
      </div>
    </Card>
  );
}
