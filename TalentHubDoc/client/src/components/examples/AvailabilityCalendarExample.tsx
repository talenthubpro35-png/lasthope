import { AvailabilityCalendar } from "../AvailabilityCalendar";

export default function AvailabilityCalendarExample() {
  return (
    <AvailabilityCalendar
      onSave={(data) => console.log("Availability saved:", data)}
    />
  );
}
