const ROLE_LEVEL: Record<string, number> = {
  OWNER: 40,
  ADMIN: 30,
  EDITOR: 20,
  VIEWER: 10,
};

function level(role: string | null | undefined): number {
  return ROLE_LEVEL[role ?? "VIEWER"] ?? 10;
}

/** EDITOR, ADMIN, or OWNER — can create/edit content */
export function canWrite(role: string | null | undefined): boolean {
  return level(role) >= 20;
}

/** ADMIN or OWNER — can manage workspace settings and team */
export function canAdmin(role: string | null | undefined): boolean {
  return level(role) >= 30;
}
