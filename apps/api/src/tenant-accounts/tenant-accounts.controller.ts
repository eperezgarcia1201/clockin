import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { CreateTenantAccountDto } from './dto/create-tenant-account.dto';
import { UpdateTenantAccountDto } from './dto/update-tenant-account.dto';
import { TenantAccountsService } from './tenant-accounts.service';

@Controller('tenant-accounts')
@UseGuards(AuthOrDevGuard)
export class TenantAccountsController {
  constructor(private readonly tenantAccounts: TenantAccountsService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.tenantAccounts.listTenantAccounts(req.user);
  }

  @Get(':id')
  async getOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.tenantAccounts.getTenantAccount(req.user, id);
  }

  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateTenantAccountDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.tenantAccounts.createTenantAccount(req.user, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateTenantAccountDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.tenantAccounts.updateTenantAccount(req.user, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.tenantAccounts.deleteTenantAccount(req.user, id);
  }
}
