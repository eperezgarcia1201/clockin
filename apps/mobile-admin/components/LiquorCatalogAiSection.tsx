import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorCatalogSectionProps } from "./LiquorCatalogSection.types";

export function LiquorCatalogAiSection({
  isLight,
  inline,
  hasLiquorPremiumAccess,
  liquorCatalogAiQuery,
  onLiquorCatalogAiQueryChange,
  liquorCatalogAiLoading,
  onAssistLiquorCatalog,
  liquorCatalogAiResult,
  onApplyAiMatchToCatalogSearch,
  onJumpAiMatchToInventory,
}: LiquorCatalogSectionProps) {
  return (
    <View
      style={[
        styles.liquorSectionCard,
        isLight && styles.liquorSectionCardLight,
        { marginTop: 2 },
      ]}
    >
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        {inline("AI Catalog Assistant")}
      </Text>
      {!hasLiquorPremiumAccess ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {inline("AI is enabled only for premium tenants.")}
        </Text>
      ) : (
        <>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorCatalogAiQuery}
            onChangeText={onLiquorCatalogAiQueryChange}
            placeholder={inline("Describe bottle, company, size, budget...")}
          />
          <TouchableOpacity
            style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
            disabled={liquorCatalogAiLoading || !liquorCatalogAiQuery.trim()}
            onPress={onAssistLiquorCatalog}
          >
            <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
              {liquorCatalogAiLoading ? inline("Preparing...") : inline("Find with AI")}
            </Text>
          </TouchableOpacity>

          {liquorCatalogAiResult?.summary ? (
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {liquorCatalogAiResult.summary}
            </Text>
          ) : null}

          <Text style={[styles.label, isLight && styles.labelLight]}>{inline("AI Top Matches")}</Text>
          {liquorCatalogAiResult?.matches?.length ? (
            liquorCatalogAiResult.matches.slice(0, 8).map((match) => (
              <View key={`ai-catalog-${match.item.id}`} style={styles.listRow}>
                <View style={styles.reportRowMain}>
                  <Text style={[styles.listName, isLight && styles.listNameLight]}>
                    #{match.rank} {match.item.name}
                  </Text>
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {match.item.supplierName || "-"} • {match.item.brand || "-"} • {match.score.toFixed(1)}%
                  </Text>
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {match.reason}
                  </Text>
                  <View style={styles.companyOrderExportRow}>
                    <TouchableOpacity
                      style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
                      onPress={() => onApplyAiMatchToCatalogSearch(match.item.name)}
                    >
                      <Text
                        style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}
                      >
                        {inline("Apply to Catalog Search")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
                      onPress={() => onJumpAiMatchToInventory(match.item.name)}
                    >
                      <Text
                        style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}
                      >
                        {inline("Jump to Inventory Sheet")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {inline("No AI matches yet.")}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
