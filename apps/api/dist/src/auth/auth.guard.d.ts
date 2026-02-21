import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
declare const AuthOrDevGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class AuthOrDevGuard extends AuthOrDevGuard_base {
    private readonly config;
    constructor(config: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export {};
