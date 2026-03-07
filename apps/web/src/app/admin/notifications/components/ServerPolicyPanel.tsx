import { ServerPolicyToolbar } from "./ServerPolicyToolbar";
import { ServerReminderRuleCards } from "./ServerReminderRuleCards";
import type {
  AdminNotificationsTranslate,
  NotificationPolicySettings,
  NotificationPolicyUpdater,
} from "../types";

type ServerPolicyPanelProps = {
  availableTimeZones: string[];
  browserTimeZone: string;
  onPolicyChange: NotificationPolicyUpdater;
  onResetDraft: () => void;
  onSave: () => void;
  onUseBrowserTimeZone: () => void;
  policy: NotificationPolicySettings;
  policyDirty: boolean;
  settingsBusy: boolean;
  settingsLoading: boolean;
  tr: AdminNotificationsTranslate;
};

export function ServerPolicyPanel(props: ServerPolicyPanelProps) {
  return (
    <div className="border rounded p-3 bg-body-tertiary d-flex flex-column gap-3">
      <ServerPolicyToolbar
        availableTimeZones={props.availableTimeZones}
        browserTimeZone={props.browserTimeZone}
        onResetDraft={props.onResetDraft}
        onSave={props.onSave}
        onTimeZoneChange={(value) => props.onPolicyChange("timezone", value)}
        onUseBrowserTimeZone={props.onUseBrowserTimeZone}
        policy={props.policy}
        policyDirty={props.policyDirty}
        settingsBusy={props.settingsBusy}
        settingsLoading={props.settingsLoading}
        tr={props.tr}
      />
      <ServerReminderRuleCards
        onPolicyChange={props.onPolicyChange}
        policy={props.policy}
        settingsBusy={props.settingsBusy}
        tr={props.tr}
      />
    </div>
  );
}
