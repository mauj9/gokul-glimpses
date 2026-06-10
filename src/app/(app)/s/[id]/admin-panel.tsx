"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import {
  updateSpaceSettings,
  regenerateInvite,
  addSpaceAdmin,
  removeSpaceAdmin,
} from "../actions";
import type { FormState } from "@/app/(app)/admin/actions";

type Space = {
  id: string;
  name: string;
  description: string;
  visibility: "listed" | "unlisted";
  moderation: "instant" | "approval";
  invite_code: string;
};

export function InviteLinkBox({
  code,
  appUrl,
  canRegenerate,
  spaceId,
}: {
  code: string;
  appUrl: string;
  canRegenerate: boolean;
  spaceId: string;
}) {
  const [copied, setCopied] = useState(false);
  const link = `${appUrl}/join/${code}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-chubby bg-cream px-3 py-2 text-xs">
          {link}
        </code>
        <Button
          variant="soft"
          type="button"
          className="!min-h-9 !px-3 text-sm"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      {canRegenerate && (
        <form
          action={regenerateInvite}
          onSubmit={(e) => {
            if (!confirm("Old invite links will stop working. Continue?")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="space_id" value={spaceId} />
          <Button variant="ghost" type="submit" className="!min-h-8 text-xs">
            ♻️ Regenerate link
          </Button>
        </form>
      )}
    </div>
  );
}

export function SpaceSettingsForm({ space }: { space: Space }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateSpaceSettings,
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="space_id" value={space.id} />
      <div>
        <Label htmlFor="s-name">Name</Label>
        <Input id="s-name" name="name" defaultValue={space.name} required />
      </div>
      <div>
        <Label htmlFor="s-desc">Description</Label>
        <Input
          id="s-desc"
          name="description"
          defaultValue={space.description}
          placeholder="A line about this space"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="s-vis">Visibility</Label>
          <select
            id="s-vis"
            name="visibility"
            defaultValue={space.visibility}
            className="w-full rounded-chubby border-2 border-mango bg-surface px-4 min-h-11 text-ink focus:border-marigold focus:outline-none"
          >
            <option value="listed">Listed</option>
            <option value="unlisted">Unlisted</option>
          </select>
        </div>
        <div>
          <Label htmlFor="s-mod">Posts</Label>
          <select
            id="s-mod"
            name="moderation"
            defaultValue={space.moderation}
            className="w-full rounded-chubby border-2 border-mango bg-surface px-4 min-h-11 text-ink focus:border-marigold focus:outline-none"
          >
            <option value="instant">Go live instantly</option>
            <option value="approval">Need approval</option>
          </select>
        </div>
      </div>
      {state?.error && (
        <p className="text-sm font-semibold text-danger">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

export function SpaceAdminsPanel({
  spaceId,
  admins,
}: {
  spaceId: string;
  admins: { user_id: string; email: string; display_name: string | null }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    addSpaceAdmin,
    null,
  );
  return (
    <div className="space-y-2">
      {admins.map((a) => (
        <div key={a.user_id} className="flex items-center justify-between">
          <span className="truncate text-sm">
            {a.display_name ?? a.email}{" "}
            <span className="text-ink-soft">({a.email})</span>
          </span>
          <form action={removeSpaceAdmin}>
            <input type="hidden" name="space_id" value={spaceId} />
            <input type="hidden" name="user_id" value={a.user_id} />
            <Button
              variant="ghost"
              type="submit"
              className="!min-h-8 !px-2 text-xs text-danger"
            >
              Remove
            </Button>
          </form>
        </div>
      ))}
      <form action={formAction} className="flex items-start gap-2">
        <input type="hidden" name="space_id" value={spaceId} />
        <div className="flex-1">
          <Input
            name="email"
            type="email"
            required
            placeholder="add-admin@gmail.com"
            aria-label="Email of new space admin"
          />
          {state?.error && (
            <p className="mt-1 text-sm font-semibold text-danger">
              {state.error}
            </p>
          )}
        </div>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          className="!min-h-11"
        >
          Add
        </Button>
      </form>
    </div>
  );
}
