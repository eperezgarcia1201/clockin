import { StreamableFile } from '@nestjs/common';
import { ExpensePaymentMethod } from '@prisma/client';
import type { Response } from 'express';
import type { RequestWithUser } from '../auth/auth.types';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reports;
    constructor(reports: ReportsService);
    hoursReport(req: RequestWithUser, query: Record<string, string>): Promise<{
        range: {
            from: string;
            to: string;
        };
        roundMinutes: number;
        employees: {
            id: string;
            name: string;
            totalMinutes: number;
            totalHoursDecimal: number;
            totalHoursFormatted: string;
            days: {
                date: string;
                minutes: number;
                hoursDecimal: number;
                hoursFormatted: string;
                firstIn?: string | null;
                lastOut?: string | null;
            }[];
        }[];
    }>;
    dailyReport(req: RequestWithUser, query: Record<string, string>): Promise<{
        range: {
            from: string;
            to: string;
        };
        roundMinutes: number;
        employees: {
            id: string;
            name: string;
            totalMinutes: number;
            totalHoursDecimal: number;
            totalHoursFormatted: string;
            days: {
                date: string;
                minutes: number;
                hoursDecimal: number;
                hoursFormatted: string;
                firstIn?: string | null;
                lastOut?: string | null;
            }[];
        }[];
    }>;
    payrollReport(req: RequestWithUser, query: Record<string, string>): Promise<{
        range: {
            from: string;
            to: string;
        };
        roundMinutes: number;
        weekStartsOn: number;
        overtimeThreshold: number;
        employees: never[];
        overtimeMultiplier?: undefined;
    } | {
        range: {
            from: string;
            to: string;
        };
        roundMinutes: number;
        weekStartsOn: number;
        overtimeThreshold: number;
        overtimeMultiplier: number;
        employees: {
            id: string;
            name: string;
            hourlyRate: number;
            totalMinutes: number;
            totalHoursDecimal: number;
            totalHoursFormatted: string;
            totalPay: number;
            weeks: {
                weekStart: string;
                totalMinutes: number;
                totalHoursFormatted: string;
                totalHoursDecimal: number;
                regularMinutes: number;
                regularHoursFormatted: string;
                overtimeMinutes: number;
                overtimeHoursFormatted: string;
                regularPay: number;
                overtimePay: number;
                totalPay: number;
            }[];
        }[];
    }>;
    auditReport(req: RequestWithUser, query: Record<string, string>): Promise<{
        records: {
            id: string;
            employeeName: string;
            office: string | null;
            group: string | null;
            type: import("@prisma/client").$Enums.PunchType;
            occurredAt: string;
            notes: string;
        }[];
    }>;
    tipsReport(req: RequestWithUser, query: Record<string, string>): Promise<{
        range: {
            from: string;
            to: string;
        };
        employees: {
            id: string;
            name: string;
            totalCashTips: number;
            totalCreditCardTips: number;
            totalTips: number;
            days: {
                date: string;
                cashTips: number;
                creditCardTips: number;
                totalTips: number;
            }[];
        }[];
    }>;
    salesReport(req: RequestWithUser, query: Record<string, string>): Promise<{
        range: {
            from: string;
            to: string;
        };
        totals: {
            foodSales: number;
            liquorSales: number;
            totalSales: number;
            cashPayments: number;
            checkPayments: number;
            creditCardPayments: number;
            otherPayments: number;
            totalPayments: number;
            balance: number;
        };
        reports: {
            id: string;
            date: string;
            foodSales: number;
            liquorSales: number;
            totalSales: number;
            cashPayments: number;
            bankDepositBatch: string;
            checkPayments: number;
            creditCardPayments: number;
            otherPayments: number;
            totalPayments: number;
            balance: number;
            notes: string;
            submittedBy: string | null;
            submittedAt: string;
            createdAt: string;
            updatedAt: string;
        }[];
        expenseTotals: {
            totalExpenses: number;
            cashExpenses: number;
            debitCardExpenses: number;
            checkExpenses: number;
        };
        expenses: {
            id: string;
            date: string;
            companyName: string;
            paymentMethod: ExpensePaymentMethod;
            invoiceNumber: string;
            amount: number;
            checkNumber: string | null;
            payToCompany: string | null;
            hasReceipt: boolean;
            notes: string;
            submittedBy: string | null;
            submittedAt: string;
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    comparisonReport(req: RequestWithUser, query: Record<string, string>): Promise<{
        generatedAt: string;
        period: {
            type: "month" | "year" | "week";
            anchorDate: string;
            current: {
                from: string;
                to: string;
            };
            previous: {
                from: string;
                to: string;
            };
            isCustomRange: boolean;
        };
        totals: {
            current: {
                laborMinutes: number;
                laborHours: number;
                estimatedWages: number;
                tips: number;
                sales: number;
                expenses: number;
                net: number;
            };
            previous: {
                laborMinutes: number;
                laborHours: number;
                estimatedWages: number;
                tips: number;
                sales: number;
                expenses: number;
                net: number;
            };
            delta: {
                laborHours: {
                    delta: number;
                    percent: number | null;
                };
                estimatedWages: {
                    delta: number;
                    percent: number | null;
                };
                tips: {
                    delta: number;
                    percent: number | null;
                };
                sales: {
                    delta: number;
                    percent: number | null;
                };
                expenses: {
                    delta: number;
                    percent: number | null;
                };
                net: {
                    delta: number;
                    percent: number | null;
                };
            };
        };
        employees: {
            currentLeaders: {
                employeeId: string;
                name: string;
                currentMinutes: number;
                previousMinutes: number;
                currentHours: number;
                previousHours: number;
                currentWages: number;
                previousWages: number;
                currentTips: number;
                previousTips: number;
                deltaMinutes: number;
                deltaHours: number;
                deltaWages: number;
                deltaTips: number;
            }[];
            previousLeaders: {
                employeeId: string;
                name: string;
                currentMinutes: number;
                previousMinutes: number;
                currentHours: number;
                previousHours: number;
                currentWages: number;
                previousWages: number;
                currentTips: number;
                previousTips: number;
                deltaMinutes: number;
                deltaHours: number;
                deltaWages: number;
                deltaTips: number;
            }[];
            changes: {
                employeeId: string;
                name: string;
                currentMinutes: number;
                previousMinutes: number;
                currentHours: number;
                previousHours: number;
                currentWages: number;
                previousWages: number;
                currentTips: number;
                previousTips: number;
                deltaMinutes: number;
                deltaHours: number;
                deltaWages: number;
                deltaTips: number;
            }[];
        };
        employeeActivity: {
            daily: {
                date: string;
                laborHours: number;
                estimatedWages: number;
                punches: number;
                activeEmployees: number;
            }[];
            topByPunches: {
                employeeId: string;
                name: string;
                punches: number;
                inPunches: number;
                outPunches: number;
                breakPunches: number;
                lunchPunches: number;
                hours: number;
                wages: number;
                tips: number;
            }[];
        };
        payroll: {
            currentDaily: {
                date: string;
                laborHours: number;
                wages: number;
                tips: number;
                totalComp: number;
                employeeCount: number;
            }[];
            previousDaily: {
                date: string;
                laborHours: number;
                wages: number;
                tips: number;
                totalComp: number;
                employeeCount: number;
            }[];
            highestCurrentDate: {
                date: string;
                laborHours: number;
                wages: number;
                tips: number;
                totalComp: number;
                employeeCount: number;
            } | null;
            highestPreviousDate: {
                date: string;
                laborHours: number;
                wages: number;
                tips: number;
                totalComp: number;
                employeeCount: number;
            } | null;
        };
        salesComparison: {
            currentDaily: {
                date: string;
                foodSales: number;
                liquorSales: number;
                totalSales: number;
            }[];
            previousDaily: {
                date: string;
                foodSales: number;
                liquorSales: number;
                totalSales: number;
            }[];
            highestCurrentDate: {
                date: string;
                foodSales: number;
                liquorSales: number;
                totalSales: number;
            } | null;
            highestPreviousDate: {
                date: string;
                foodSales: number;
                liquorSales: number;
                totalSales: number;
            } | null;
        };
        expensesComparison: {
            currentDaily: {
                date: string;
                totalExpenses: number;
                expenseCount: number;
                cashExpenses: number;
                debitCardExpenses: number;
                checkExpenses: number;
            }[];
            previousDaily: {
                date: string;
                totalExpenses: number;
                expenseCount: number;
                cashExpenses: number;
                debitCardExpenses: number;
                checkExpenses: number;
            }[];
            highestCurrentDate: {
                date: string;
                totalExpenses: number;
                expenseCount: number;
                cashExpenses: number;
                debitCardExpenses: number;
                checkExpenses: number;
            } | null;
            highestPreviousDate: {
                date: string;
                totalExpenses: number;
                expenseCount: number;
                cashExpenses: number;
                debitCardExpenses: number;
                checkExpenses: number;
            } | null;
        };
        liquor: {
            enabled: boolean;
            summary: {
                currentQuantity: number;
                previousQuantity: number;
                deltaQuantity: number;
                currentCost: number;
                previousCost: number;
                deltaCost: number;
            };
            topConsumed: {
                itemId: string;
                itemName: string;
                company: string;
                kind: string;
                currentQuantity: number;
                previousQuantity: number;
                deltaQuantity: number;
                currentCost: number;
                previousCost: number;
                deltaCost: number;
            }[];
            byDate: {
                date: string;
                quantity: number;
                cost: number;
            }[];
        };
        trend: {
            weekStartsOn: number;
            weeks: number;
            range: {
                from: string;
                to: string;
            };
            weekly: {
                weekStart: string;
                weekEnd: string;
                laborMinutes: number;
                laborHours: number;
                wages: number;
                tips: number;
                sales: number;
                expenses: number;
                net: number;
                leader: {
                    employeeId: string;
                    name: string;
                    minutes: number;
                    hours: number;
                    wages: number;
                    tips: number;
                };
            }[];
        };
        highlights: string[];
        notes: string[];
    }>;
    saveSalesReport(req: RequestWithUser, body: Record<string, unknown>): Promise<{
        ok: boolean;
        report: {
            id: string;
            date: string;
            foodSales: number;
            liquorSales: number;
            totalSales: number;
            cashPayments: number;
            bankDepositBatch: string;
            checkPayments: number;
            creditCardPayments: number;
            otherPayments: number;
            totalPayments: number;
            balance: number;
            notes: string;
            submittedBy: string | null;
            submittedAt: string;
            createdAt: string;
            updatedAt: string;
        };
    }>;
    saveDailyExpense(req: RequestWithUser, body: Record<string, unknown>): Promise<{
        ok: boolean;
        expense: {
            id: string;
            date: string;
            companyName: string;
            paymentMethod: ExpensePaymentMethod;
            invoiceNumber: string;
            amount: number;
            checkNumber: string | null;
            payToCompany: string | null;
            hasReceipt: boolean;
            notes: string;
            submittedBy: string | null;
            submittedAt: string;
            createdAt: string;
            updatedAt: string;
        };
    }>;
    uploadExpenseReceipt(req: RequestWithUser, expenseId: string, file: {
        buffer?: Buffer;
        mimetype?: string;
        originalname?: string;
        size?: number;
    } | undefined): Promise<{
        ok: boolean;
        expense: {
            id: string;
            date: string;
            companyName: string;
            paymentMethod: ExpensePaymentMethod;
            invoiceNumber: string;
            amount: number;
            checkNumber: string | null;
            payToCompany: string | null;
            hasReceipt: boolean;
            notes: string;
            submittedBy: string | null;
            submittedAt: string;
            createdAt: string;
            updatedAt: string;
        };
    }>;
    getExpenseReceipt(req: RequestWithUser, expenseId: string, response: Response): Promise<StreamableFile>;
}
