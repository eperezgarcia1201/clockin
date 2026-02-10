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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusesController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/auth.guard");
const create_status_dto_1 = require("./dto/create-status.dto");
const statuses_service_1 = require("./statuses.service");
let StatusesController = class StatusesController {
    statuses;
    constructor(statuses) {
        this.statuses = statuses;
    }
    async list(req) {
        if (!req.user)
            throw new common_1.UnauthorizedException();
        return { statuses: await this.statuses.list(req.user) };
    }
    async create(req, dto) {
        if (!req.user)
            throw new common_1.UnauthorizedException();
        return this.statuses.create(req.user, dto);
    }
};
exports.StatusesController = StatusesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StatusesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_status_dto_1.CreateStatusDto]),
    __metadata("design:returntype", Promise)
], StatusesController.prototype, "create", null);
exports.StatusesController = StatusesController = __decorate([
    (0, common_1.Controller)("statuses"),
    (0, common_1.UseGuards)(auth_guard_1.AuthOrDevGuard),
    __metadata("design:paramtypes", [statuses_service_1.StatusesService])
], StatusesController);
//# sourceMappingURL=statuses.controller.js.map