import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpensePaymentMethod, PunchType } from '@prisma/client';
import type { Response } from 'express';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthOrDevGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('hours')
  async hoursReport(
    @Req() req: RequestWithUser,
    @Query() query: Record<string, string>,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const from = query.from;
    const to = query.to;
    if (!from || !to) {
      throw new BadRequestException('from and to are required (YYYY-MM-DD)');
    }

    const roundMinutes = Number(query.round ?? 0);
    const tzOffset = Number(query.tzOffset ?? 0);
    const round = [0, 5, 10, 15, 20, 30].includes(roundMinutes)
      ? roundMinutes
      : 0;

    return this.reports.getHoursReport(req.user, {
      from,
      to,
      roundMinutes: round,
      tzOffset,
      employeeId: query.employeeId || undefined,
      officeId: query.officeId || undefined,
      groupId: query.groupId || undefined,
      includeDetails: query.details === '1' || query.details === 'true',
    });
  }

  @Get('daily')
  async dailyReport(
    @Req() req: RequestWithUser,
    @Query() query: Record<string, string>,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const from = query.from;
    const to = query.to;
    if (!from || !to) {
      throw new BadRequestException('from and to are required (YYYY-MM-DD)');
    }

    const roundMinutes = Number(query.round ?? 0);
    const tzOffset = Number(query.tzOffset ?? 0);
    const round = [0, 5, 10, 15, 20, 30].includes(roundMinutes)
      ? roundMinutes
      : 0;

    return this.reports.getDailyReport(req.user, {
      from,
      to,
      roundMinutes: round,
      tzOffset,
      employeeId: query.employeeId || undefined,
      officeId: query.officeId || undefined,
      groupId: query.groupId || undefined,
      includeDetails: true,
    });
  }

  @Get('payroll')
  async payrollReport(
    @Req() req: RequestWithUser,
    @Query() query: Record<string, string>,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const from = query.from;
    const to = query.to;
    if (!from || !to) {
      throw new BadRequestException('from and to are required (YYYY-MM-DD)');
    }

    const roundMinutes = Number(query.round ?? 0);
    const tzOffset = Number(query.tzOffset ?? 0);
    const round = [0, 5, 10, 15, 20, 30].includes(roundMinutes)
      ? roundMinutes
      : 0;
    const weekStartsOn = [0, 1].includes(Number(query.weekStartsOn))
      ? Number(query.weekStartsOn)
      : 1;
    const overtimeThreshold = Number(query.overtimeThreshold ?? 40) || 40;

    return this.reports.getPayrollReport(req.user, {
      from,
      to,
      roundMinutes: round,
      tzOffset,
      employeeId: query.employeeId || undefined,
      officeId: query.officeId || undefined,
      groupId: query.groupId || undefined,
      includeDetails: false,
      weekStartsOn,
      overtimeThreshold,
    });
  }

  @Get('audit')
  async auditReport(
    @Req() req: RequestWithUser,
    @Query() query: Record<string, string>,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const from = query.from;
    const to = query.to;
    if (!from || !to) {
      throw new BadRequestException('from and to are required (YYYY-MM-DD)');
    }

    const tzOffset = Number(query.tzOffset ?? 0);
    const limit = Number(query.limit ?? 200);
    const type =
      query.type && Object.values(PunchType).includes(query.type as PunchType)
        ? (query.type as PunchType)
        : undefined;

    return this.reports.getAuditReport(req.user, {
      from,
      to,
      tzOffset,
      employeeId: query.employeeId || undefined,
      officeId: query.officeId || undefined,
      groupId: query.groupId || undefined,
      type,
      limit,
    });
  }

  @Get('tips')
  async tipsReport(
    @Req() req: RequestWithUser,
    @Query() query: Record<string, string>,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const from = query.from;
    const to = query.to;
    if (!from || !to) {
      throw new BadRequestException('from and to are required (YYYY-MM-DD)');
    }

    return this.reports.getTipsReport(req.user, {
      from,
      to,
      employeeId: query.employeeId || undefined,
      officeId: query.officeId || undefined,
      groupId: query.groupId || undefined,
    });
  }

  @Get('sales')
  async salesReport(
    @Req() req: RequestWithUser,
    @Query() query: Record<string, string>,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const from = query.from;
    const to = query.to;
    if (!from || !to) {
      throw new BadRequestException('from and to are required (YYYY-MM-DD)');
    }

    return this.reports.getSalesReport(req.user, {
      from,
      to,
    });
  }

  @Post('sales')
  async saveSalesReport(
    @Req() req: RequestWithUser,
    @Body() body: Record<string, unknown>,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const date = typeof body.date === 'string' ? body.date.trim() : '';
    if (!date) {
      throw new BadRequestException('date is required (YYYY-MM-DD)');
    }

    const parseAmount = (field: string) => {
      const raw = body[field];
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        throw new BadRequestException(
          `${field} must be a non-negative number.`,
        );
      }
      return Number(value.toFixed(2));
    };

    const notesValue = body.notes;
    const notes =
      typeof notesValue === 'string' && notesValue.trim()
        ? notesValue.trim().slice(0, 500)
        : undefined;
    const bankDepositBatchValue = body.bankDepositBatch;
    const bankDepositBatch =
      typeof bankDepositBatchValue === 'string' && bankDepositBatchValue.trim()
        ? bankDepositBatchValue.trim().slice(0, 80)
        : undefined;

    return this.reports.upsertDailySalesReport(req.user, {
      date,
      foodSales: parseAmount('foodSales'),
      liquorSales: parseAmount('liquorSales'),
      cashPayments: parseAmount('cashPayments'),
      bankDepositBatch,
      checkPayments: parseAmount('checkPayments'),
      creditCardPayments: parseAmount('creditCardPayments'),
      otherPayments: parseAmount('otherPayments'),
      notes,
    });
  }

  @Post('sales/expenses')
  async saveDailyExpense(
    @Req() req: RequestWithUser,
    @Body() body: Record<string, unknown>,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const date = typeof body.date === 'string' ? body.date.trim() : '';
    if (!date) {
      throw new BadRequestException('date is required (YYYY-MM-DD)');
    }

    const companyName =
      typeof body.companyName === 'string' ? body.companyName.trim() : '';
    if (!companyName) {
      throw new BadRequestException('companyName is required.');
    }

    const invoiceNumber =
      typeof body.invoiceNumber === 'string' ? body.invoiceNumber.trim() : '';
    if (!invoiceNumber) {
      throw new BadRequestException('invoiceNumber is required.');
    }

    const paymentRaw =
      typeof body.paymentMethod === 'string'
        ? body.paymentMethod.trim().toUpperCase()
        : '';
    if (
      !Object.values(ExpensePaymentMethod).includes(
        paymentRaw as ExpensePaymentMethod,
      )
    ) {
      throw new BadRequestException(
        'paymentMethod must be CHECK, DEBIT_CARD, or CASH.',
      );
    }
    const paymentMethod = paymentRaw as ExpensePaymentMethod;

    const amountRaw = body.amount;
    const amount =
      typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('amount must be a non-negative number.');
    }

    const checkNumber =
      typeof body.checkNumber === 'string'
        ? body.checkNumber.trim()
        : undefined;
    const payToCompany =
      typeof body.payToCompany === 'string'
        ? body.payToCompany.trim()
        : undefined;
    const notes =
      typeof body.notes === 'string' ? body.notes.trim() : undefined;

    return this.reports.createDailyExpense(req.user, {
      date,
      companyName,
      paymentMethod,
      amount: Number(amount.toFixed(2)),
      invoiceNumber,
      checkNumber,
      payToCompany,
      notes,
    });
  }

  @Post('sales/expenses/:expenseId/receipt')
  @UseInterceptors(FileInterceptor('file'))
  async uploadExpenseReceipt(
    @Req() req: RequestWithUser,
    @Param('expenseId') expenseId: string,
    @UploadedFile()
    file:
      | {
          buffer?: Buffer;
          mimetype?: string;
          originalname?: string;
          size?: number;
        }
      | undefined,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    if (!file?.buffer || !file.mimetype) {
      throw new BadRequestException('file is required.');
    }

    return this.reports.uploadDailyExpenseReceipt(req.user, expenseId, {
      fileName: file.originalname || 'receipt',
      mimeType: file.mimetype,
      size: file.size || file.buffer.length,
      buffer: file.buffer,
    });
  }

  @Get('sales/expenses/:expenseId/receipt')
  async getExpenseReceipt(
    @Req() req: RequestWithUser,
    @Param('expenseId') expenseId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const receipt = await this.reports.getDailyExpenseReceipt(
      req.user,
      expenseId,
    );
    response.setHeader('Content-Type', receipt.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${sanitizeFilenameForHeader(receipt.fileName)}"`,
    );
    response.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(receipt.data);
  }
}

function sanitizeFilenameForHeader(fileName: string) {
  return fileName.replace(/["\r\n]/g, '').trim() || 'receipt';
}
