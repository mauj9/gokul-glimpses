"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input } from "@/components/ui";
import { useToast } from "@/components/toast";
import { deleteAccount } from "./account-actions";

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (!open) {
    return (
      <Button
        variant="ghost"
        className="text-danger"
        onClick={() => setOpen(true)}
      >
        Delete my account
      </Button>
    );
  }

  return (
    <Card className="space-y-3 border-2 border-danger/30">
      <p className="font-display font-bold text-danger">Delete your account?</p>
      <p className="text-sm text-ink-soft">
        This permanently removes your family members, every glimpse you&apos;ve
        shared, and your reactions. Spaces you created stay for the community.
        This cannot be undone.
      </p>
      <p className="text-sm text-ink-soft">
        Type <strong>DELETE</strong> to confirm.
      </p>
      <Input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        aria-label="Type DELETE to confirm"
        autoComplete="off"
      />
      <div className="flex gap-2">
        <Button
          variant="danger"
          disabled={confirm !== "DELETE" || pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteAccount();
              if (res?.error) toast(res.error, "error");
            })
          }
        >
          {pending ? "Deleting…" : "Permanently delete"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setConfirm("");
          }}
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
}
