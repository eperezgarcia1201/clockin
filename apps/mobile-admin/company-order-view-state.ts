import { useEffect, useMemo } from "react";
import type { CompanyOrderDrafts } from "./company-order-draft-helpers";
import {
  buildCompanyOrderCartItems,
  countSelectedCompanyOrderDraftItems,
  countSuppliersWithDraftItems,
  filterCompanyOrderItemsBySearch,
  filterCompanyOrderItemsInCart,
  hasMoreCompanyOrderItemsToShow,
  selectCompanyOrderSupplier,
  selectVisibleCompanyOrderItems,
  sumCompanyOrderCartUnits,
} from "./company-order-view-helpers";
import type {
  CompanyOrderCatalogItem,
  CompanyOrderCatalogSupplier,
} from "./types";

export const useCompanyOrderViewState = (params: {
  companyOrderCatalog: CompanyOrderCatalogSupplier[];
  companyOrderSupplier: string;
  companyOrderSearch: string;
  companyOrderShowOnlyAdded: boolean;
  companyOrderDrafts: CompanyOrderDrafts;
  companyOrderVisibleCount: number;
  onResetVisibleCount: (count: number) => void;
}) => {
  const selectedCompanyOrderSupplier = useMemo(
    () =>
      selectCompanyOrderSupplier(
        params.companyOrderCatalog,
        params.companyOrderSupplier,
      ),
    [params.companyOrderCatalog, params.companyOrderSupplier],
  );

  const filteredCompanyOrderItems = useMemo(
    () =>
      filterCompanyOrderItemsBySearch(
        selectedCompanyOrderSupplier,
        params.companyOrderSearch,
      ),
    [params.companyOrderSearch, selectedCompanyOrderSupplier],
  );

  const companyOrderHasSearch = params.companyOrderSearch.trim().length > 0;

  const baseCompanyOrderItems = useMemo(() => {
    if (!selectedCompanyOrderSupplier) {
      return [] as CompanyOrderCatalogItem[];
    }
    if (!params.companyOrderShowOnlyAdded) {
      return filteredCompanyOrderItems;
    }
    return filterCompanyOrderItemsInCart(
      filteredCompanyOrderItems,
      selectedCompanyOrderSupplier.supplierName,
      params.companyOrderDrafts,
    );
  }, [
    params.companyOrderDrafts,
    params.companyOrderShowOnlyAdded,
    filteredCompanyOrderItems,
    selectedCompanyOrderSupplier,
  ]);

  const visibleCompanyOrderItems = useMemo(
    () =>
      selectVisibleCompanyOrderItems(
        baseCompanyOrderItems,
        companyOrderHasSearch,
        params.companyOrderShowOnlyAdded,
        params.companyOrderVisibleCount,
      ),
    [
      baseCompanyOrderItems,
      companyOrderHasSearch,
      params.companyOrderShowOnlyAdded,
      params.companyOrderVisibleCount,
    ],
  );

  const hasMoreCompanyOrderItems = useMemo(
    () =>
      hasMoreCompanyOrderItemsToShow(
        baseCompanyOrderItems,
        visibleCompanyOrderItems,
        companyOrderHasSearch,
        params.companyOrderShowOnlyAdded,
      ),
    [
      baseCompanyOrderItems,
      companyOrderHasSearch,
      params.companyOrderShowOnlyAdded,
      visibleCompanyOrderItems,
    ],
  );

  useEffect(() => {
    params.onResetVisibleCount(16);
  }, [
    companyOrderHasSearch,
    params.companyOrderShowOnlyAdded,
    params.companyOrderSupplier,
  ]);

  const selectedCompanySupplierDraft = useMemo(
    () => params.companyOrderDrafts[params.companyOrderSupplier] || {},
    [params.companyOrderDrafts, params.companyOrderSupplier],
  );

  const companyOrderCartItems = useMemo(
    () =>
      buildCompanyOrderCartItems(
        params.companyOrderCatalog,
        params.companyOrderDrafts,
      ),
    [params.companyOrderCatalog, params.companyOrderDrafts],
  );

  const selectedCompanyOrderCount = useMemo(
    () => countSelectedCompanyOrderDraftItems(params.companyOrderDrafts),
    [params.companyOrderDrafts],
  );

  const selectedCompanyOrderTotalUnits = useMemo(
    () => sumCompanyOrderCartUnits(companyOrderCartItems),
    [companyOrderCartItems],
  );

  const selectedCompanyOrderSupplierCount = useMemo(
    () => countSuppliersWithDraftItems(params.companyOrderDrafts),
    [params.companyOrderDrafts],
  );

  return {
    selectedCompanyOrderSupplier,
    companyOrderHasSearch,
    visibleCompanyOrderItems,
    hasMoreCompanyOrderItems,
    selectedCompanySupplierDraft,
    companyOrderCartItems,
    selectedCompanyOrderCount,
    selectedCompanyOrderTotalUnits,
    selectedCompanyOrderSupplierCount,
  };
};
