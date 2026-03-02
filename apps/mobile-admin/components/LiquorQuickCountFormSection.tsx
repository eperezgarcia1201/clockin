import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorCatalogItem, Office } from "../types";
import type { Dispatch, SetStateAction } from "react";
import type { LiquorQuickCountFormState } from "./LiquorOperationsSection.types";

type LiquorQuickCountFormSectionProps = {
  isLight: boolean;
  inline: (value: string) => string;
  sortedCatalogItems: LiquorCatalogItem[];
  offices: Office[];
  liquorQuickCountForm: LiquorQuickCountFormState;
  setLiquorQuickCountForm: Dispatch<SetStateAction<LiquorQuickCountFormState>>;
  formatQtyValue: (value: number | null | undefined) => string;
  quickCountBodegaMl: number;
  liquorActionLoading: string | null;
  onSaveLiquorQuickCount: () => void;
};

export function LiquorQuickCountFormSection({
  isLight,
  inline,
  sortedCatalogItems,
  offices,
  liquorQuickCountForm,
  setLiquorQuickCountForm,
  formatQtyValue,
  quickCountBodegaMl,
  liquorActionLoading,
  onSaveLiquorQuickCount,
}: LiquorQuickCountFormSectionProps) {
  return (
    <>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.listName, isLight && styles.listNameLight]}>{inline("Quick Count")}</Text>
      <Text style={[styles.label, isLight && styles.labelLight]}>Item</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toggleRow}>
        {sortedCatalogItems.map((item) => (
          <TouchableOpacity
            key={`count-item-${item.id}`}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              liquorQuickCountForm.itemId === item.id &&
                (isLight ? styles.toggleActiveLight : styles.toggleActive),
            ]}
            onPress={() => setLiquorQuickCountForm((previous) => ({ ...previous, itemId: item.id }))}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                liquorQuickCountForm.itemId === item.id && isLight && styles.toggleTextLightActive,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.label, isLight && styles.labelLight]}>Location</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            !liquorQuickCountForm.officeId &&
              (isLight ? styles.toggleActiveLight : styles.toggleActive),
          ]}
          onPress={() => setLiquorQuickCountForm((previous) => ({ ...previous, officeId: "" }))}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              !liquorQuickCountForm.officeId && isLight && styles.toggleTextLightActive,
            ]}
          >
            Use scope
          </Text>
        </TouchableOpacity>
        {offices.map((office) => (
          <TouchableOpacity
            key={`count-office-${office.id}`}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              liquorQuickCountForm.officeId === office.id &&
                (isLight ? styles.toggleActiveLight : styles.toggleActive),
            ]}
            onPress={() => setLiquorQuickCountForm((previous) => ({ ...previous, officeId: office.id }))}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                liquorQuickCountForm.officeId === office.id && isLight && styles.toggleTextLightActive,
              ]}
            >
              {office.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.liquorFormGrid}>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Count Date</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorQuickCountForm.countDate}
            onChangeText={(value) => setLiquorQuickCountForm((previous) => ({ ...previous, countDate: value }))}
            placeholder="YYYY-MM-DD"
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Qty</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorQuickCountForm.quantity}
            onChangeText={(value) => setLiquorQuickCountForm((previous) => ({ ...previous, quantity: value }))}
            keyboardType="decimal-pad"
            inputMode="decimal"
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Bar</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorQuickCountForm.barQuantity}
            onChangeText={(value) =>
              setLiquorQuickCountForm((previous) => ({ ...previous, barQuantity: value }))
            }
            keyboardType="decimal-pad"
            inputMode="decimal"
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>{inline("Bodega Bottles")}</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorQuickCountForm.bodegaBottleCount}
            onChangeText={(value) =>
              setLiquorQuickCountForm((previous) => ({ ...previous, bodegaBottleCount: value }))
            }
            keyboardType="decimal-pad"
            inputMode="decimal"
          />
        </View>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>{inline("Bodega ML")}</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={formatQtyValue(quickCountBodegaMl)}
            editable={false}
          />
        </View>
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>{inline("Notes")}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={liquorQuickCountForm.notes}
        onChangeText={(value) => setLiquorQuickCountForm((previous) => ({ ...previous, notes: value }))}
        placeholder="Optional notes"
      />
      <TouchableOpacity
        style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
        disabled={liquorActionLoading === "save-quick-count"}
        onPress={onSaveLiquorQuickCount}
      >
        <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
          {liquorActionLoading === "save-quick-count" ? inline("Saving...") : inline("Save Count")}
        </Text>
      </TouchableOpacity>
    </>
  );
}
