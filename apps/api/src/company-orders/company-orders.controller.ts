import {
  Body,
  Controller,
  BadRequestException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { CompanyOrdersService } from './company-orders.service';
import { CreateCompanyOrderDto } from './dto/create-company-order.dto';
import { UpdateCompanyOrderCatalogDto } from './dto/update-company-order-catalog.dto';

@Controller('company-orders')
@UseGuards(AuthOrDevGuard)
export class CompanyOrdersController {
  constructor(private readonly orders: CompanyOrdersService) {}

  @Get('catalog')
  async catalog(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.orders.getCatalog(req.user);
  }

  @Put('catalog')
  async updateCatalog(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateCompanyOrderCatalogDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.orders.updateCatalog(req.user, dto);
  }

  @Get()
  async list(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('officeId') officeId?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.orders.listOrders(req.user, {
      limit: limit ? Number(limit) : undefined,
      from,
      to,
      officeId: officeId?.trim() || undefined,
    });
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() dto: CreateCompanyOrderDto) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.orders.createOrder(req.user, dto);
  }

  @Get(':id/pdf')
  async exportPdf(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const pdf = await this.orders.exportOrderPdf(req.user, id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${pdf.filename}"`,
    );
    response.send(pdf.content);
  }

  @Get('export')
  async exportWeek(
    @Req() req: RequestWithUser,
    @Query('format') format: string | undefined,
    @Query('weekStart') weekStart: string | undefined,
    @Query('officeId') officeId: string | undefined,
    @Res() response: Response,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const normalizedFormat = (format || 'pdf').trim().toLowerCase();
    if (
      normalizedFormat !== 'pdf' &&
      normalizedFormat !== 'csv' &&
      normalizedFormat !== 'excel'
    ) {
      throw new BadRequestException('Invalid export format.');
    }

    const file = await this.orders.exportWeeklyOrders(req.user, {
      format: normalizedFormat as 'pdf' | 'csv' | 'excel',
      weekStart: weekStart?.trim() || undefined,
      officeId: officeId?.trim() || undefined,
    });

    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.send(file.content);
  }
}
