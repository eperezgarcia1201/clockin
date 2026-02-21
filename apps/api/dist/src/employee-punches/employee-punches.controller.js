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
exports.EmployeePunchesController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/auth.guard");
const employee_punches_service_1 = require("./employee-punches.service");
const create_employee_punch_dto_1 = require("./dto/create-employee-punch.dto");
const manual_employee_punch_dto_1 = require("./dto/manual-employee-punch.dto");
const update_employee_punch_dto_1 = require("./dto/update-employee-punch.dto");
let EmployeePunchesController = class EmployeePunchesController {
    punches;
    constructor(punches) {
        this.punches = punches;
    }
    async create(req, employeeId, dto) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        return this.punches.createPunch(req.user, employeeId, dto);
    }
    async recent(req) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        return this.punches.getRecent(req.user);
    }
    async records(req, employeeId, limit, from, to, tzOffset) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        return this.punches.listRecords(req.user, {
            employeeId,
            limit: limit ? Number(limit) : undefined,
            from,
            to,
            tzOffset: tzOffset ? Number(tzOffset) : undefined,
        });
    }
    async createManual(req, dto) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        return this.punches.createManual(req.user, dto);
    }
    async updateRecord(req, id, dto) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        return this.punches.updateRecord(req.user, id, dto);
    }
    async deleteRecord(req, id) {
        if (!req.user) {
            throw new common_1.UnauthorizedException();
        }
        return this.punches.deleteRecord(req.user, id);
    }
};
exports.EmployeePunchesController = EmployeePunchesController;
__decorate([
    (0, common_1.Post)(":employeeId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("employeeId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_employee_punch_dto_1.CreateEmployeePunchDto]),
    __metadata("design:returntype", Promise)
], EmployeePunchesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)("recent"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeePunchesController.prototype, "recent", null);
__decorate([
    (0, common_1.Get)("records"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("employeeId")),
    __param(2, (0, common_1.Query)("limit")),
    __param(3, (0, common_1.Query)("from")),
    __param(4, (0, common_1.Query)("to")),
    __param(5, (0, common_1.Query)("tzOffset")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], EmployeePunchesController.prototype, "records", null);
__decorate([
    (0, common_1.Post)("records"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, manual_employee_punch_dto_1.ManualEmployeePunchDto]),
    __metadata("design:returntype", Promise)
], EmployeePunchesController.prototype, "createManual", null);
__decorate([
    (0, common_1.Patch)("records/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_employee_punch_dto_1.UpdateEmployeePunchDto]),
    __metadata("design:returntype", Promise)
], EmployeePunchesController.prototype, "updateRecord", null);
__decorate([
    (0, common_1.Delete)("records/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EmployeePunchesController.prototype, "deleteRecord", null);
exports.EmployeePunchesController = EmployeePunchesController = __decorate([
    (0, common_1.Controller)("employee-punches"),
    (0, common_1.UseGuards)(auth_guard_1.AuthOrDevGuard),
    __metadata("design:paramtypes", [employee_punches_service_1.EmployeePunchesService])
], EmployeePunchesController);
//# sourceMappingURL=employee-punches.controller.js.map