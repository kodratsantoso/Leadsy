export type NavPermissionRule = {
  any?: string[];
};

export const navPermissionMap: Record<string, NavPermissionRule | undefined> = {
  "/": { any: [] },
  "/dashboard": { any: [] },
  "/lead-generator/platforms": { any: ["leads.view", "leads.create"] },
  "/lead-generator": { any: ["leads.view", "leads.create"] },
  "/map": { any: ["maps.view"] },
  "/leads": { any: ["leads.view"] },
  "/qualification/reviews": { any: ["leads.view"] },
  "/products": { any: ["products.view"] },
  "/industries": { any: ["products.view", "products.edit"] },
  "/professional-services": { any: ["professional_services.view"] },
  "/finance": { any: ["leads.view", "integrations.manage"] },
  "/customer-success": { any: ["leads.view"] },
  "/whatsapp/local": { any: ["whatsapp.personal"] },
  "/whatsapp/qontak": { any: ["whatsapp.qontak"] },
  "/whatsapp": { any: ["whatsapp.manage", "whatsapp.personal", "whatsapp.qontak"] },
  "/audit-logs": { any: ["audit.view"] },
  "/settings/sessions": { any: ["audit.view", "users.manage", "integrations.manage"] },
  "/settings/industries": { any: ["products.view", "products.edit"] },
  "/settings/audit-logs": { any: ["audit.view"] },
  "/settings/icp-profiles": { any: ["leads.view", "leads.edit"] },
  "/settings/ai-credits": { any: [] },
  "/settings/ai-usage": { any: [] },
  "/settings/ai-defaults": { any: ["super_admin_only"] },
  "/settings/ai-testing-console": { any: ["super_admin_only"] },
  "/settings/ai-screening-monitor": { any: ["super_admin_only"] },
  "/settings/users": { any: ["users.manage"] },
  "/settings/incentives": { any: ["incentives.manage", "users.manage"] },
  "/incentives": { any: [] },
  "/settings/targets/kpi": { any: ["targets.view", "targets.edit", "targets.manage", "users.manage"] },
  "/settings/targets/revenue": { any: ["targets.view", "targets.edit", "targets.manage", "users.manage"] },
  "/settings/targets": { any: ["targets.view", "targets.edit", "targets.manage", "users.manage"] },
  "/settings/kpi-targets": { any: ["targets.view", "targets.edit", "targets.manage", "users.manage"] },
  "/settings/lead-sources": { any: ["taxonomy.manage", "leads.edit"] },
  "/settings/lead-channels": { any: ["taxonomy.manage", "leads.edit"] },
  "/settings/lead-stages": { any: ["taxonomy.manage", "leads.edit"] },
  "/settings/cadences": { any: ["leads.view", "leads.edit"] },
  "/settings/currency": { any: ["finance.manage", "integrations.manage"] },
  "/settings/o2c/tax-codes": { any: ["finance.manage", "integrations.manage"] },
  "/settings/o2c/withholding-tax-codes": { any: ["finance.manage", "integrations.manage"] },
  "/settings/o2c/item-settings": { any: ["finance.manage", "integrations.manage"] },
  "/settings/integrations": { any: ["integrations.manage"] },
  "/settings/integrations/mekari-sign": { any: ["integrations.manage"] },
  "/settings/webhooks": { any: ["integrations.manage"] },
  "/settings/api": { any: ["integrations.manage"] },
  "/settings/notifications": { any: ["integrations.manage"] },
  "/settings/email": { any: ["integrations.manage"] },
  "/settings/company": { any: ["company.manage", "integrations.manage", "users.manage"] },
  "/settings/document-numbering": { any: ["company.manage", "integrations.manage", "users.manage"] },
  "/settings/environment": { any: ["integrations.manage"] },
  // Every authenticated user can reach this page to change their own password;
  // the Session Timeout / Password Policy panel inside it is conditionally
  // rendered for integrations.manage holders only.
  "/settings/security": { any: [] },
  "/settings/system-playbook": { any: [] },
  "/settings/backup": { any: ["integrations.manage"] },
  "/settings": { any: ["users.manage", "ai.manage", "integrations.manage", "audit.view", "products.view", "products.edit", "leads.edit"] },
};

export function getUserPermissionNames(user: any): string[] {
  return (user?.role?.permissions || []).map((permission: any) => permission.name).filter(Boolean);
}

export function isSuperAdminUser(user: any): boolean {
  if (!user) return false;
  const roleName = typeof user.role === "string" ? user.role : user.role?.name;
  return roleName === "super_admin";
}

export function canAccessPath(path: string, user: any): boolean {
  if (!user) {
    return false;
  }
  // SaaS Platform Admin is strictly reserved for platform superadmins
  if (path.startsWith("/admin")) {
    return isSuperAdminUser(user);
  }
  if (isSuperAdminUser(user)) {
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

