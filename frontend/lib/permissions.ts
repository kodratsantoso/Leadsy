export type NavPermissionRule = {
  any?: string[];
};

export const navPermissionMap: Record<string, NavPermissionRule | undefined> = {
  "/": { any: ["leads.view", "products.view", "audit.view"] },
  "/map": { any: ["leads.view", "leads.create"] },
  "/leads": { any: ["leads.view"] },
  "/qualification/reviews": { any: ["leads.view"] },
  "/products": { any: ["products.view"] },
  "/industries": { any: ["products.view", "products.edit"] },
  "/whatsapp": { any: ["whatsapp.manage"] },
  "/audit-logs": { any: ["audit.view"] },
  "/settings/ai-defaults": { any: ["ai.manage"] },
  "/settings/users": { any: ["users.manage"] },
  "/settings/integrations": { any: ["integrations.manage"] },
  "/settings/webhooks": { any: ["integrations.manage"] },
  "/settings/notifications": { any: ["integrations.manage"] },
  "/settings/environment": { any: ["integrations.manage"] },
  "/settings/security": { any: ["integrations.manage"] },
  "/settings/backup": { any: ["integrations.manage"] },
  "/settings": { any: ["users.manage", "ai.manage", "integrations.manage", "audit.view"] },
};

export function getUserPermissionNames(user: any): string[] {
  return (user?.role?.permissions || []).map((permission: any) => permission.name).filter(Boolean);
}

export function canAccessPath(path: string, user: any): boolean {
  if (!user) return false;
  if (user?.role?.name === "super_admin") return true;

  const matched = Object.entries(navPermissionMap)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([href]) => (href === "/" ? path === "/" : path.startsWith(href)));

  if (!matched) return true;

  const rule = matched[1];
  if (!rule?.any?.length) return true;

  const names = new Set(getUserPermissionNames(user));
  return rule.any.some((permission) => names.has(permission));
}
