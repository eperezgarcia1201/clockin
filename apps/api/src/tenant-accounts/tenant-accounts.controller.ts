import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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

  @Get(':id/deletion-report')
  async deletionReport(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.tenantAccounts.getTenantDeletionReport(req.user, id);
  }

  @Get(':id/deletion-export')
  async deletionExport(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('format') format: string | undefined,
    @Res() response: Response,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const normalizedFormat = (format || 'summary').trim().toLowerCase();
    if (
      normalizedFormat !== 'summary' &&
      normalizedFormat !== 'excel' &&
      normalizedFormat !== 'sql'
    ) {
      throw new BadRequestException('Invalid tenant export format.');
    }

    const file = await this.tenantAccounts.exportTenantData(
      req.user,
      id,
      normalizedFormat as 'summary' | 'excel' | 'sql',
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.send(file.content);
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
  async remove(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('force') force: string | undefined,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const shouldForce = ['1', 'true', 'yes'].includes(
      (force || '').trim().toLowerCase(),
    );
    return this.tenantAccounts.deleteTenantAccount(req.user, id, {
      force: shouldForce,
    });
  }
}
