import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TenantAdminLoginDto } from './dto/admin-login.dto';
import { ResolveTenantDto } from './dto/resolve-tenant.dto';
import { TenantDirectoryService } from './tenant-directory.service';

@Controller('tenant-directory')
export class TenantDirectoryController {
  constructor(private readonly tenantDirectory: TenantDirectoryService) {}

  @Get('resolve')
  async resolve(@Query() query: ResolveTenantDto) {
    return this.tenantDirectory.resolve(query);
  }

  @Get('employee-context')
  async employeeContext(@Query() query: ResolveTenantDto) {
    return this.tenantDirectory.employeeContext(query);
  }

  @Post('admin-login')
  async verifyAdminLogin(@Body() body: TenantAdminLoginDto) {
    return this.tenantDirectory.verifyAdminLogin(body);
  }
}
