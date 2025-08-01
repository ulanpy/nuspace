import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { Dispatch, SetStateAction } from "react";

export function FilterCard({
  eventPolicies,
  selectedPolicy,
  setSelectedPolicy,
}: {
  eventPolicies: NuEvents.EventPolicy[];
  selectedPolicy: SetStateAction<NuEvents.EventPolicy | null>;
  setSelectedPolicy: Dispatch<SetStateAction<NuEvents.EventPolicy | null>>;
}) {
  return (
    <Card className="p-3">
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-medium mb-1.5">Event Policy</h3>
          <div className="flex flex-wrap gap-1.5">
            {eventPolicies.map((policy) => (
              <Badge
                key={policy}
                variant={selectedPolicy === policy ? "default" : "outline"}
                className="cursor-pointer text-[10px] px-2 py-0 h-5"
                onClick={() =>
                  setSelectedPolicy(selectedPolicy === policy ? null : policy)
                }
              >
                {policy === "open"
                  ? "Open Entry"
                  : policy === "free_ticket"
                    ? "Free Ticket"
                    : "Paid Ticket"}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {}}
          >
            Reset
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => {}}>
            Apply
          </Button>
        </div>
      </div>
    </Card>
  );
}
