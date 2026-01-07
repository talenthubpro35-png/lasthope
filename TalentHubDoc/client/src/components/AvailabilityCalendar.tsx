import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AvailabilityCalendarProps {
  onSave?: (availability: AvailabilityData) => void;
  initialData?: AvailabilityData | null;
}

interface AvailabilityData {
  startDate: string;
  preferences: {
    fullTime: boolean;
    partTime: boolean;
    contract: boolean;
    remote: boolean;
    hybrid: boolean;
    onsite: boolean;
  };
  weeklyHours: string;
  timezone: string;
}

export function AvailabilityCalendar({ onSave, initialData }: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<AvailabilityData>(
    initialData || {
      startDate: "immediately",
      preferences: {
        fullTime: true,
        partTime: false,
        contract: true,
        remote: true,
        hybrid: true,
        onsite: false,
      },
      weeklyHours: "40",
      timezone: "PST",
    }
  );

  const togglePreference = (key: keyof typeof availability.preferences) => {
    setAvailability({
      ...availability,
      preferences: {
        ...availability.preferences,
        [key]: !availability.preferences[key],
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Calendar className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg">Availability Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>When can you start?</Label>
          <Select
            value={availability.startDate}
            onValueChange={(value) => setAvailability({ ...availability, startDate: value })}
          >
            <SelectTrigger data-testid="select-start-date">
              <SelectValue placeholder="Select availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediately">Immediately</SelectItem>
              <SelectItem value="1-week">Within 1 week</SelectItem>
              <SelectItem value="2-weeks">Within 2 weeks</SelectItem>
              <SelectItem value="1-month">Within 1 month</SelectItem>
              <SelectItem value="2-months">Within 2 months</SelectItem>
              <SelectItem value="3-months">3+ months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <Label>Employment Preferences</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="fullTime" className="font-normal">Full-time</Label>
              <Switch
                id="fullTime"
                checked={availability.preferences.fullTime}
                onCheckedChange={() => togglePreference("fullTime")}
                data-testid="switch-fulltime"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="partTime" className="font-normal">Part-time</Label>
              <Switch
                id="partTime"
                checked={availability.preferences.partTime}
                onCheckedChange={() => togglePreference("partTime")}
                data-testid="switch-parttime"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="contract" className="font-normal">Contract</Label>
              <Switch
                id="contract"
                checked={availability.preferences.contract}
                onCheckedChange={() => togglePreference("contract")}
                data-testid="switch-contract"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Work Location Preferences</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="remote" className="font-normal">Remote</Label>
              <Switch
                id="remote"
                checked={availability.preferences.remote}
                onCheckedChange={() => togglePreference("remote")}
                data-testid="switch-remote"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="hybrid" className="font-normal">Hybrid</Label>
              <Switch
                id="hybrid"
                checked={availability.preferences.hybrid}
                onCheckedChange={() => togglePreference("hybrid")}
                data-testid="switch-hybrid"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="onsite" className="font-normal">On-site</Label>
              <Switch
                id="onsite"
                checked={availability.preferences.onsite}
                onCheckedChange={() => togglePreference("onsite")}
                data-testid="switch-onsite"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Weekly Hours
            </Label>
            <Select
              value={availability.weeklyHours}
              onValueChange={(value) => setAvailability({ ...availability, weeklyHours: value })}
            >
              <SelectTrigger data-testid="select-weekly-hours">
                <SelectValue placeholder="Select hours" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 hours</SelectItem>
                <SelectItem value="20">20 hours</SelectItem>
                <SelectItem value="30">30 hours</SelectItem>
                <SelectItem value="40">40 hours</SelectItem>
                <SelectItem value="40+">40+ hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={availability.timezone}
              onValueChange={(value) => setAvailability({ ...availability, timezone: value })}
            >
              <SelectTrigger data-testid="select-timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PST">Pacific (PST)</SelectItem>
                <SelectItem value="MST">Mountain (MST)</SelectItem>
                <SelectItem value="CST">Central (CST)</SelectItem>
                <SelectItem value="EST">Eastern (EST)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="CET">Central European (CET)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => {
            if (onSave) {
              onSave(availability);
            }
          }}
          data-testid="button-save-availability"
        >
          Update Availability
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Click "Save Profile" at the bottom to save all changes
        </p>
      </CardContent>
    </Card>
  );
}
