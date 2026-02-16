import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import type { AuthUser } from './auth.types';

type JwtPayload = {
  sub: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    const domain = config.get<string>('AUTH0_DOMAIN');
    const audience = config.get<string>('AUTH0_AUDIENCE');
    const devBypass = config.get<string>('DEV_BYPASS_AUTH') === 'true';

    if ((!domain || !audience) && !devBypass) {
      throw new Error(
        'AUTH0_DOMAIN and AUTH0_AUDIENCE must be set (or enable DEV_BYPASS_AUTH).',
      );
    }

    const issuerDomain = domain || 'dev-auth0.local';
    const issuerAudience = audience || 'https://api.clockin.local';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: issuerAudience,
      issuer: `https://${issuerDomain}/`,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${issuerDomain}/.well-known/jwks.json`,
      }),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    const tenantIdClaim =
      this.config.get<string>('TENANT_ID_CLAIM') || 'org_id';
    const tenantNameClaim =
      this.config.get<string>('TENANT_NAME_CLAIM') || 'org_name';

    const tenantExternalId = payload[tenantIdClaim] as string | undefined;
    const tenantName = payload[tenantNameClaim] as string | undefined;

    return {
      authUserId: payload.sub,
      email: payload.email,
      name: payload.name,
      tenantExternalId,
      tenantName,
    };
  }
}
