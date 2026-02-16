import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { RequestWithUser } from './auth.types';

@Injectable()
export class AuthOrDevGuard extends AuthGuard('jwt') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowDev = this.config.get<string>('DEV_BYPASS_AUTH') === 'true';
    if (allowDev) {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const userId = (request.headers['x-dev-user-id'] as string) || 'dev-user';
      const tenantId =
        (request.headers['x-dev-tenant-id'] as string) || 'dev-tenant';
      const email =
        (request.headers['x-dev-email'] as string) || 'dev@clockin.local';
      const name = (request.headers['x-dev-name'] as string) || 'Dev User';

      request.user = {
        authUserId: userId,
        tenantExternalId: tenantId,
        email,
        name,
      };
      return true;
    }

    return (await super.canActivate(context)) as boolean;
  }
}
