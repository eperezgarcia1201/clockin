import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorCatalogSectionProps } from "./LiquorCatalogSection.types";

export function LiquorCatalogUpcLookupSection({
  isLight,
  inline,
  liquorLookupUpc,
  onLiquorLookupUpcChange,
  liquorLookupLoading,
  onLookupLiquorByUpc,
  liquorLookupResult,
}: LiquorCatalogSectionProps) {
  return (
    <>
      <View style={styles.companyOrderExportRow}>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>UPC</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorLookupUpc}
            onChangeText={onLiquorLookupUpcChange}
            placeholder="081538102055"
          />
        </View>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={liquorLookupLoading || !liquorLookupUpc.trim()}
          onPress={onLookupLiquorByUpc}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            {liquorLookupLoading ? "..." : inline("Lookup UPC")}
          </Text>
        </TouchableOpacity>
      </View>
      {liquorLookupResult ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          Source: {liquorLookupResult.source || "unknown"}
          {liquorLookupResult.item?.name
            ? ` • ${liquorLookupResult.item.name}`
            : liquorLookupResult.candidate?.name
              ? ` • ${liquorLookupResult.candidate.name}`
              : ""}
        </Text>
      ) : null}
    </>
  );
}
