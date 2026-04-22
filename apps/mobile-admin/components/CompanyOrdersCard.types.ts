import type { Lang } from "../copy";
import type {
  CompanyOrderCatalogItem,
  CompanyOrderCatalogSupplier,
  CompanyOrderComparisonUnit,
  CompanyOrderInPersonSupplier,
  CompanyOrderRow,
} from "../types";

export type CompanyOrderCartItem = {
  supplierName: string;
  key: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
  comparisonUnit: CompanyOrderComparisonUnit;
};

export type CompanyOrdersCardProps = {
  isLight: boolean;
  companyOrderMode?: "orders" | "inPerson" | null;
  onCompanyOrderModeChange?: (value: "orders" | "inPerson") => void;
  companyOrderExportAllCompanies: boolean;
  onCompanyOrderExportAllCompaniesChange: (value: boolean) => void;
  companyOrderExportingFormat: "pdf" | "csv" | "excel" | null;
  onExportCompanyOrders: (
    format: "pdf" | "csv" | "excel",
    options?: {
      supplierName?: string | null;
      weekStartDate?: string | null;
    },
  ) => void;
  inline: (value: string) => string;
  language: Lang;
  companyOrderCatalog: CompanyOrderCatalogSupplier[];
  companyOrderSupplier: string;
  companyOrderDrafts: Record<string, Record<string, string>>;
  onCompanyOrderSupplierChange: (supplierName: string) => void;
  companyOrderSearch: string;
  onCompanyOrderSearchChange: (value: string) => void;
  companyOrderShowOnlyAdded: boolean;
  onCompanyOrderShowOnlyAddedChange: (value: boolean) => void;
  selectedCompanyOrderSupplier: CompanyOrderCatalogSupplier | null;
  visibleCompanyOrderItems: CompanyOrderCatalogItem[];
  selectedCompanySupplierDraft: Record<string, string>;
  onAddCompanyOrderItem: (item: CompanyOrderCatalogItem) => void;
  hasMoreCompanyOrderItems: boolean;
  onShowMoreCompanyOrderItems: () => void;
  selectedCompanyOrderCount: number;
  selectedCompanyOrderTotalUnits: number;
  companyOrderCartItems: CompanyOrderCartItem[];
  onStepCompanyOrderItem: (
    supplierName: string,
    key: string,
    direction: 1 | -1,
  ) => void;
  onRemoveCompanyOrderItem: (supplierName: string, key: string) => void;
  companyOrderNotes: string;
  onCompanyOrderNotesChange: (value: string) => void;
  companyOrderSaving: boolean;
  onSubmitCompanyOrder: () => void;
  selectedCompanyOrderSupplierCount: number;
  onRefreshCompanyOrders: () => void;
  companyOrderLoading: boolean;
  companyOrderStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
  lastSubmittedCompanyOrderWeekStart: string;
  companyOrderRows: CompanyOrderRow[];
  formatDisplayDate: (value: string | null | undefined) => string;
  companyOrderInPersonWeekStartDate: string | null | undefined;
  companyOrderInPersonWeekEndDate: string | null | undefined;
  companyOrderInPersonSuppliers: CompanyOrderInPersonSupplier[];
  companyOrderInPersonSupplier: string;
  onCompanyOrderInPersonSupplierChange: (value: string) => void;
  companyOrderInPersonSearch: string;
  onCompanyOrderInPersonSearchChange: (value: string) => void;
  companyOrderInPersonSummaryLabel: string;
  companyOrderInPersonItems: Array<{
    supplierName: string;
    nameEs: string;
    nameEn: string;
    orderedQuantity: number;
    purchasedQuantity: number;
    remainingQuantity: number;
    comparisonUnit: CompanyOrderComparisonUnit;
    unitPrice: number | null;
    companyUnitPrice: number | null;
  }>;
  getCompanyOrderInPersonDraftValue: (
    supplierName: string,
    nameEs: string,
    nameEn: string,
  ) => {
    purchasedQuantity: string;
    unitPrice: string;
    companyUnitPrice: string;
  };
  getCompanyOrderInPersonMetaLine: (
    supplierName: string,
    item: {
      nameEs: string;
      nameEn: string;
      orderedQuantity: number;
      purchasedQuantity: number;
      remainingQuantity: number;
      comparisonUnit: CompanyOrderComparisonUnit;
      unitPrice: number | null;
      companyUnitPrice: number | null;
    },
  ) => string;
  onCompanyOrderInPersonPurchasedQuantityChange: (
    supplierName: string,
    nameEs: string,
    nameEn: string,
    value: string,
  ) => void;
  onCompanyOrderInPersonUnitPriceChange: (
    supplierName: string,
    nameEs: string,
    nameEn: string,
    value: string,
  ) => void;
  onCompanyOrderInPersonCompanyUnitPriceChange: (
    supplierName: string,
    nameEs: string,
    nameEn: string,
    value: string,
  ) => void;
  onSaveCompanyOrderInPerson: () => void;
  onLoadCompanyOrderInPerson: () => void;
  onPreviousCompanyOrderInPersonWeek: () => void;
  onNextCompanyOrderInPersonWeek: () => void;
  companyOrderInPersonLoading: boolean;
  companyOrderInPersonSaving: boolean;
  companyOrderInPersonStatus: string | null;
};
