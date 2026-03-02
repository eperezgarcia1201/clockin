import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorCatalogItem, LiquorMovementType, Office } from "../types";
import type { LiquorMovementFormState } from "./LiquorOperationsSection.types";
import type { Dispatch, SetStateAction } from "react";

type LiquorMovementFormSectionProps = {
  isLight: boolean;
  inline: (value: string) => string;
  sortedCatalogItems: LiquorCatalogItem[];
  offices: Office[];
  liquorMovementTypes: LiquorMovementType[];
  liquorMovementForm: LiquorMovementFormState;
  setLiquorMovementForm: Dispatch<SetStateAction<LiquorMovementFormState>>;
  liquorActionLoading: string | null;
  onCreateLiquorMovement: () => void;
};

export function LiquorMovementFormSection({
  isLight,
  inline,
  sortedCatalogItems,
  offices,
  liquorMovementTypes,
  liquorMovementForm,
  setLiquorMovementForm,
  liquorActionLoading,
  onCreateLiquorMovement,
}: LiquorMovementFormSectionProps) {
  return (
    <>
      <Text style={[styles.label, isLight && styles.labelLight]}>Item</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toggleRow}>
        {sortedCatalogItems.map((item) => (
          <TouchableOpacity
            key={`movement-item-${item.id}`}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              liquorMovementForm.itemId === item.id && (isLight ? styles.toggleActiveLight : styles.toggleActive),
            ]}
            onPress={() => setLiquorMovementForm((previous) => ({ ...previous, itemId: item.id }))}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                liquorMovementForm.itemId === item.id && isLight && styles.toggleTextLightActive,
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
            !liquorMovementForm.officeId && (isLight ? styles.toggleActiveLight : styles.toggleActive),
          ]}
          onPress={() => setLiquorMovementForm((previous) => ({ ...previous, officeId: "" }))}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              !liquorMovementForm.officeId && isLight && styles.toggleTextLightActive,
            ]}
          >
            Use scope
          </Text>
        </TouchableOpacity>
        {offices.map((office) => (
          <TouchableOpacity
            key={`movement-office-${office.id}`}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              liquorMovementForm.officeId === office.id &&
                (isLight ? styles.toggleActiveLight : styles.toggleActive),
            ]}
            onPress={() => setLiquorMovementForm((previous) => ({ ...previous, officeId: office.id }))}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                liquorMovementForm.officeId === office.id && isLight && styles.toggleTextLightActive,
              ]}
            >
              {office.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.label, isLight && styles.labelLight]}>Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toggleRow}>
        {liquorMovementTypes.map((movementType) => (
          <TouchableOpacity
            key={`movement-type-${movementType}`}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              liquorMovementForm.type === movementType &&
                (isLight ? styles.toggleActiveLight : styles.toggleActive),
            ]}
            onPress={() => setLiquorMovementForm((previous) => ({ ...previous, type: movementType }))}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                liquorMovementForm.type === movementType && isLight && styles.toggleTextLightActive,
              ]}
            >
              {movementType}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.liquorFormGrid}>
        <View style={styles.liquorFieldThird}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Qty</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorMovementForm.quantity}
            onChangeText={(value) => setLiquorMovementForm((previous) => ({ ...previous, quantity: value }))}
            keyboardType="decimal-pad"
            inputMode="decimal"
          />
        </View>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>Date/Time</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorMovementForm.occurredAt}
            onChangeText={(value) => setLiquorMovementForm((previous) => ({ ...previous, occurredAt: value }))}
            placeholder="YYYY-MM-DDTHH:mm"
          />
        </View>
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>{inline("Notes")}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={liquorMovementForm.notes}
        onChangeText={(value) => setLiquorMovementForm((previous) => ({ ...previous, notes: value }))}
        placeholder="Optional notes"
      />
      <TouchableOpacity
        style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
        disabled={liquorActionLoading === "create-movement"}
        onPress={onCreateLiquorMovement}
      >
        <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
          {liquorActionLoading === "create-movement" ? inline("Saving...") : inline("Post Movement")}
        </Text>
      </TouchableOpacity>
    </>
  );
}
