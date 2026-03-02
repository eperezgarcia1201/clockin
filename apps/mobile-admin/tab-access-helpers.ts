import type { AccessPermissions, Screen } from "./types";

export const canAccessScreenTab = (
  tab: Screen,
  permissions: AccessPermissions,
  liquorInventoryEnabled: boolean,
): boolean => {
  if (tab === "dashboard") return permissions.dashboard;
  if (tab === "users") return permissions.users;
  if (tab === "offices")
    return permissions.locations || permissions.manageMultiLocation;
  if (tab === "groups") return permissions.groups;
  if (tab === "schedules") return permissions.schedules;
  if (tab === "companyOrders") return permissions.companyOrders;
  if (tab === "liquorControl")
    return permissions.reports && liquorInventoryEnabled;
  if (tab === "capture") return permissions.salesCapture;
  if (tab === "reports") return permissions.reports;
  if (tab === "alerts") return permissions.notifications;
  return true;
};

export const buildVisibleTabs = (
  tabOrder: Screen[],
  permissions: AccessPermissions,
  liquorInventoryEnabled: boolean,
): Screen[] =>
  tabOrder.filter((tab) =>
    canAccessScreenTab(tab, permissions, liquorInventoryEnabled),
  );
