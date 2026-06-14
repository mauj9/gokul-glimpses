"use client";

import { Button } from "@/components/ui";
import { deleteSpace } from "../../actions";

export function DeleteSpaceButton({
  spaceId,
  name,
  childSpaces,
  posts,
}: {
  spaceId: string;
  name: string;
  childSpaces: number;
  posts: number;
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
      <Button
        variant="ghost"
        type="submit"
        className="!min-h-8 !px-2 text-xs text-danger"
        aria-label={`Delete ${name}`}
      >
        🗑️
      </Button>
    </form>
  );
}
