export const MANAGER_FEATURE_KEYS = [
  'dashboard',
  'users',
  'locations',
  'manageMultiLocation',
  'groups',
  'statuses',
  'schedules',
  'reports',
  'tips',
  'salesCapture',
  'notifications',
  'settings',
  'timeEdits',
] as const;

export type ManagerFeatureKey = (typeof MANAGER_FEATURE_KEYS)[number];

const featureSet = new Set<string>(MANAGER_FEATURE_KEYS);

export const normalizeManagerFeatures = (
  input: unknown,
): ManagerFeatureKey[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  const ordered = new Set<ManagerFeatureKey>();
  for (const value of input) {
    if (typeof value !== 'string') {
      continue;
    }
    const normalized = value.trim();
    if (!normalized || !featureSet.has(normalized)) {
      continue;
    }
    ordered.add(normalized as ManagerFeatureKey);
  }

  return MANAGER_FEATURE_KEYS.filter((key) => ordered.has(key));
};

export const managerFeaturesToMap = (features: ManagerFeatureKey[]) => {
  return MANAGER_FEATURE_KEYS.reduce(
    (acc, key) => {
      acc[key] = features.includes(key);
      return acc;
    },
    {} as Record<ManagerFeatureKey, boolean>,
  );
};

export const allManagerFeatures = (): ManagerFeatureKey[] => [
  ...MANAGER_FEATURE_KEYS,
];
