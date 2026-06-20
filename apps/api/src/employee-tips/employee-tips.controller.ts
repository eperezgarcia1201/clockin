import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { SubmitEmployeeTipDto } from './dto/submit-employee-tip.dto';
import { EmployeeTipsService } from './employee-tips.service';
import {
  CreateAdminEmployeeTipDto,
  UpdateAdminEmployeeTipDto,
} from './dto/admin-employee-tip.dto';

@Controller('employee-tips')
@UseGuards(AuthOrDevGuard)
export class EmployeeTipsController {
  constructor(private readonly tips: EmployeeTipsService) {}

  @Post('admin')
  async createAdminTip(
    @Req() req: RequestWithUser,
    @Body() dto: CreateAdminEmployeeTipDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.tips.createAdminTip(req.user, dto);
  }

  @Patch('admin/:tipId')
  async updateAdminTip(
    @Req() req: RequestWithUser,
    @Param('tipId') tipId: string,
    @Body() dto: UpdateAdminEmployeeTipDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.tips.updateAdminTip(req.user, tipId, dto);
  }

  @Delete('admin/:tipId')
  async deleteAdminTip(
    @Req() req: RequestWithUser,
    @Param('tipId') tipId: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.tips.deleteAdminTip(req.user, tipId);
  }

  @Post(':employeeId')
  async submit(
    @Req() req: RequestWithUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: SubmitEmployeeTipDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.tips.submitTip(req.user, employeeId, dto);
  }

  @Get(':employeeId')
  async list(
    @Req() req: RequestWithUser,
    @Param('employeeId') employeeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.tips.listTips(req.user, employeeId, { from, to });
  }
}
