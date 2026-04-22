import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import { companyOrderItemKey } from "../app-helpers";
import type {
  CompanyOrderCatalogItem,
  CompanyOrderCatalogSupplier,
} from "../types";

type CompanyOrdersCatalogSectionProps = {
  isLight: boolean;
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
};

export function CompanyOrdersCatalogSection({
  isLight,
  companyOrderCatalog,
  companyOrderSupplier,
  companyOrderDrafts,
  onCompanyOrderSupplierChange,
  companyOrderSearch,
  onCompanyOrderSearchChange,
  companyOrderShowOnlyAdded,
  onCompanyOrderShowOnlyAddedChange,
  selectedCompanyOrderSupplier,
  visibleCompanyOrderItems,
  selectedCompanySupplierDraft,
  onAddCompanyOrderItem,
  hasMoreCompanyOrderItems,
  onShowMoreCompanyOrderItems,
}: CompanyOrdersCatalogSectionProps) {
  return (
    <>
      <Text style={[styles.label, isLight && styles.labelLight]}>Supplier</Text>
      <View style={styles.toggleRow}>
        {companyOrderCatalog.map((supplier) => {
          const isActive = supplier.supplierName === companyOrderSupplier;
          const supplierSelectedCount = Object.values(
            companyOrderDrafts[supplier.supplierName] || {},
          ).filter((value) => Number(value) > 0).length;
          return (
            <TouchableOpacity
              key={`company-supplier-${supplier.supplierName}`}
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                isActive && styles.toggleActive,
                isActive && isLight && styles.toggleActiveLight,
              ]}
              onPress={() => onCompanyOrderSupplierChange(supplier.supplierName)}
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  isActive && isLight && styles.toggleTextLightActive,
                ]}
              >
                {supplier.supplierName}
                {supplierSelectedCount > 0 ? ` (${supplierSelectedCount})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>Search Item</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={companyOrderSearch}
        onChangeText={onCompanyOrderSearchChange}
        placeholder="Search Spanish or English name"
      />
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            !companyOrderShowOnlyAdded && styles.toggleActive,
            !companyOrderShowOnlyAdded && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => onCompanyOrderShowOnlyAddedChange(false)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              !companyOrderShowOnlyAdded && isLight && styles.toggleTextLightActive,
            ]}
          >
            All Items
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            companyOrderShowOnlyAdded && styles.toggleActive,
            companyOrderShowOnlyAdded && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => onCompanyOrderShowOnlyAddedChange(true)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              companyOrderShowOnlyAdded && isLight && styles.toggleTextLightActive,
            ]}
          >
            In Cart
          </Text>
        </TouchableOpacity>
      </View>
      {selectedCompanyOrderSupplier ? (
        <View style={styles.companyOrderItemsWrap}>
          {visibleCompanyOrderItems.length === 0 ? (
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>No matching catalog items.</Text>
          ) : (
            visibleCompanyOrderItems.map((item) => {
              const key = companyOrderItemKey(item.nameEs, item.nameEn);
              return (
                <View key={`company-item-${key}`} style={styles.listRow}>
                  <View style={styles.reportRowMain}>
                    <Text style={[styles.listName, isLight && styles.listNameLight]}>{item.nameEs}</Text>
                    <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>{item.nameEn}</Text>
                    {item.comparisonUnit === "lb" ? (
                    <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                        Order by case
                      </Text>
                    ) : null}
                    {item.comparisonUnit === "lb" && item.caseSizeLb ? (
                      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                        {Number(item.caseSizeLb.toFixed(2))} lb per case
                      </Text>
                    ) : null}
                  </View>
                  {Number(selectedCompanySupplierDraft[key] || "0") > 0 ? (
                    <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                      Qty {selectedCompanySupplierDraft[key]}
                      {item.comparisonUnit === "lb"
                        ? ` ${
                            Math.abs(
                              Number(selectedCompanySupplierDraft[key] || "0") - 1,
                            ) < 0.005
                              ? "case"
                              : "cases"
                          }`
                        : ""}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.companyOrderAddButton, isLight && styles.companyOrderAddButtonLight]}
                    onPress={() => onAddCompanyOrderItem(item)}
                  >
                    <Text
                      style={[
                        styles.companyOrderAddButtonText,
                        isLight && styles.companyOrderAddButtonTextLight,
                      ]}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          {hasMoreCompanyOrderItems ? (
            <TouchableOpacity
              style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
              onPress={onShowMoreCompanyOrderItems}
            >
              <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
                Show More
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>No suppliers loaded.</Text>
      )}
    </>
  );
}
