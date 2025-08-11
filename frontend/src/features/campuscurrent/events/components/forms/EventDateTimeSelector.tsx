
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/atoms/label';
import { Input } from '@/components/atoms/input';
import { Button } from '@/components/atoms/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { Calendar as CalendarComponent } from '@/components/atoms/calendar';
import { useEventForm } from '../../../../../context/EventFormContext';

export function EventDateTimeSelector() {
  const {
    date,
    setDate,
    time,
    setTime,
    isFieldEditable,
  } = useEventForm();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="event_date">Event Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[150]">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) => !isFieldEditable('event_datetime')}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_time">Event Time</Label>
        <Input 
          id="event_time" 
          name="time" 
          type="time" 
          value={time} 
          onChange={(e) => setTime(e.target.value)}
          disabled={!isFieldEditable('event_datetime')} 
        />
      </div>
    </div>
  );
}