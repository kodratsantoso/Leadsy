export type NavPermissionRule = {
  any?: string[];
};

export const navPermissionMap: Record<string, NavPermissionRule | undefined> = {
  "/": { any: ["leads.view", "products.view", "audit.view"] },
  "/lead-generator/platforms": { any: ["leads.view", "leads.create"] },
  "/lead-generator": { any: ["leads.view", "leads.create"] },
  "/map": { any: ["maps.view"] },
  "/leads": { any: ["leads.view"] },
  "/qualification/reviews": { any: ["leads.view"] },
  "/products": { any: ["products.view"] },
  "/industries": { any: ["products.view", "products.edit"] },
  "/professional-services": { any: ["professional_services.view"] },
  "/customer-success": { any: ["leads.view"] },
  "/whatsapp/local": { any: ["whatsapp.personal"] },
  "/whatsapp/qontak": { any: ["whatsapp.qontak"] },
  "/whatsapp": { any: ["whatsapp.manage", "whatsapp.personal", "whatsapp.qontak"] },
  "/audit-logs": { any: ["audit.view"] },
  "/settings/industries": { any: ["products.view", "products.edit"] },
  "/settings/audit-logs": { any: ["audit.view"] },
  "/settings/icp-profiles": { any: ["leads.view", "leads.edit"] },
  "/settings/ai-defaults": { any: ["ai.manage"] },
  "/settings/ai-testing-console": { any: ["ai_testing.manage"] },
  "/settings/users": { any: ["users.manage"] },
  "/settings/targets": { any: ["users.manage"] },
  "/settings/lead-sources": { any: ["leads.edit"] },
  "/settings/lead-channels": { any: ["leads.edit"] },
  "/settings/lead-stages": { any: ["leads.edit"] },
  "/settings/currency": { any: ["integrations.manage"] },
  "/settings/o2c/tax-codes": { any: ["integrations.manage"] },
  "/settings/o2c/withholding-tax-codes": { any: ["integrations.manage"] },
  "/settings/o2c/item-settings": { any: ["integrations.manage"] },
  "/settings/integrations": { any: ["integrations.manage"] },
  "/settings/webhooks": { any: ["integrations.manage"] },
  "/settings/api": { any: ["integrations.manage"] },
  "/settings/notifications": { any: ["integrations.manage"] },
  "/settings/environment": { any: ["integrations.manage"] },
  // Every authenticated user can reach this page to change their own password;
  // the Session Timeout / Password Policy panel inside it is conditionally
  // rendered for integrations.manage holders only.
  "/settings/security": { any: [] },
  "/settings/backup": { any: ["integrations.manage"] },
  "/settings": { any: ["users.manage", "ai.manage", "integrations.manage", "audit.view", "products.view", "products.edit", "leads.edit"] },
};

export function getUserPermissionNames(user: any): string[] {
  return (user?.role?.permissions || []).map((permission: any) => permission.name).filter(Boolean);
}

export function canAccessPath(path: string, user: any): boolean {
  if (!user) {
    return false;
  }
  if (user?.role?.name === "super_admin") {
    return true;
  }

  const matched = Object.entries(navPermissionMap)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([href]) => (href === "/" ? path === "/" : path.startsWith(href)));

  if (!matched) {
    return true;
  }

  const rule = matched[1];
  if (!rule?.any?.length) {
    return true;
  }

  const names = new Set(getUserPermissionNames(user));
  return rule.any.some((permission) => names.has(permission));
}

