"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeePunchesModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const tenancy_module_1 = require("../tenancy/tenancy.module");
const employee_punches_controller_1 = require("./employee-punches.controller");
const employee_punches_service_1 = require("./employee-punches.service");
let EmployeePunchesModule = class EmployeePunchesModule {
};
exports.EmployeePunchesModule = EmployeePunchesModule;
exports.EmployeePunchesModule = EmployeePunchesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, tenancy_module_1.TenancyModule],
        controllers: [employee_punches_controller_1.EmployeePunchesController],
        providers: [employee_punches_service_1.EmployeePunchesService],
    })
], EmployeePunchesModule);
//# sourceMappingURL=employee-punches.module.js.map