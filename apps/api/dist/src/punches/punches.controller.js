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
exports.PunchesController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/auth.guard");
const create_punch_dto_1 = require("./dto/create-punch.dto");
const punches_service_1 = require("./punches.service");
let PunchesController = class PunchesController {
    punches;
    constructor(punches) {
        this.punches = punches;
    }
    async createPunch(dto, req) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        return this.punches.createPunch(req.user, dto, req.ip);
    }
    async getCurrent(req) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        return this.punches.getCurrentPunch(req.user);
    }
};
exports.PunchesController = PunchesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_punch_dto_1.CreatePunchDto, Object]),
    __metadata("design:returntype", Promise)
], PunchesController.prototype, "createPunch", null);
__decorate([
    (0, common_1.Get)("current"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PunchesController.prototype, "getCurrent", null);
exports.PunchesController = PunchesController = __decorate([
    (0, common_1.Controller)("punches"),
    (0, common_1.UseGuards)(auth_guard_1.AuthOrDevGuard),
    __metadata("design:paramtypes", [punches_service_1.PunchesService])
], PunchesController);
//# sourceMappingURL=punches.controller.js.map