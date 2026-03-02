import type { Dispatch, SetStateAction } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { EditUserForm, Group, Office } from "../types";
import { UsersEditOfficeGroupSelectors } from "./UsersEditOfficeGroupSelectors";
import { UsersEditPermissionToggles } from "./UsersEditPermissionToggles";

type UsersEditSectionProps = {
  isLight: boolean;
  editUserLoading: boolean;
  editingUserId: string | null;
  editUserForm: EditUserForm;
  setEditUserForm: Dispatch<SetStateAction<EditUserForm>>;
  offices: Office[];
  groups: Group[];
  inline: (value: string) => string;
  editUserStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
  cancelEditUser: () => void;
  editUserSaving: boolean;
  saveUserEdits: () => void;
};

export function UsersEditSection({
  isLight,
  editUserLoading,
  editingUserId,
  editUserForm,
  setEditUserForm,
  offices,
  groups,
  inline,
  editUserStatus,
  inlineOrNull,
  cancelEditUser,
  editUserSaving,
  saveUserEdits,
}: UsersEditSectionProps) {
  return (
    <>
      {editUserLoading && (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          Loading user...
        </Text>
      )}
      {!editingUserId ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          Tap Edit on a user below to load their profile.
        </Text>
      ) : (
        <>
          <Text style={[styles.label, isLight && styles.labelLight]}>
            Full Name
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.fullName}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, fullName: value }))
            }
            placeholder="Full name"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            Display Name
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.displayName}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, displayName: value }))
            }
            placeholder="Display name"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>Email</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.email}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, email: value }))
            }
            autoCapitalize="none"
            placeholder="Email"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            Reset PIN (optional)
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.pin}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, pin: value }))
            }
            keyboardType="number-pad"
            maxLength={4}
            placeholder="4-digit PIN"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            Hourly Rate
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.hourlyRate}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, hourlyRate: value }))
            }
            keyboardType="decimal-pad"
            placeholder="15.00"
          />

          <UsersEditOfficeGroupSelectors
            isLight={isLight}
            editUserForm={editUserForm}
            setEditUserForm={setEditUserForm}
            offices={offices}
            groups={groups}
          />
          <UsersEditPermissionToggles
            isLight={isLight}
            editUserForm={editUserForm}
            setEditUserForm={setEditUserForm}
            inline={inline}
          />
          {editUserStatus && (
            <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
              {inlineOrNull(editUserStatus)}
            </Text>
          )}
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isLight && styles.secondaryButtonLight,
                styles.actionButtonCompact,
                (editUserLoading || editUserSaving) && styles.inlineButtonDisabled,
              ]}
              onPress={cancelEditUser}
              disabled={editUserLoading || editUserSaving}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.primary,
                styles.actionButtonPrimary,
                (editUserLoading || editUserSaving) && styles.inlineButtonDisabled,
              ]}
              onPress={saveUserEdits}
              disabled={editUserLoading || editUserSaving}
            >
              <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
                {editUserSaving ? inline("Saving...") : inline("Save Changes")}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </>
  );
}
