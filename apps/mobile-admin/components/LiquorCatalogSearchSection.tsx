import { ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { styles } from "../App.styles";
import type { LiquorCatalogSectionProps } from "./LiquorCatalogSection.types";

export function LiquorCatalogSearchSection({
  isLight,
  inline,
  liquorCatalogSearch,
  onLiquorCatalogSearchChange,
  catalogSuggestions,
}: LiquorCatalogSectionProps) {
  return (
    <>
      <Text style={[styles.label, isLight && styles.labelLight]}>
        {inline("Search Catalog")}
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={liquorCatalogSearch}
        onChangeText={onLiquorCatalogSearchChange}
        placeholder={inline("Search by liquor, company, kind or UPC")}
      />
      {catalogSuggestions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toggleRow}
        >
          {catalogSuggestions.map((item) => (
            <TouchableOpacity
              key={`catalog-suggestion-${item.id}`}
              style={[styles.togglePill, isLight && styles.togglePillLight]}
              onPress={() => onLiquorCatalogSearchChange(item.name)}
            >
              <Text style={[styles.toggleText, isLight && styles.toggleTextLight]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
    </>
  );
}
