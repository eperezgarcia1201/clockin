import type { Lang } from "../copy";
import type {
  CompanyOrderCatalogItem,
  CompanyOrderCatalogSupplier,
  CompanyOrderRow,
} from "../types";

export type CompanyOrderCartItem = {
  supplierName: string;
  key: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
};

export type CompanyOrdersCardProps = {
  isLight: boolean;
  companyOrderExportingFormat: "pdf" | "csv" | "excel" | null;
  onExportCompanyOrders: (format: "pdf" | "csv" | "excel") => void;
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
  companyOrderRows: CompanyOrderRow[];
  formatDisplayDate: (value: string) => string;
};
