/** Child avatars are illustration keys — never real photos (DECISIONS #13). */
export const AVATARS: Record<string, { emoji: string; label: string }> = {
  peacock: { emoji: "🦚", label: "Peacock" },
  flute: { emoji: "🪈", label: "Flute" },
  lotus: { emoji: "🪷", label: "Lotus" },
  butterfly: { emoji: "🦋", label: "Butterfly" },
  tiger: { emoji: "🐯", label: "Tiger" },
  elephant: { emoji: "🐘", label: "Elephant" },
  monkey: { emoji: "🐵", label: "Monkey" },
  cow: { emoji: "🐄", label: "Cow" },
  parrot: { emoji: "🦜", label: "Parrot" },
  deer: { emoji: "🦌", label: "Deer" },
  squirrel: { emoji: "🐿️", label: "Squirrel" },
  sun: { emoji: "🌞", label: "Sun" },
};

export const DEFAULT_AVATAR = "peacock";

export function avatarEmoji(key: string | null | undefined): string {
  return AVATARS[key ?? DEFAULT_AVATAR]?.emoji ?? AVATARS[DEFAULT_AVATAR].emoji;
}
