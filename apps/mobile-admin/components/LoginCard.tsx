import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../App.styles";

type LoginCopy = {
  loginTitle: string;
  tenant: string;
  tenantPlaceholder: string;
  username: string;
  password: string;
  signingIn: string;
  signIn: string;
  forgetSavedAdmin: string;
  savedAdminDetected: string;
  pushHelp: string;
};

type LoginCardProps = {
  isLight: boolean;
  text: LoginCopy;
  tenantInput: string;
  onTenantInputChange: (value: string) => void;
  username: string;
  onUsernameChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  loginStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
  onLogin: () => void;
  onForgetSavedAdmin: () => void;
  loginLoading: boolean;
  dataSyncError: string | null;
};

export function LoginCard({
  isLight,
  text,
  tenantInput,
  onTenantInputChange,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  loginStatus,
  inlineOrNull,
  onLogin,
  onForgetSavedAdmin,
  loginLoading,
  dataSyncError,
}: LoginCardProps) {
  const hasSavedAdmin = Boolean(tenantInput.trim() || username.trim());
  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        {text.loginTitle}
      </Text>
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.tenant}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder={text.tenantPlaceholder}
        value={tenantInput}
        onChangeText={onTenantInputChange}
        autoCapitalize="none"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.username}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="admin"
        value={username}
        onChangeText={onUsernameChange}
        autoCapitalize="none"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>{text.password}</Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="••••••"
        secureTextEntry
        value={password}
        onChangeText={onPasswordChange}
      />
      {loginStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(loginStatus)}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.button, styles.primary]}
        onPress={onLogin}
        disabled={loginLoading}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {loginLoading ? text.signingIn : text.signIn}
        </Text>
      </TouchableOpacity>
      {hasSavedAdmin ? (
        <>
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            {text.savedAdminDetected}
          </Text>
          <TouchableOpacity
            style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
            onPress={onForgetSavedAdmin}
            disabled={loginLoading}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isLight && styles.secondaryButtonTextLight,
              ]}
            >
              {text.forgetSavedAdmin}
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
      <Text style={[styles.helperText, isLight && styles.helperTextLight]}>
        {text.pushHelp}
      </Text>
      {dataSyncError && (
        <Text
          style={[
            styles.statusText,
            { color: isLight ? "#b91c1c" : "#fca5a5" },
          ]}
        >
          API sync: {dataSyncError}
        </Text>
      )}
    </View>
  );
}
