import { ExpensePaymentMethod, PunchType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
type HoursReportInput = {
    from: string;
    to: string;
    roundMinutes: number;
    tzOffset: number;
    employeeId?: string;
    officeId?: string;
    groupId?: string;
    includeDetails: boolean;
};
type DayHours = {
    date: string;
    minutes: number;
    hoursDecimal: number;
    hoursFormatted: string;
    firstIn?: string | null;
    lastOut?: string | null;
};
type DailySalesReportRow = {
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
type DailyExpenseRow = {
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
type ComparisonPeriod = 'week' | 'month' | 'year';
type ComparisonReportInput = {
    period: ComparisonPeriod;
    anchorDate?: string;
    from?: string;
    to?: string;
    tzOffset: number;
    weekStartsOn: number;
    trendWeeks: number;
    employeeId?: string;
    officeId?: string;
    groupId?: string;
};
type NamedRange = {
    from: string;
    to: string;
};
type ComparisonTotals = {
    laborMinutes: number;
    laborHours: number;
    estimatedWages: number;
    tips: number;
    sales: number;
    expenses: number;
    net: number;
};
type EmployeeComparisonSummary = {
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
};
export declare class ReportsService {
    private readonly prisma;
    private readonly tenancy;
    constructor(prisma: PrismaService, tenancy: TenancyService);
    private scopedOfficeFilter;
    getHoursReport(authUser: AuthUser, input: HoursReportInput): Promise<{
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
            days: DayHours[];
        }[];
    }>;
    getDailyReport(authUser: AuthUser, input: HoursReportInput): Promise<{
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
            days: DayHours[];
        }[];
    }>;
    getPayrollReport(authUser: AuthUser, input: HoursReportInput & {
        weekStartsOn: number;
        overtimeThreshold: number;
    }): Promise<{
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
    getAuditReport(authUser: AuthUser, input: {
        from: string;
        to: string;
        tzOffset: number;
        employeeId?: string;
        officeId?: string;
        groupId?: string;
        type?: PunchType;
        limit?: number;
    }): Promise<{
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
    getTipsReport(authUser: AuthUser, input: {
        from: string;
        to: string;
        employeeId?: string;
        officeId?: string;
        groupId?: string;
    }): Promise<{
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
    getSalesReport(authUser: AuthUser, input: {
        from: string;
        to: string;
    }): Promise<{
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
        reports: DailySalesReportRow[];
        expenseTotals: {
            totalExpenses: number;
            cashExpenses: number;
            debitCardExpenses: number;
            checkExpenses: number;
        };
        expenses: DailyExpenseRow[];
    }>;
    getComparisonReport(authUser: AuthUser, input: ComparisonReportInput): Promise<{
        generatedAt: string;
        period: {
            type: ComparisonPeriod;
            anchorDate: string;
            current: NamedRange;
            previous: NamedRange;
            isCustomRange: boolean;
        };
        totals: {
            current: ComparisonTotals;
            previous: ComparisonTotals;
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
            currentLeaders: EmployeeComparisonSummary[];
            previousLeaders: EmployeeComparisonSummary[];
            changes: EmployeeComparisonSummary[];
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
            range: NamedRange;
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
    private buildComparisonTotals;
    upsertDailySalesReport(authUser: AuthUser, input: {
        date: string;
        foodSales: number;
        liquorSales: number;
        cashPayments: number;
        bankDepositBatch?: string;
        checkPayments: number;
        creditCardPayments: number;
        otherPayments: number;
        notes?: string;
    }): Promise<{
        ok: boolean;
        report: DailySalesReportRow;
    }>;
    createDailyExpense(authUser: AuthUser, input: {
        date: string;
        companyName: string;
        paymentMethod: ExpensePaymentMethod;
        amount: number;
        invoiceNumber: string;
        checkNumber?: string;
        payToCompany?: string;
        notes?: string;
    }): Promise<{
        ok: boolean;
        expense: DailyExpenseRow;
    }>;
    uploadDailyExpenseReceipt(authUser: AuthUser, expenseId: string, input: {
        fileName: string;
        mimeType: string;
        size: number;
        buffer: Buffer;
    }): Promise<{
        ok: boolean;
        expense: DailyExpenseRow;
    }>;
    getDailyExpenseReceipt(authUser: AuthUser, expenseId: string): Promise<{
        mimeType: string;
        fileName: string;
        data: Uint8Array<ArrayBufferLike>;
    }>;
    private requireDailySalesReporting;
    private canOverrideDailySalesDateLock;
    private toDailySalesReportRow;
    private toDailyExpenseRow;
    private getPunchContext;
}
export {};
