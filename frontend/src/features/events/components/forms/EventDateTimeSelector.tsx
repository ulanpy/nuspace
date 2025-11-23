
import { Label } from '@/components/atoms/label';
import { Input } from '@/components/atoms/input';
import { useEventForm } from '@/context/EventFormContext';

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

  const isStartDateTimeEditable = isFieldEditable('start_datetime');
  const isEndDateTimeEditable = isFieldEditable('end_datetime');

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      setStartDate(new Date(dateValue));
    } else {
      setStartDate(undefined);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      setEndDate(new Date(dateValue));
    } else {
      setEndDate(undefined);
    }
  };

  // Convert Date objects to YYYY-MM-DD format for HTML date inputs
  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Event Date & Time</h3>
      
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        {/* Start Date and Time */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input 
              id="start_date" 
              name="start_date" 
              type="date" 
              value={formatDateForInput(startDate)}
              onChange={handleStartDateChange}
              className="w-full"
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

        {/* End Date and Time */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="end_date">End Date</Label>
            <Input 
              id="end_date" 
              name="end_date" 
              type="date" 
              value={formatDateForInput(endDate)}
              onChange={handleEndDateChange}
              className="w-full"
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