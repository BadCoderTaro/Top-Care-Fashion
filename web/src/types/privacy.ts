export type VisibilitySetting = "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";

export const VISIBILITY_OPTIONS: VisibilitySetting[] = [
  "PUBLIC",
  "FOLLOWERS_ONLY",
  "PRIVATE",
];

export function isVisibilitySetting(value: unknown): value is VisibilitySetting {
  return typeof value === "string" && VISIBILITY_OPTIONS.includes(value as VisibilitySetting);
}
