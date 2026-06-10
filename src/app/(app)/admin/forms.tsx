"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import {
  createParva,
  createSpace,
  grantGlobalAdmin,
  type FormState,
} from "./actions";

export function ParvaForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createParva,
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="parva-name">Name</Label>
        <Input
          id="parva-name"
          name="name"
          required
          placeholder="e.g. Summer Parva 2026"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="starts_on">Starts</Label>
          <Input id="starts_on" name="starts_on" type="date" />
        </div>
        <div>
          <Label htmlFor="ends_on">Ends</Label>
          <Input id="ends_on" name="ends_on" type="date" />
        </div>
      </div>
      {state?.error && (
        <p className="text-sm font-semibold text-danger">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create parva"}
      </Button>
    </form>
  );
}

export function SpaceForm({
  parvaId,
  parentOptions,
}: {
  parvaId: string;
  /** [] ⇒ only top-level (sambhag) creation is offered. */
  parentOptions: { id: string; name: string; level: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createSpace,
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="parva_id" value={parvaId} />
      <div>
        <Label htmlFor="space-name">Space name</Label>
        <Input
          id="space-name"
          name="name"
          required
          placeholder="e.g. Bay Area Vibhag"
        />
      </div>
      <div>
        <Label htmlFor="parent_space_id">Under</Label>
        <select
          id="parent_space_id"
          name="parent_space_id"
          className="w-full rounded-chubby border-2 border-mango bg-surface px-4 min-h-11 text-ink focus:border-marigold focus:outline-none"
          defaultValue=""
        >
          <option value="">— Top level (Sambhag) —</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.level})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="visibility">Visibility</Label>
          <select
            id="visibility"
            name="visibility"
            className="w-full rounded-chubby border-2 border-mango bg-surface px-4 min-h-11 text-ink focus:border-marigold focus:outline-none"
          >
            <option value="listed">Listed</option>
            <option value="unlisted">Unlisted</option>
          </select>
        </div>
        <div>
          <Label htmlFor="moderation">Posts</Label>
          <select
            id="moderation"
            name="moderation"
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
        {pending ? "Creating…" : "Create space"}
      </Button>
    </form>
  );
}

export function GrantAdminForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    grantGlobalAdmin,
    null,
  );
  return (
    <form action={formAction} className="flex items-start gap-2">
      <div className="flex-1">
        <Input
          name="email"
          type="email"
          required
          placeholder="their-gmail@gmail.com"
          aria-label="Email to grant admin"
        />
        {state?.error && (
          <p className="mt-1 text-sm font-semibold text-danger">{state.error}</p>
        )}
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        Grant
      </Button>
    </form>
  );
}
