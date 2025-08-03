import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/data/routes";
import { Community } from "@/features/campuscurrent/types/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";

export function CommunityCard({ community }: { community: Community }) {
  return (
    <Card
      key={community.id}
      className="overflow-hidden hover:shadow-md transition-shadow"
    >
      <CardHeader className="p-4 flex flex-row gap-4 items-center">
        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
          {/* <img
            //  src={community.media[0].url}   ULAN TRY TO FIX THIS 
             alt={community.name}
             className="object-cover w-full h-full"
             /> */}
        </div>
        <div>
          <h1 className="font-semibold">{community.name}</h1>
          <div className="flex mt-4 gap-1 flex-wrap">
          <Badge variant="outline">{community.category}</Badge>
          <Badge variant="outline">{community.type}</Badge>
        <Badge variant="secondary">Recruitment: {community.recruitment_status}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {community.description}
        </p>
        {/* <div className="flex mt-3 gap-1 text-sm text-muted-foreground">
        </div> */}
      </CardContent>
      <Link
        to={ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(
          community.id.toString()
        )}
      >
        <CardFooter className="p-4 pt-0">
          <Button className="w-full">View Club</Button>
        </CardFooter>
      </Link>
    </Card>
    // </>
  );
}
