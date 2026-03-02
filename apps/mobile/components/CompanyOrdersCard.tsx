import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { companyOrderItemKey } from "../app-helpers";
import { i18n } from "../i18n";
import type {
  CompanyOrderCatalogItem,
  CompanyOrderCatalogSupplier,
  CompanyOrderRow,
} from "../types";
import { CompanyOrderExportButtons } from "./CompanyOrderExportButtons";
import { CompanyOrdersCardRecentOrders } from "./CompanyOrdersCardRecentOrders";
import type { CompanyOrderCartItem } from "./CompanyOrdersCard.types";

type CompanyOrdersCardProps = {
  t: (typeof i18n)[keyof typeof i18n];
  companyOrderExportingFormat: "pdf" | "csv" | "excel" | null;
  onExport: (format: "pdf" | "csv" | "excel") => void;
  companyOrderCatalog: CompanyOrderCatalogSupplier[];
  companyOrderSupplier: string;
  companyOrderDrafts: Record<string, Record<string, string>>;
  onSupplierChange: (supplierName: string) => void;
  companyOrderSearch: string;
  onCompanyOrderSearchChange: (value: string) => void;
  onCompanyOrderSearchFocus: () => void;
  companyOrderShowOnlyAdded: boolean;
  onCompanyOrderShowOnlyAddedChange: (value: boolean) => void;
  selectedCompanyOrderSupplier: CompanyOrderCatalogSupplier | null;
  visibleCompanyOrderItems: CompanyOrderCatalogItem[];
  selectedCompanySupplierDraft: Record<string, string>;
  onAddCompanyOrderItem: (item: CompanyOrderCatalogItem) => void;
  hasMoreCompanyOrderItems: boolean;
  onShowMoreItems: () => void;
  selectedCompanyOrderCount: number;
  selectedCompanyOrderTotalUnits: number;
  companyOrderCartItems: CompanyOrderCartItem[];
  onStepCompanyOrderItem: (
    supplierName: string,
    key: string,
    delta: number,
  ) => void;
  onRemoveCompanyOrderItem: (supplierName: string, key: string) => void;
  companyOrderNotes: string;
  onCompanyOrderNotesChange: (value: string) => void;
  onCompanyOrderNotesFocus: () => void;
  companyOrderStatus: string | null;
  onSubmitCompanyOrder: () => void;
  companyOrderSaving: boolean;
  selectedCompanyOrderSupplierCount: number;
  companyOrderLoading: boolean;
  onRefreshCompanyOrders: () => void;
  companyOrderRows: CompanyOrderRow[];
};

