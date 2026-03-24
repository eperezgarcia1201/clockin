import { extractPendingTipsWorkDate } from "./api-runtime";
import { localDateKey, normalizePinInput } from "./app-helpers";
import { buildEmployeeActiveShift } from "./active-shift-storage";
import {
  buildPunchPayloads,
  isAlreadyHasActiveShiftError,
  isEmployeeNotFoundPunchError,
  isInvalidPinPunchError,
  isServerTipsRequiredPunchError,
} from "./punch-runtime";
import { capturePunchFacePhoto } from "./punch-photo-workflows";
import {
  getClockInCoordinates,
  showManagerPunchMessage,
  submitPunchWithOptionalRetry,
} from "./punch-tip-runtime";
import type { UsePunchTipActionsParams } from "./punch-tip-action-types";
import { submitEmployeeTipsFromPunchScreen } from "./punch-tip-submit-runtime";

const PUNCH_TYPES_REQUIRING_PHOTO = new Set(["IN", "BREAK", "OUT"]);

export const usePunchTipActions = (params: UsePunchTipActionsParams) => {
  const handlePunch = async () => {
    if (!params.tenant) {
      params.setStatus(params.t.tenantNotConfigured);
      return;
    }

    const targetEmployee = params.selectedEmployee;
    const currentWorkDate = localDateKey();
    const currentTipKey = targetEmployee
      ? params.getTipSubmissionKey(targetEmployee.id, currentWorkDate)
      : null;

    if (!targetEmployee) {
      if (params.punchType !== "IN") {
        params.setStatus(params.t.noActiveShiftUser);
      } else if (!params.employeeName.trim()) {
        params.setStatus(params.t.enterUsernameFirst);
      } else {
        params.setStatus(params.t.employeeNotFoundUseFullName);
      }
      return;
    }

    if (
      params.punchType === "OUT" &&
      params.requiresTipsForOut &&
      !params.hasSubmittedTips
    ) {
      if (
        !currentTipKey ||
        !params.tiplessClockOutWarningsByDay[currentTipKey]
      ) {
        if (currentTipKey) {
          params.markTiplessClockOutWarning(currentTipKey);
        }
        params.setStatus(params.t.submitTipsBeforeOut);
        params.setTipsStatus(params.t.secondTiplessClockOutWarning);
        params.setTipsAlert(true);
        params.scrollToBottom();
        return;
      }
    }
    if (params.punchType === "IN" && targetEmployee.isServer && params.pendingTipDate) {
      params.setStatus(
        params.t.pendingTipsBeforeClockIn.replace("{date}", params.pendingTipDate),
      );
      params.setTipsStatus(
        params.t.pendingTipsStatus.replace("{date}", params.pendingTipDate),
      );
      params.setTipsAlert(true);
      params.scrollToBottom();
      return;
    }

    const typedPin = normalizePinInput(params.pin);
    if (typedPin.length > 0 && typedPin.length !== 4) {
      params.setStatus(params.t.pinMustBe4Digits);
      return;
    }
    const requestPin =
      params.punchType === "IN"
        ? typedPin || undefined
        : typedPin || params.activeShift?.pin || undefined;
    const requiresPunchPhoto =
      targetEmployee.requiresPunchPhoto === true &&
      PUNCH_TYPES_REQUIRING_PHOTO.has(params.punchType);

    params.setLoading(true);
    params.setStatus(null);
    try {
      const needsGeofenceCheck =
        params.punchType === "IN" &&
        Boolean(params.selectedOffice) &&
        typeof params.selectedOffice?.latitude === "number" &&
        typeof params.selectedOffice?.longitude === "number";
      const coordinates = needsGeofenceCheck
        ? await getClockInCoordinates({
            locationPermissionRequired: params.t.locationPermissionRequired,
            unableToReadLocation: params.t.unableToReadLocation,
          })
        : null;
      let photoDataUrl: string | undefined;
      if (requiresPunchPhoto) {
        params.setStatus(params.t.capturingFacePhoto);
        const captureResult = await capturePunchFacePhoto();
        if (captureResult.state === "camera_permission_required") {
          params.setStatus(params.t.facePhotoCameraPermissionRequired);
          return;
        }
        if (captureResult.state === "canceled") {
          params.setStatus(params.t.facePhotoCanceled);
          return;
        }
        photoDataUrl = captureResult.photoDataUrl;
      }

      const { basePayload: basePunchPayload, payloadWithGeo: geoPunchPayload } =
        buildPunchPayloads({
          type: params.punchType,
          pin: requestPin,
          photoDataUrl,
          coordinates,
        });
      if (
        params.punchType === "OUT" &&
        params.requiresTipsForOut &&
        !params.hasSubmittedTips &&
        currentTipKey &&
        params.tiplessClockOutWarningsByDay[currentTipKey]
      ) {
        basePunchPayload.allowMissingTips = true;
        geoPunchPayload.allowMissingTips = true;
      }
      const punchResponse = await submitPunchWithOptionalRetry({
        fetchJson: params.fetchJson,
        employeeId: targetEmployee.id,
        basePayload: basePunchPayload,
        payloadWithGeo: geoPunchPayload,
      });
      await params.rememberEmployeePushOwner(targetEmployee.id);
      params.setStatus(params.t.punchRecorded);
      params.setServerTipsRequired(false);
      params.setLastPunch({
        name: targetEmployee.name,
        type: params.punchType,
        occurredAt: new Date(),
      });
      if (params.punchType === "IN") {
        const shift = buildEmployeeActiveShift({
          tenant: params.tenant,
          employee: targetEmployee,
          pin: typedPin,
        });
        params.setActiveShift(shift);
        await params.persistActiveShift(shift);
        params.setEmployeeName(targetEmployee.name);
        if (punchResponse?.pendingTipReminderWorkDate) {
          params.setPendingTipWorkDate(punchResponse.pendingTipReminderWorkDate);
          params.setTipsReminderEmployeeId(targetEmployee.id);
          params.setServerTipsRequired(true);
          params.setTipsStatus(
            params.t.missedTipsStatus.replace(
              "{date}",
              punchResponse.pendingTipReminderWorkDate,
            ),
          );
          params.setStatus(
            params.t.missedTipsReminder.replace(
              "{date}",
              punchResponse.pendingTipReminderWorkDate,
            ),
          );
          params.setTipsAlert(true);
          params.scrollToBottom();
        } else {
          params.setTipsAlert(false);
          params.setPendingTipWorkDate(null);
        }
      }
      if (
        params.punchType !== "IN" &&
        params.activeShift &&
        !params.activeShift.pin &&
        typedPin
      ) {
        const shifted = { ...params.activeShift, pin: typedPin };
        params.setActiveShift(shifted);
        await params.persistActiveShift(shifted);
      }
      if (params.punchType === "IN" && targetEmployee.isServer) {
        params.setTipsReminderEmployeeId(targetEmployee.id);
      }
      showManagerPunchMessage({
        punchResponse,
        punchType: params.punchType,
        t: params.t,
      });
      params.setPin("");
      await params.loadWorkingNow();
      if (params.punchType === "OUT") {
        if (currentTipKey) {
          params.clearTiplessClockOutWarning(currentTipKey);
        }
        if (params.requiresTipsForOut) {
          params.setCashTips("0");
          params.setCreditCardTips("0");
        }
        params.clearActiveShiftSession(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : params.t.punchFailed;
      if (params.punchType !== "IN" && isEmployeeNotFoundPunchError(message)) {
        params.clearActiveShiftSession(true);
        params.setStatus(params.t.noActiveShiftUser);
      } else if (isServerTipsRequiredPunchError(message)) {
        params.setServerTipsRequired(true);
        params.setStatus(params.t.submitTipsBeforeOut);
        params.setTipsStatus(params.t.tapSubmitTipsFirst);
        params.setTipsAlert(true);
        params.scrollToBottom();
      } else if (params.punchType === "IN" && extractPendingTipsWorkDate(message)) {
        const pendingDate = extractPendingTipsWorkDate(message) as string;
        params.setPendingTipWorkDate(pendingDate);
        params.setServerTipsRequired(true);
        params.setStatus(`Submit tips for ${pendingDate} before clocking in.`);
        params.setTipsStatus(`Pending tips for ${pendingDate}.`);
        params.setTipsAlert(true);
        params.scrollToBottom();
      } else if (params.punchType === "IN" && isAlreadyHasActiveShiftError(message)) {
        const recoveredShift = buildEmployeeActiveShift({
          tenant: params.tenant,
          employee: targetEmployee,
          pin: typedPin,
        });
        await params.rememberEmployeePushOwner(targetEmployee.id);
        params.setActiveShift(recoveredShift);
        await params.persistActiveShift(recoveredShift);
        params.setEmployeeName(targetEmployee.name);
        params.setPin("");
        params.setStatus(params.t.activeShiftRestored);
        void params.loadWorkingNow();
      } else if (isInvalidPinPunchError(message)) {
        params.setStatus(params.t.invalidPinResetHint);
      } else if (message.toLowerCase().includes("face photo is required")) {
        params.setStatus(params.t.facePhotoRequired);
      } else {
        params.setStatus(message);
      }
    } finally {
      params.setLoading(false);
    }
  };

  const handleSubmitTips = async () => submitEmployeeTipsFromPunchScreen(params);

  return {
    handlePunch,
    handleSubmitTips,
  };
};
