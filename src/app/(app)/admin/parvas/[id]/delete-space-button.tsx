"use client";

import { Button } from "@/components/ui";
import { deleteSpace } from "../../actions";

export function DeleteSpaceButton({
  spaceId,
  name,
  childSpaces,
  posts,
  redirectTo,
  label,
}: {
  spaceId: string;
  name: string;
  childSpaces: number;
  posts: number;
  /** Where to go after deletion (e.g. when deleting the space you're viewing). */
  redirectTo?: string;
  /** Full button label; defaults to a compact 🗑️ icon. */
  label?: string;
}) {
  const parts: string[] = [];
  if (childSpaces > 0) {
    parts.push(`${childSpaces} space${childSpaces === 1 ? "" : "s"} under it`);
  }
  if (posts > 0) parts.push(`${posts} post${posts === 1 ? "" : "s"}`);
  const radius = parts.length ? ` This also deletes ${parts.join(" and ")}.` : "";
  const message = `Delete "${name}"?${radius}\n\nThis cannot be undone.`;

  return (
    <form
      action={deleteSpace}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="space_id" value={spaceId} />
      {redirectTo && (
        <input type="hidden" name="redirect_to" value={redirectTo} />
      )}
      {label ? (
        <Button
          variant="danger"
          type="submit"
          className="!min-h-9 text-sm"
          aria-label={`Delete ${name}`}
        >
          {label}
        </Button>
      ) : (
        <Button
          variant="ghost"
          type="submit"
          className="!min-h-8 !px-2 text-xs text-danger"
          aria-label={`Delete ${name}`}
        >
          🗑️
        </Button>
      )}
    </form>
  );
}
