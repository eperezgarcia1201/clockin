import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Lang } from "../copy";
import type { Office } from "../types";

type LocationsCopy = {
  activeLocation: string;
  allLocations: string;
};

type OfficesCardProps = {
  isLight: boolean;
  text: LocationsCopy;
  activeLocationLabel: string;
  canManageMultiLocation: boolean;
  scopedLocationId: string;
  offices: Office[];
  onActiveLocationChange: (officeId: string) => void;
  canCreateLocations: boolean;
  newOfficeName: string;
  onNewOfficeNameChange: (value: string) => void;
  newOfficeLatitude: string;
  onNewOfficeLatitudeChange: (value: string) => void;
  newOfficeLongitude: string;
  onNewOfficeLongitudeChange: (value: string) => void;
  newOfficeRadius: string;
  onNewOfficeRadiusChange: (value: string) => void;
  onCreateOffice: () => void;
  officeStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
  officeGeoTarget: Office | null;
  officeGeoLatitude: string;
  onOfficeGeoLatitudeChange: (value: string) => void;
  officeGeoLongitude: string;
  onOfficeGeoLongitudeChange: (value: string) => void;
  officeGeoRadius: string;
  onOfficeGeoRadiusChange: (value: string) => void;
  officeGeoSaving: boolean;
  onSaveOfficeGeofence: () => void;
  inline: (value: string) => string;
  language: Lang;
  officeGeoStatus: string | null;
  onSwitchOffice: (officeId: string) => void;
};

export function OfficesCard({
  isLight,
  text,
  activeLocationLabel,
  canManageMultiLocation,
  scopedLocationId,
  offices,
  onActiveLocationChange,
  canCreateLocations,
  newOfficeName,
  onNewOfficeNameChange,
  newOfficeLatitude,
  onNewOfficeLatitudeChange,
  newOfficeLongitude,
  onNewOfficeLongitudeChange,
  newOfficeRadius,
  onNewOfficeRadiusChange,
  onCreateOffice,
  officeStatus,
  inlineOrNull,
  officeGeoTarget,
  officeGeoLatitude,
  onOfficeGeoLatitudeChange,
  officeGeoLongitude,
  onOfficeGeoLongitudeChange,
  officeGeoRadius,
  onOfficeGeoRadiusChange,
  officeGeoSaving,
  onSaveOfficeGeofence,
  inline,
  language,
  officeGeoStatus,
  onSwitchOffice,
}: OfficesCardProps) {
  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Locations
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        {text.activeLocation}: {activeLocationLabel}
      </Text>
      {canManageMultiLocation ? (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              !scopedLocationId && styles.toggleActive,
              !scopedLocationId && isLight && styles.toggleActiveLight,
            ]}
            onPress={() => onActiveLocationChange("")}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                !scopedLocationId && isLight && styles.toggleTextLightActive,
              ]}
            >
              {text.allLocations}
            </Text>
          </TouchableOpacity>
          {offices.map((office) => (
            <TouchableOpacity
              key={`scope-${office.id}`}
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                scopedLocationId === office.id && styles.toggleActive,
                scopedLocationId === office.id && isLight && styles.toggleActiveLight,
              ]}
              onPress={() => onActiveLocationChange(office.id)}
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  scopedLocationId === office.id &&
                    isLight &&
                    styles.toggleTextLightActive,
                ]}
              >
                {office.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {canCreateLocations ? (
        <>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="New location name"
            value={newOfficeName}
            onChangeText={onNewOfficeNameChange}
          />
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Latitude (optional)"
            value={newOfficeLatitude}
            onChangeText={onNewOfficeLatitudeChange}
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Longitude (optional)"
            value={newOfficeLongitude}
            onChangeText={onNewOfficeLongitudeChange}
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Radius meters (optional, default 120)"
            value={newOfficeRadius}
            onChangeText={onNewOfficeRadiusChange}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.button, styles.primary]}
            onPress={onCreateOffice}
          >
            <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
              Create Location
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          Location creation is disabled for this manager.
        </Text>
      )}
      {officeStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(officeStatus)}
        </Text>
      )}
      {officeGeoTarget ? (
        <>
          <View style={[styles.divider, isLight && styles.dividerLight]} />
          <Text style={[styles.listName, isLight && styles.listNameLight]}>
            Geofence: {officeGeoTarget.name}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Latitude"
            value={officeGeoLatitude}
            onChangeText={onOfficeGeoLatitudeChange}
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Longitude"
            value={officeGeoLongitude}
            onChangeText={onOfficeGeoLongitudeChange}
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Radius meters (25-5000)"
            value={officeGeoRadius}
            onChangeText={onOfficeGeoRadiusChange}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              isLight && styles.secondaryButtonLight,
              officeGeoSaving && styles.inlineButtonDisabled,
            ]}
            onPress={onSaveOfficeGeofence}
            disabled={officeGeoSaving}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isLight && styles.secondaryButtonTextLight,
              ]}
            >
              {officeGeoSaving
                ? inline("Saving...")
                : language === "es"
                  ? "Guardar Geocerca"
                  : "Save Geofence"}
            </Text>
          </TouchableOpacity>
          {officeGeoStatus && (
            <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
              {inlineOrNull(officeGeoStatus)}
            </Text>
          )}
        </>
      ) : null}
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {offices.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No locations created yet.
        </Text>
      ) : (
        offices.map((office) => (
          <View key={office.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {office.name}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {scopedLocationId === office.id
                  ? "Current location panel"
                  : "Tap switch to open this location panel"}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {office.latitude !== null &&
                office.latitude !== undefined &&
                office.longitude !== null &&
                office.longitude !== undefined
                  ? `Geofence: ${office.latitude.toFixed(5)}, ${office.longitude.toFixed(5)} • ${
                      office.geofenceRadiusMeters || 120
                    }m`
                  : "Geofence: not configured"}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isLight && styles.secondaryButtonLight,
                styles.actionButtonCompact,
              ]}
              onPress={() => onSwitchOffice(office.id)}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                {inline(scopedLocationId === office.id ? "Current" : "Switch")}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}
