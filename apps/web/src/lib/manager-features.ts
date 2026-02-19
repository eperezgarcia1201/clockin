export const managerFeatureOptions = [
  { key: "users", label: "Users" },
  { key: "locations", label: "Locations" },
  { key: "manageMultiLocation", label: "Manage Multi-Location" },
  { key: "groups", label: "Groups" },
  { key: "statuses", label: "Statuses" },
  { key: "schedules", label: "Schedules" },
  { key: "companyOrders", label: "Company Orders" },
  { key: "reports", label: "Reports" },
  { key: "tips", label: "Tips Reports" },
  { key: "salesCapture", label: "Daily Sales Input" },
  { key: "notifications", label: "Notifications" },
  { key: "settings", label: "System Settings" },
  { key: "timeEdits", label: "Time Edits" },
] as const;

export type ManagerFeatureKey = (typeof managerFeatureOptions)[number]["key"];
