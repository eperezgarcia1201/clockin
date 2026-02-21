import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { AnalyzeBottleScanDto } from './dto/analyze-bottle-scan.dto';
import { CreateLiquorItemDto } from './dto/create-liquor-item.dto';
import { CreateLiquorMovementDto } from './dto/create-liquor-movement.dto';
import { UpdateLiquorItemDto } from './dto/update-liquor-item.dto';
import { UpsertLiquorCountDto } from './dto/upsert-liquor-count.dto';
import { LiquorInventoryService } from './liquor-inventory.service';

@Controller('liquor-inventory')
@UseGuards(AuthOrDevGuard)
export class LiquorInventoryController {
  constructor(private readonly liquorInventory: LiquorInventoryService) {}

  @Get('catalog')
  async listCatalog(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.listCatalog(req.user, {
      search,
      includeInactive: includeInactive === '1' || includeInactive === 'true',
    });
  }

  @Post('catalog')
  async createCatalogItem(
    @Req() req: RequestWithUser,
    @Body() dto: CreateLiquorItemDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.createCatalogItem(req.user, dto);
  }

  @Put('catalog/:itemId')
  async updateCatalogItem(
    @Req() req: RequestWithUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateLiquorItemDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.updateCatalogItem(req.user, itemId, dto);
  }

  @Get('catalog/upc/:upc')
  async lookupByUpc(@Req() req: RequestWithUser, @Param('upc') upc: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.lookupByUpc(req.user, upc);
  }

  @Get('movements')
  async listMovements(
    @Req() req: RequestWithUser,
    @Query('officeId') officeId?: string,
    @Query('itemId') itemId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.listMovements(req.user, {
      officeId,
      itemId,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('movements')
  async createMovement(
    @Req() req: RequestWithUser,
    @Body() dto: CreateLiquorMovementDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.createMovement(req.user, dto);
  }

  @Get('counts')
  async listCounts(
    @Req() req: RequestWithUser,
    @Query('officeId') officeId?: string,
    @Query('itemId') itemId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.listCounts(req.user, {
      officeId,
      itemId,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('counts')
  async upsertCount(
    @Req() req: RequestWithUser,
    @Body() dto: UpsertLiquorCountDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.upsertCount(req.user, dto);
  }

  @Get('bottle-scans')
  async listBottleScans(
    @Req() req: RequestWithUser,
    @Query('officeId') officeId?: string,
    @Query('itemId') itemId?: string,
    @Query('containerKey') containerKey?: string,
    @Query('limit') limit?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.listBottleScans(req.user, {
      officeId,
      itemId,
      containerKey,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('bottle-scans/analyze')
  async analyzeBottleScan(
    @Req() req: RequestWithUser,
    @Body() dto: AnalyzeBottleScanDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.analyzeBottleScan(req.user, dto);
  }

  @Get('report/monthly')
  async monthlyReport(
    @Req() req: RequestWithUser,
    @Query('month') month?: string,
    @Query('officeId') officeId?: string,
    @Query('targetCostPct') targetCostPct?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.monthlyReport(req.user, {
      month,
      officeId,
      targetCostPct:
        targetCostPct !== undefined ? Number(targetCostPct) : undefined,
    });
  }

  @Get('control/yearly')
  async yearlyControl(
    @Req() req: RequestWithUser,
    @Query('year') year?: string,
    @Query('officeId') officeId?: string,
    @Query('targetCostPct') targetCostPct?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.liquorInventory.yearlyControlSheet(req.user, {
      year,
      officeId,
      targetCostPct:
        targetCostPct !== undefined ? Number(targetCostPct) : undefined,
    });
  }
}