export function CompanyOrdersCard({
  t,
  companyOrderExportingFormat,
  onExport,
  companyOrderCatalog,
  companyOrderSupplier,
  companyOrderDrafts,
  onSupplierChange,
  companyOrderSearch,
  onCompanyOrderSearchChange,
  onCompanyOrderSearchFocus,
  companyOrderShowOnlyAdded,
  onCompanyOrderShowOnlyAddedChange,
  selectedCompanyOrderSupplier,
  visibleCompanyOrderItems,
  selectedCompanySupplierDraft,
  onAddCompanyOrderItem,
  hasMoreCompanyOrderItems,
  onShowMoreItems,
  selectedCompanyOrderCount,
  selectedCompanyOrderTotalUnits,
  companyOrderCartItems,
  onStepCompanyOrderItem,
  onRemoveCompanyOrderItem,
  companyOrderNotes,
  onCompanyOrderNotesChange,
  onCompanyOrderNotesFocus,
  companyOrderStatus,
  onSubmitCompanyOrder,
  companyOrderSaving,
  selectedCompanyOrderSupplierCount,
  companyOrderLoading,
  onRefreshCompanyOrders,
  companyOrderRows,
}: CompanyOrdersCardProps) {
  return (
    <View style={styles.teamCard}>
      <Text style={styles.teamTitle}>{t.companyOrders}</Text>
      <Text style={styles.teamMeta}>{t.companyOrdersTabHint}</Text>

      <CompanyOrderExportButtons
        t={t}
        companyOrderExportingFormat={companyOrderExportingFormat}
        onExport={onExport}
      />

      <Text style={styles.label}>{t.orderSupplier}</Text>
      <View style={styles.teamRoleTabs}>
        {companyOrderCatalog.map((supplier) => {
          const isActive = supplier.supplierName === companyOrderSupplier;
          const supplierSelectedCount = Object.values(
            companyOrderDrafts[supplier.supplierName] || {},
          ).filter((value) => Number(value) > 0).length;
          return (
            <TouchableOpacity
              key={`company-supplier-${supplier.supplierName}`}
              style={isActive ? styles.teamRoleTabActive : styles.teamRoleTab}
              onPress={() => onSupplierChange(supplier.supplierName)}
            >
              <Text
                style={
                  isActive ? styles.teamRoleTabTextActive : styles.teamRoleTabText
                }
              >
                {supplier.supplierName}
                {supplierSelectedCount > 0 ? ` (${supplierSelectedCount})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={[styles.input, styles.companyOrderSearchInput]}
        placeholder={t.orderItemSearchPlaceholder}
        placeholderTextColor="rgba(31, 26, 22, 0.35)"
        value={companyOrderSearch}
        onChangeText={onCompanyOrderSearchChange}
        onFocus={onCompanyOrderSearchFocus}
        autoCorrect={false}
      />
      <View style={styles.teamRoleTabs}>
        <TouchableOpacity
          style={
            !companyOrderShowOnlyAdded ? styles.teamRoleTabActive : styles.teamRoleTab
          }
          onPress={() => onCompanyOrderShowOnlyAddedChange(false)}
        >
          <Text
            style={
              !companyOrderShowOnlyAdded
                ? styles.teamRoleTabTextActive
                : styles.teamRoleTabText
            }
          >
            {t.allItems}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={
            companyOrderShowOnlyAdded ? styles.teamRoleTabActive : styles.teamRoleTab
          }
          onPress={() => onCompanyOrderShowOnlyAddedChange(true)}
        >
          <Text
            style={
              companyOrderShowOnlyAdded
                ? styles.teamRoleTabTextActive
                : styles.teamRoleTabText
            }
          >
            {t.inCartOnly}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedCompanyOrderSupplier ? (
        <View style={styles.companyOrderItemsWrap}>
          {visibleCompanyOrderItems.length === 0 ? (
            <Text style={styles.teamEmptyText}>{t.noOrderItemsForSupplier}</Text>
          ) : (
            visibleCompanyOrderItems.map((item) => {
              const key = companyOrderItemKey(item.nameEs, item.nameEn);
              return (
                <View key={`company-item-${key}`} style={styles.companyOrderItemRow}>
                  <View style={styles.companyOrderItemMain}>
                    <Text style={styles.teamEmployeeName}>{item.nameEs}</Text>
                    <Text style={styles.teamEmployeeMeta}>{item.nameEn}</Text>
                  </View>
                  {Number(selectedCompanySupplierDraft[key] || "0") > 0 ? (
                    <Text style={styles.teamEmployeeMeta}>
                      {t.orderQuantity}: {selectedCompanySupplierDraft[key]}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.companyOrderAddButton}
                    onPress={() => onAddCompanyOrderItem(item)}
                  >
                    <Text style={styles.companyOrderAddButtonText}>{t.addItem}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          {hasMoreCompanyOrderItems ? (
            <TouchableOpacity style={styles.tenantSwitch} onPress={onShowMoreItems}>
              <Text style={styles.tenantSwitchText}>{t.showMoreItems}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <Text style={styles.teamEmptyText}>{t.orderSupplier}</Text>
      )}

      <View style={styles.companyOrderCartSection}>
        <View style={styles.teamHeaderRow}>
          <Text style={styles.teamTitle}>{t.orderSummary}</Text>
          <Text style={styles.teamMeta}>
            {selectedCompanyOrderCount} {t.itemsLabel} • {t.totalUnits}: {selectedCompanyOrderTotalUnits}
          </Text>
        </View>
        {companyOrderCartItems.length === 0 ? (
          <Text style={styles.teamEmptyText}>{t.noItemsInCart}</Text>
        ) : (
          companyOrderCartItems.map((item) => (
            <View
              key={`company-cart-${item.supplierName}-${item.key}`}
              style={styles.companyOrderCartRow}
            >
              <View style={styles.companyOrderItemMain}>
                <Text style={styles.teamEmployeeName}>{item.nameEs}</Text>
                <Text style={styles.teamEmployeeMeta}>
                  {item.nameEn} • {item.supplierName}
                </Text>
              </View>
              <View style={styles.companyOrderCartActions}>
                <TouchableOpacity
                  style={styles.companyOrderStepButton}
                  onPress={() =>
                    onStepCompanyOrderItem(item.supplierName, item.key, -1)
                  }
                >
                  <Text style={styles.companyOrderStepButtonText}>-</Text>
                </TouchableOpacity>
                <View style={styles.companyOrderQtyBadge}>
                  <Text style={styles.companyOrderQtyBadgeText}>
                    {Number(item.quantity.toFixed(2))}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.companyOrderStepButton}
                  onPress={() =>
                    onStepCompanyOrderItem(item.supplierName, item.key, 1)
                  }
                >
                  <Text style={styles.companyOrderStepButtonText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.companyOrderRemoveButton}
                  onPress={() => onRemoveCompanyOrderItem(item.supplierName, item.key)}
                >
                  <Text style={styles.companyOrderAddButtonText}>{t.removeItem}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.label}>{t.orderNotes}</Text>
      <TextInput
        style={[styles.input, styles.companyOrderNotesInput]}
        value={companyOrderNotes}
        onChangeText={onCompanyOrderNotesChange}
        placeholder={t.orderNotesPlaceholder}
        placeholderTextColor="rgba(31, 26, 22, 0.35)"
        onFocus={onCompanyOrderNotesFocus}
        multiline
      />

      {companyOrderStatus ? (
        <Text style={[styles.statusText, styles.teamStatusText]}>{companyOrderStatus}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.button, styles.primary]}
        onPress={onSubmitCompanyOrder}
        disabled={companyOrderSaving}
      >
        <Text style={styles.primaryText}>
          {companyOrderSaving
            ? t.submittingCompanyOrder
            : `${t.submitCompanyOrder} (${selectedCompanyOrderSupplierCount} suppliers / ${selectedCompanyOrderCount} items)`}
        </Text>
      </TouchableOpacity>

      <CompanyOrdersCardRecentOrders
        t={t}
        companyOrderRows={companyOrderRows}
        companyOrderLoading={companyOrderLoading}
        onRefreshCompanyOrders={onRefreshCompanyOrders}
      />
    </View>
  );
}
