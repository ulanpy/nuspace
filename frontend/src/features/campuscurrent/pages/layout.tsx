import { navTabs } from "@/features/campuscurrent/types/nav-tabs";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";
import { Button } from "@/components/atoms/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/atoms/tabs";

export function EventsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;
  // Choose the most specific matching tab (longest path that prefixes currentPath)
  const activeTabPath =
    navTabs
      .filter((tab) => currentPath === tab.path || currentPath.startsWith(tab.path))
      .sort((a, b) => b.path.length - a.path.length)[0]?.path || navTabs[0].path;

  const isHome = activeTabPath === ROUTES.APPS.CAMPUS_CURRENT.ROOT;
  const isEvents = activeTabPath === ROUTES.APPS.CAMPUS_CURRENT.EVENTS;
  const isCommunities = activeTabPath === ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES;

  // Hide hero and tabs on single/detail pages
  const isEventDetail = currentPath.startsWith(
    ROUTES.APPS.CAMPUS_CURRENT.EVENT.DETAIL.replace(":id", ""),
  );
  const isCommunityDetail = currentPath.startsWith(
    ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL.replace(":id", ""),
  );
  const isDetailPage = isEventDetail || isCommunityDetail;

  const hero = isHome
    ? {
        title: "Discover NU Campus Life",
        description:
          "Find events, join communities, and connect with the Nazarbayev University community.",
        bg: "bg-blue-700",
        primary: {
          label: "Explore Events",
          onClick: () => navigate(ROUTES.APPS.CAMPUS_CURRENT.EVENTS),
        },
        secondary: {
          label: "Discover Communities",
          onClick: () => navigate(ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES),
        },
      }
    : isEvents
    ? {
        title: "Find and Attend Events",
        description: "Browse and track upcoming events across NU campus.",
        bg: "bg-purple-700",
        primary: {
          label: "Explore Events",
          onClick: () => {
            if (isEvents) {
              document.getElementById("events-section")?.scrollIntoView({ behavior: "smooth" });
            } else {
              navigate(`${ROUTES.APPS.CAMPUS_CURRENT.EVENTS}#events-section`);
            }
          },
        },
        secondary: {
          label: "Create Event",
          onClick: () => navigate(`${ROUTES.APPS.CAMPUS_CURRENT.EVENTS}#create-event`),
        },
      }
    : {
        title: "Be part of the community",
        description:
          "Connect with like-minded peers and make lifelong memories through student clubs and organizations.",
        bg: "bg-orange-700",
        primary: {
          label: "View Communities",
          onClick: () => {
            if (isCommunities) {
              document.getElementById("communities-section")?.scrollIntoView({ behavior: "smooth" });
            } else {
              navigate(`${ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES}#communities-section`);
            }
          },
        },
        secondary: {
          label: "Community Registration Form",
          onClick: () => window.open("https://forms.google.com/your-form-url", "_blank"),
        },
      };

  return (
    <div className="space-y-6 pb-20">
      {!isDetailPage && (
        <>
          {/* Route-aware full-width hero */}
          <div className="-mx-3 sm:-mx-4">
            <section className={`w-screen relative left-1/2 right-1/2 -mx-[50vw] -mt-4 sm:-mt-6 py-12 md:py-20 text-white ${hero.bg}`}>
              <div className="container px-4 md:px-6">
                <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
                  <div className="space-y-4">
                    <h1 className="text-3xl md:text-5xl font-bold">{hero.title}</h1>
                    <p className="text-lg md:text-xl text-white/90">{hero.description}</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        asChild
                        size="lg"
                        className="bg-yellow-500 text-black hover:bg-yellow-600"
                        onClick={hero.primary.onClick}
                      >
                        <Button>{hero.primary.label}</Button>
                      </Button>
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="border-white text-black hover:bg-white/10 dark:text-white dark:border-white"
                        onClick={hero.secondary.onClick}
                      >
                        <Button>{hero.secondary.label}</Button>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Navigation Tabs */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-3 sm:-mx-4">
            <div className="px-3 sm:px-4 py-2">
              <Tabs
                value={activeTabPath}
                onValueChange={(value) => navigate(value)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  {navTabs.map((tab) => (
                    <TabsTrigger key={tab.path} value={tab.path}>
                      {tab.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </>
      )}
      <Outlet />
    </div>
  );
}
