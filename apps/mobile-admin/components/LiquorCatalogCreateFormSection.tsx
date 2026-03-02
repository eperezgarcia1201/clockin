import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorCatalogSectionProps } from "./LiquorCatalogSection.types";

export function LiquorCatalogCreateFormSection({
  isLight,
  inline,
  liquorCatalogForm,
  setLiquorCatalogForm,
  catalogKindOptions,
  liquorActionLoading,
  onCreateLiquorCatalogItem,
}: LiquorCatalogSectionProps) {
  return (
    <>
      <View style={styles.liquorFormGrid}>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Company</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorCatalogForm.supplierName}
            onChangeText={(value) =>
              setLiquorCatalogForm((previous) => ({
                ...previous,
                supplierName: value,
              }))
            }
            placeholder="Company"
          />
        </View>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Liquor Name</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorCatalogForm.name}
            onChangeText={(value) =>
              setLiquorCatalogForm((previous) => ({
                ...previous,
                name: value,
              }))
            }
            placeholder="Liquor name"
          />
        </View>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Kind</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorCatalogForm.brand}
            onChangeText={(value) =>
              setLiquorCatalogForm((previous) => ({
                ...previous,
                brand: value,
              }))
            }
            placeholder={inline("Select or type kind")}
          />
          {catalogKindOptions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toggleRow}
            >
              {catalogKindOptions.map((kind) => {
                const selected =
                  liquorCatalogForm.brand.trim().toLowerCase() === kind.trim().toLowerCase();
                return (
                  <TouchableOpacity
                    key={`catalog-kind-${kind}`}
                    style={[
                      styles.togglePill,
                      isLight && styles.togglePillLight,
                      selected && (isLight ? styles.toggleActiveLight : styles.toggleActive),
                    ]}
                    onPress={() =>
                      setLiquorCatalogForm((previous) => ({
                        ...previous,
                        brand: kind,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        isLight && styles.toggleTextLight,
                        selected && isLight && styles.toggleTextLightActive,
                      ]}
                    >
                      {kind}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>UPC</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorCatalogForm.upc}
            onChangeText={(value) =>
              setLiquorCatalogForm((previous) => ({
                ...previous,
                upc: value,
              }))
            }
            placeholder="UPC"
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>ml</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorCatalogForm.sizeMl}
            onChangeText={(value) =>
              setLiquorCatalogForm((previous) => ({
                ...previous,
                sizeMl: value,
              }))
            }
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="750"
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Cost</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorCatalogForm.unitCost}
            onChangeText={(value) =>
              setLiquorCatalogForm((previous) => ({
                ...previous,
                unitCost: value,
              }))
            }
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0.00"
          />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
        disabled={liquorActionLoading === "create-catalog-item" || !liquorCatalogForm.name.trim()}
        onPress={onCreateLiquorCatalogItem}
      >
        <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
          {liquorActionLoading === "create-catalog-item"
            ? inline("Saving...")
            : inline("Add Catalog Item")}
        </Text>
      </TouchableOpacity>
    </>
  );
}
