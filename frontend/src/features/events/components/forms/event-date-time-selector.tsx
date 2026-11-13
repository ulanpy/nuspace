"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/shared/date-picker";
import { useEventForm } from "@/context/event-form-context";

export function EventDateTimeSelector() {
  const {
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    isFieldEditable,
  } = useEventForm();

  const isStartDateTimeEditable = isFieldEditable("start_datetime");
  const isEndDateTimeEditable = isFieldEditable("end_datetime");

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Event Date & Time</h3>

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <DatePicker
              id="start_date"
              value={startDate}
              onChange={setStartDate}
              disabled={!isStartDateTimeEditable}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">Start Time</Label>
            <Input
              id="start_time"
              name="start_time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full"
              disabled={!isStartDateTimeEditable}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="end_date">End Date</Label>
            <DatePicker
              id="end_date"
              value={endDate}
              onChange={setEndDate}
              disabled={!isEndDateTimeEditable}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_time">End Time</Label>
            <Input
              id="end_time"
              name="end_time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full"
              disabled={!isEndDateTimeEditable}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
