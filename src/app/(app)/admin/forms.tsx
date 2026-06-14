"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { LEVEL_LABEL, LEVEL_ORDER, childLevelOf, type SpaceLevel } from "@/lib/tree";
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
  /** Parents a new space can nest under (National downward; never empty in
   *  practice since National is auto-created). */
  parentOptions: { id: string; name: string; level: SpaceLevel }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createSpace,
    null,
  );
  // Order National → Sambhag → Vibhag, then by name, and default to the first.
  const sortedParents = [...parentOptions].sort(
    (a, b) =>
      LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) ||
      a.name.localeCompare(b.name),
  );
  const [parentId, setParentId] = useState(sortedParents[0]?.id ?? "");

  // Mirror the server's level derivation so the admin sees what they'll create.
  const parent = sortedParents.find((p) => p.id === parentId);
  const resultingLevel: SpaceLevel | null = parent
    ? childLevelOf(parent.level)
    : null;

  if (sortedParents.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Setting up the National space — refresh in a moment to add spaces.
      </p>
    );
  }

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
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          {sortedParents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({LEVEL_LABEL[p.level]})
            </option>
          ))}
        </select>
        {resultingLevel ? (
          <p className="mt-1 text-sm text-ink-soft">
            This will be a{" "}
            <strong className="text-peacock-deep">
              {LEVEL_LABEL[resultingLevel]}
            </strong>
            .
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">
            A Shakha is the smallest space — it can&apos;t have children.
          </p>
        )}
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
      <Button type="submit" disabled={pending || !resultingLevel}>
        {pending
          ? "Creating…"
          : resultingLevel
            ? `Create ${LEVEL_LABEL[resultingLevel]}`
            : "Create space"}
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
