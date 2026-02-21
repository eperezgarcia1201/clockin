import type { Request } from 'express';

export type AuthUser = {
  authUserId: string;
  email?: string;
  name?: string;
  tenantExternalId?: string;
  tenantName?: string;
};

export type RequestWithUser = Request & {
  user?: AuthUser;
};
