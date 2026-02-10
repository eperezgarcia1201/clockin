"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthOrDevGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
let AuthOrDevGuard = class AuthOrDevGuard extends (0, passport_1.AuthGuard)("jwt") {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async canActivate(context) {
        const allowDev = this.config.get("DEV_BYPASS_AUTH") === "true";
        if (allowDev) {
            const request = context.switchToHttp().getRequest();
            const userId = request.headers["x-dev-user-id"] || "dev-user";
            const tenantId = request.headers["x-dev-tenant-id"] || "dev-tenant";
            const email = request.headers["x-dev-email"] || "dev@clockin.local";
            const name = request.headers["x-dev-name"] || "Dev User";
            request.user = {
                authUserId: userId,
                tenantExternalId: tenantId,
                email,
                name,
            };
            return true;
        }
        return (await super.canActivate(context));
    }
};
exports.AuthOrDevGuard = AuthOrDevGuard;
exports.AuthOrDevGuard = AuthOrDevGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AuthOrDevGuard);
//# sourceMappingURL=auth.guard.js.map