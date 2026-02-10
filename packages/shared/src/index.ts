export type Role = "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export type Membership = {
  id: string;
  tenantId: string;
  userId: string;
  role: Role;
  createdAt: string;
};

export type PunchType = "IN" | "OUT" | "BREAK" | "LUNCH";

export type Punch = {
  id: string;
  tenantId: string;
  userId: string;
  type: PunchType;
  occurredAt: string;
  notes?: string | null;
  ipAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  createdAt: string;
};

export type TimeEntry = {
  id: string;
  tenantId: string;
  userId: string;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  createdAt: string;
};
