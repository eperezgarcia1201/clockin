import type { SchedulesCardProps } from "./SchedulesCard.types";
import { ScheduleDayRow } from "./ScheduleDayRow";

export function ScheduleDaysEditorSection({
  isLight,
  scheduleDays,
  onUpdateScheduleDay,
  onAdjustScheduleTime,
  onSetScheduleMeridiem,
}: SchedulesCardProps) {
  return scheduleDays.map((day) => (
    <ScheduleDayRow
      key={day.weekday}
      isLight={isLight}
      day={day}
      onUpdateScheduleDay={onUpdateScheduleDay}
      onAdjustScheduleTime={onAdjustScheduleTime}
      onSetScheduleMeridiem={onSetScheduleMeridiem}
    />
  ));
}
