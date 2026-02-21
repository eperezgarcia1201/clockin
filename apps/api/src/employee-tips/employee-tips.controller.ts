import {
  Body,
  Controller,
  Get,
  Param,
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

@Controller('employee-tips')
@UseGuards(AuthOrDevGuard)
export class EmployeeTipsController {
  constructor(private readonly tips: EmployeeTipsService) {}

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
