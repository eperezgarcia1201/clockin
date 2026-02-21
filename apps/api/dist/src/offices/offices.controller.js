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
exports.OfficesController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/auth.guard");
const create_office_dto_1 = require("./dto/create-office.dto");
const offices_service_1 = require("./offices.service");
let OfficesController = class OfficesController {
    offices;
    constructor(offices) {
        this.offices = offices;
    }
    async list(req) {
        if (!req.user)
            throw new common_1.UnauthorizedException();
        return { offices: await this.offices.list(req.user) };
    }
    async create(req, dto) {
        if (!req.user)
            throw new common_1.UnauthorizedException();
        return this.offices.create(req.user, dto);
    }
};
exports.OfficesController = OfficesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OfficesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_office_dto_1.CreateOfficeDto]),
    __metadata("design:returntype", Promise)
], OfficesController.prototype, "create", null);
exports.OfficesController = OfficesController = __decorate([
    (0, common_1.Controller)("offices"),
    (0, common_1.UseGuards)(auth_guard_1.AuthOrDevGuard),
    __metadata("design:paramtypes", [offices_service_1.OfficesService])
], OfficesController);
//# sourceMappingURL=offices.controller.js.map