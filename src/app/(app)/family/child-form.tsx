"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { AVATARS, DEFAULT_AVATAR } from "@/lib/avatars";
import { createChild, updateChild, type ChildFormState } from "./actions";

type Child = {
  id: string;
  first_name: string;
  age: number;
  city: string;
  state: string;
  avatar: string;
};

export function ChildForm({
  child,
  onDone,
}: {
  child?: Child;
  onDone?: () => void;
}) {
  const action = child ? updateChild : createChild;
  const [state, formAction, pending] = useActionState<ChildFormState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (!result) onDone?.();
      return result;
    },
    null,
  );
  const [avatar, setAvatar] = useState(child?.avatar ?? DEFAULT_AVATAR);

  return (
    <form action={formAction} className="space-y-4">
      {child && <input type="hidden" name="child_id" value={child.id} />}
      <input type="hidden" name="avatar" value={avatar} />

      <div>
        <Label htmlFor="first_name">Name or nickname</Label>
        <Input
          id="first_name"
          name="first_name"
          defaultValue={child?.first_name}
          maxLength={40}
          required
          placeholder="e.g. Anu"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            name="age"
            type="number"
            min={1}
            max={120}
            defaultValue={child?.age}
            required
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={child?.city} />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={child?.state} />
        </div>
      </div>

      <div>
        <Label>Pick a friend</Label>
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(AVATARS).map(([key, { emoji, label }]) => (
            <button
              key={key}
              type="button"
              aria-label={label}
              aria-pressed={avatar === key}
              onClick={() => setAvatar(key)}
              className={`flex h-12 w-12 items-center justify-center rounded-chubby text-2xl transition-transform ${
                avatar === key
                  ? "bg-marigold-soft ring-2 ring-marigold scale-110"
                  : "bg-cream"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {state?.error && (
        <p className="rounded-chubby bg-mango-soft px-4 py-2 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Saving…" : child ? "Save changes" : "Add to family"}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
