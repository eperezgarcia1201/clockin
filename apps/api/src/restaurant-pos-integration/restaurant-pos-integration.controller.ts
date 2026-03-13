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
import { RestaurantPosIntegrationService } from './restaurant-pos-integration.service';
import {
  parseRestaurantPosCreatePayoutBody,
  parseRestaurantPosHoursQuery,
  parseRestaurantPosPayrollQuery,
  parseRestaurantPosPayoutsQuery,
  parseRestaurantPosScheduleUpdateBody,
  parseRestaurantPosTipsQuery,
  parseRestaurantPosTodaySchedulesQuery,
} from './restaurant-pos-integration.query';

@Controller('integrations/restaurant-pos')
@UseGuards(AuthOrDevGuard)
export class RestaurantPosIntegrationController {
  constructor(
    private readonly restaurantPos: RestaurantPosIntegrationService,
  ) {}

  private requireUser(request: RequestWithUser) {
    if (!request.user) {
      throw new UnauthorizedException();
    }
    return request.user;
  }

  @Get('connection')
  async connection(
    @Req() request: RequestWithUser,
    @Query('officeId') officeId?: string,
  ) {
    return this.restaurantPos.getConnection(this.requireUser(request), officeId);
  }

  @Get('workforce/hours')
  async hours(
    @Req() request: RequestWithUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.restaurantPos.getHoursReport(
      this.requireUser(request),
      parseRestaurantPosHoursQuery(query),
    );
  }

  @Get('workforce/payroll')
  async payroll(
    @Req() request: RequestWithUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.restaurantPos.getPayrollReport(
      this.requireUser(request),
      parseRestaurantPosPayrollQuery(query),
    );
  }

  @Get('workforce/tips')
  async tips(
    @Req() request: RequestWithUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.restaurantPos.getTipsReport(
      this.requireUser(request),
      parseRestaurantPosTipsQuery(query),
    );
  }

  @Get('workforce/schedules/today')
  async todaySchedules(
    @Req() request: RequestWithUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.restaurantPos.getTodaySchedules(
      this.requireUser(request),
      parseRestaurantPosTodaySchedulesQuery(query),
    );
  }

  @Get('workforce/schedules/:employeeId')
  async employeeSchedule(
    @Req() request: RequestWithUser,
    @Param('employeeId') employeeId: string,
  ) {
    return this.restaurantPos.getEmployeeSchedule(
      this.requireUser(request),
      employeeId,
    );
  }

  @Put('workforce/schedules/:employeeId')
  async updateEmployeeSchedule(
    @Req() request: RequestWithUser,
    @Param('employeeId') employeeId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.restaurantPos.updateEmployeeSchedule(
      this.requireUser(request),
      employeeId,
      parseRestaurantPosScheduleUpdateBody(body),
    );
  }

  @Get('payouts')
  async payouts(
    @Req() request: RequestWithUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.restaurantPos.getPayouts(
      this.requireUser(request),
      parseRestaurantPosPayoutsQuery(query),
    );
  }

  @Post('payouts')
  async createPayout(
    @Req() request: RequestWithUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.restaurantPos.createPayout(
      this.requireUser(request),
      parseRestaurantPosCreatePayoutBody(body),
    );
  }
}
