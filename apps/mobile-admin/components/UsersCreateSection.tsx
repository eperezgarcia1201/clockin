import type { Dispatch, SetStateAction } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Lang } from "../copy";
import type { Employee } from "../types";
import { UsersCreatePermissionToggles } from "./UsersCreatePermissionToggles";

type UsersCreateSectionProps = {
  isLight: boolean;
  language: Lang;
  employees: Employee[];
  onRefreshUsers: () => void;
  inline: (value: string) => string;
  dataSyncError: string | null;
  newUserName: string;
  onNewUserNameChange: (value: string) => void;
  newUserEmail: string;
  onNewUserEmailChange: (value: string) => void;
  newUserPin: string;
  onNewUserPinChange: (value: string) => void;
  newUserIsManager: boolean;
  setNewUserIsManager: Dispatch<SetStateAction<boolean>>;
  newUserIsOwnerManager: boolean;
  setNewUserIsOwnerManager: Dispatch<SetStateAction<boolean>>;
  newUserIsAdmin: boolean;
  setNewUserIsAdmin: Dispatch<SetStateAction<boolean>>;
  newUserIsTimeAdmin: boolean;
  setNewUserIsTimeAdmin: Dispatch<SetStateAction<boolean>>;
  newUserIsReports: boolean;
  setNewUserIsReports: Dispatch<SetStateAction<boolean>>;
  newUserIsKitchenManager: boolean;
  setNewUserIsKitchenManager: Dispatch<SetStateAction<boolean>>;
  newUserIsServer: boolean;
  setNewUserIsServer: Dispatch<SetStateAction<boolean>>;
  userStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
  onCreateUser: () => void;
};

export function UsersCreateSection({
  isLight,
  language,
  employees,
  onRefreshUsers,
  inline,
  dataSyncError,
  newUserName,
  onNewUserNameChange,
  newUserEmail,
  onNewUserEmailChange,
  newUserPin,
  onNewUserPinChange,
  newUserIsManager,
  setNewUserIsManager,
  newUserIsOwnerManager,
  setNewUserIsOwnerManager,
  newUserIsAdmin,
  setNewUserIsAdmin,
  newUserIsTimeAdmin,
  setNewUserIsTimeAdmin,
  newUserIsReports,
  setNewUserIsReports,
  newUserIsKitchenManager,
  setNewUserIsKitchenManager,
  newUserIsServer,
  setNewUserIsServer,
  userStatus,
  inlineOrNull,
  onCreateUser,
}: UsersCreateSectionProps) {
  return (
    <>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Users
      </Text>
      <View style={styles.rowActions}>
        <Text style={[styles.label, isLight && styles.labelLight]}>
          Current Users: {employees.length}
        </Text>
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            isLight && styles.secondaryButtonLight,
            styles.actionButtonCompact,
          ]}
          onPress={onRefreshUsers}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              isLight && styles.secondaryButtonTextLight,
            ]}
          >
            {language === "es" ? "Actualizar" : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>
      {employees.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {language === "es"
            ? "Aún no hay usuarios cargados. Toca Actualizar."
            : "No users loaded yet. Tap Refresh."}
        </Text>
      ) : (
        <View style={[styles.userQuickList, isLight && styles.userQuickListLight]}>
          {employees.slice(0, 8).map((employee) => {
            const status = employee.active ? "Active" : "Disabled";
            return (
              <Text
                key={`quick-${employee.id}`}
                style={[styles.listMeta, isLight && styles.listMetaLight]}
              >
                {employee.name} · {inline(status)}
              </Text>
            );
          })}
        </View>
      )}
      {dataSyncError ? (
        <Text
          style={[
            styles.statusText,
            { color: isLight ? "#b91c1c" : "#fca5a5" },
          ]}
        >
          API sync: {dataSyncError}
        </Text>
      ) : null}
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.label, isLight && styles.labelLight]}>
        Create New User
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="Full name"
        value={newUserName}
        onChangeText={onNewUserNameChange}
      />
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="Email"
        value={newUserEmail}
        onChangeText={onNewUserEmailChange}
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="4-digit PIN"
        value={newUserPin}
        onChangeText={onNewUserPinChange}
        keyboardType="number-pad"
        maxLength={4}
      />
      <UsersCreatePermissionToggles
        isLight={isLight}
        newUserIsManager={newUserIsManager}
        setNewUserIsManager={setNewUserIsManager}
        newUserIsOwnerManager={newUserIsOwnerManager}
        setNewUserIsOwnerManager={setNewUserIsOwnerManager}
        newUserIsAdmin={newUserIsAdmin}
        setNewUserIsAdmin={setNewUserIsAdmin}
        newUserIsTimeAdmin={newUserIsTimeAdmin}
        setNewUserIsTimeAdmin={setNewUserIsTimeAdmin}
        newUserIsReports={newUserIsReports}
        setNewUserIsReports={setNewUserIsReports}
        newUserIsKitchenManager={newUserIsKitchenManager}
        setNewUserIsKitchenManager={setNewUserIsKitchenManager}
        newUserIsServer={newUserIsServer}
        setNewUserIsServer={setNewUserIsServer}
      />
      {userStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(userStatus)}
        </Text>
      )}
      <TouchableOpacity style={[styles.button, styles.primary]} onPress={onCreateUser}>
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          Create User
        </Text>
      </TouchableOpacity>

      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Edit User
      </Text>
    </>
  );
}
