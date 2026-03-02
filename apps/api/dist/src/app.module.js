"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const access_module_1 = require("./access/access.module");
const auth_module_1 = require("./auth/auth.module");
const employees_module_1 = require("./employees/employees.module");
const employee_punches_module_1 = require("./employee-punches/employee-punches.module");
const groups_module_1 = require("./groups/groups.module");
const offices_module_1 = require("./offices/offices.module");
const prisma_module_1 = require("./prisma/prisma.module");
const punches_module_1 = require("./punches/punches.module");
const reports_module_1 = require("./reports/reports.module");
const statuses_module_1 = require("./statuses/statuses.module");
const tenancy_module_1 = require("./tenancy/tenancy.module");
const settings_module_1 = require("./settings/settings.module");
const notifications_module_1 = require("./notifications/notifications.module");
const admin_devices_module_1 = require("./admin-devices/admin-devices.module");
const employee_schedules_module_1 = require("./employee-schedules/employee-schedules.module");
const tenant_accounts_module_1 = require("./tenant-accounts/tenant-accounts.module");
const tenant_directory_module_1 = require("./tenant-directory/tenant-directory.module");
const employee_tips_module_1 = require("./employee-tips/employee-tips.module");
const company_orders_module_1 = require("./company-orders/company-orders.module");
const liquor_inventory_module_1 = require("./liquor-inventory/liquor-inventory.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            access_module_1.AccessModule,
            auth_module_1.AuthModule,
            tenancy_module_1.TenancyModule,
            punches_module_1.PunchesModule,
            employees_module_1.EmployeesModule,
            employee_punches_module_1.EmployeePunchesModule,
            offices_module_1.OfficesModule,
            groups_module_1.GroupsModule,
            statuses_module_1.StatusesModule,
            reports_module_1.ReportsModule,
            settings_module_1.SettingsModule,
            notifications_module_1.NotificationsModule,
            admin_devices_module_1.AdminDevicesModule,
            employee_schedules_module_1.EmployeeSchedulesModule,
            tenant_accounts_module_1.TenantAccountsModule,
            tenant_directory_module_1.TenantDirectoryModule,
            employee_tips_module_1.EmployeeTipsModule,
            company_orders_module_1.CompanyOrdersModule,
            liquor_inventory_module_1.LiquorInventoryModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map