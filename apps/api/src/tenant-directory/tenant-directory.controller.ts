import { Controller, Get, Query } from '@nestjs/common';
import { ResolveTenantDto } from './dto/resolve-tenant.dto';
import { TenantDirectoryService } from './tenant-directory.service';

@Controller('tenant-directory')
export class TenantDirectoryController {
  constructor(private readonly tenantDirectory: TenantDirectoryService) {}

  @Get('resolve')
  async resolve(@Query() query: ResolveTenantDto) {
    return this.tenantDirectory.resolve(query);
  }
}
