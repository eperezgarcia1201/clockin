import type { Dispatch, SetStateAction } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { EditUserForm } from "../types";

type UsersEditPermissionTogglesProps = {
  isLight: boolean;
  editUserForm: EditUserForm;
  setEditUserForm: Dispatch<SetStateAction<EditUserForm>>;
  inline: (value: string) => string;
};

export function UsersEditPermissionToggles({
  isLight,
  editUserForm,
  setEditUserForm,
  inline,
}: UsersEditPermissionTogglesProps) {
  return (
    <>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Owner status: {editUserForm.isManager ? (editUserForm.isOwnerManager ? "Yes" : "No") : "N/A"}
      </Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            editUserForm.isManager && styles.toggleActive,
            editUserForm.isManager && isLight && styles.toggleActiveLight,
          ]}
          onPress={() =>
            setEditUserForm((prev) => ({
              ...prev,
              isManager: !prev.isManager,
              isOwnerManager: !prev.isManager ? prev.isOwnerManager : false,
            }))
          }
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              editUserForm.isManager && isLight && styles.toggleTextLightActive,
            ]}
          >
            Manager
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            editUserForm.isOwnerManager && styles.toggleActive,
            editUserForm.isOwnerManager && isLight && styles.toggleActiveLight,
            !editUserForm.isManager && styles.inlineButtonDisabled,
          ]}
          onPress={() =>
            setEditUserForm((prev) => ({
              ...prev,
              isOwnerManager: prev.isManager ? !prev.isOwnerManager : false,
            }))
          }
          disabled={!editUserForm.isManager}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              editUserForm.isOwnerManager && isLight && styles.toggleTextLightActive,
            ]}
          >
            Manager Owner
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            editUserForm.isAdmin && styles.toggleActive,
            editUserForm.isAdmin && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setEditUserForm((prev) => ({ ...prev, isAdmin: !prev.isAdmin }))}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              editUserForm.isAdmin && isLight && styles.toggleTextLightActive,
            ]}
          >
            Sys Admin
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            editUserForm.isTimeAdmin && styles.toggleActive,
            editUserForm.isTimeAdmin && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setEditUserForm((prev) => ({ ...prev, isTimeAdmin: !prev.isTimeAdmin }))}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              editUserForm.isTimeAdmin && isLight && styles.toggleTextLightActive,
            ]}
          >
            Time Admin
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            editUserForm.isReports && styles.toggleActive,
            editUserForm.isReports && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setEditUserForm((prev) => ({ ...prev, isReports: !prev.isReports }))}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              editUserForm.isReports && isLight && styles.toggleTextLightActive,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            editUserForm.isKitchenManager && styles.toggleActive,
            editUserForm.isKitchenManager && isLight && styles.toggleActiveLight,
          ]}
          onPress={() =>
            setEditUserForm((prev) => ({ ...prev, isKitchenManager: !prev.isKitchenManager }))
          }
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              editUserForm.isKitchenManager && isLight && styles.toggleTextLightActive,
            ]}
          >
            Kitchen Manager
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            editUserForm.isServer && styles.toggleActive,
            editUserForm.isServer && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setEditUserForm((prev) => ({ ...prev, isServer: !prev.isServer }))}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              editUserForm.isServer && isLight && styles.toggleTextLightActive,
            ]}
          >
            Server
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            editUserForm.disabled && styles.toggleDanger,
          ]}
          onPress={() => setEditUserForm((prev) => ({ ...prev, disabled: !prev.disabled }))}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              editUserForm.disabled && styles.toggleTextLightActive,
            ]}
          >
            {inline(editUserForm.disabled ? "Disabled" : "Active")}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
