import { navTabs } from "@/features/campuscurrent/types/nav-tabs";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { ROUTES } from "@/data/routes";
import { Button } from "@/components/atoms/button";
import { Calendar, MapPin, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { useEffect, useMemo, useState } from "react";
import { useEvents } from "@/features/campuscurrent/events/hooks/useEvents";
import { useCommunities } from "@/features/campuscurrent/communities/hooks/use-communities";
import { Community } from "@/features/campuscurrent/types/types";
import { Media, MediaFormat } from "@/features/media/types/types";
import { CommunityModal } from "@/features/campuscurrent/communities/components/CommunityModal";
import { EventModal } from "@/features/campuscurrent/events/components/EventModal";
import profilePlaceholder from "@/assets/svg/profile-placeholder.svg";

// Dynamic import of all webp files in the hero_assets directory
const heroImageModules = import.meta.glob(
  "../../../assets/images/hero_assets/*.webp",
  { eager: true }
);

// Process the imported modules to get the URLs
const heroImages = Object.entries(heroImageModules)
  .sort(([a], [b]) => {
    // Sort by filename to ensure consistent order (1.webp, 2.webp, etc.)
    const aNum = parseInt(a.match(/(\d+)\.webp$/)?.[1] || "0");
    const bNum = parseInt(b.match(/(\d+)\.webp$/)?.[1] || "0");
    return aNum - bNum;
  })
  .map(([path, module], index) => {
    const url = (module as any).default;
    return {
      src: url,
      alt: `Campus Hero Image ${index + 1}`,
    };
  });

type Slide = {
  key: string | number;
  render: () => JSX.Element;
};

function getMediaByFormat(mediaList: Media[] | undefined, format: MediaFormat) {
  return (mediaList || []).find((m) => m.media_format === format);
}

function HeroImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const fallback = "src/assets/images/welcome-nu-space.jpg";
  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(fallback)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}

function AutoCarousel({
  slides,
  intervalMs = 2500,
}: {
  slides: Slide[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [slides.length, intervalMs, paused]);

  if (!slides || slides.length === 0) return null;

  return (
    <div
      className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/10 shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0" aria-roledescription="carousel">
        <div
          className="flex w-full h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s) => (
            <div key={s.key} className="min-w-full h-full">
              {s.render()}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i === index ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCreateCommunityModalOpen, setIsCreateCommunityModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);

  // Store scroll position and previous path for tab navigation
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  const [previousPath, setPreviousPath] = useState(location.pathname);

  // Scroll to top on route change unless there's a hash or it's a tab navigation
  useEffect(() => {
    if (!location.hash) {
      // Check if both current and previous paths are tab routes
      const isCurrentTabRoute = navTabs.some(tab => 
        location.pathname === tab.path || location.pathname.startsWith(tab.path)
      );
      
      const isPreviousTabRoute = navTabs.some(tab => 
        previousPath === tab.path || previousPath.startsWith(tab.path)
      );
      
      // Only restore scroll position if we're navigating between tabs
      if (isCurrentTabRoute && isPreviousTabRoute && location.pathname !== previousPath) {
        // For tab-to-tab navigation, restore saved scroll position
        setTimeout(() => {
          window.scrollTo(0, savedScrollPosition);
        }, 0);
      } else {
        // For other route changes, scroll to top
        window.scrollTo(0, 0);
      }
    }
    
    // Update previous path
    setPreviousPath(location.pathname);
  }, [location.pathname, previousPath, savedScrollPosition]);

  // Save scroll position before navigation
  const handleTabChange = (value: string) => {
    // Save current scroll position before navigating
    setSavedScrollPosition(window.scrollY);
    navigate(value);
  };

  const currentPath = location.pathname;
  // Choose the most specific matching tab (longest path that prefixes currentPath)
  const activeTabPath =
    navTabs
      .filter(
        (tab) => currentPath === tab.path || currentPath.startsWith(tab.path)
      )
      .sort((a, b) => b.path.length - a.path.length)[0]?.path ||
    navTabs[0].path;

  const isHome = activeTabPath === ROUTES.APPS.CAMPUS_CURRENT.ROOT;
  const isEvents = activeTabPath === ROUTES.APPS.CAMPUS_CURRENT.EVENTS;
  const isCommunities =
    activeTabPath === ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES;

  // Hide hero and tabs on single/detail pages
  const isEventDetail = currentPath.startsWith(
    ROUTES.APPS.CAMPUS_CURRENT.EVENT.DETAIL.replace(":id", "")
  );
  const isCommunityDetail = currentPath.startsWith(
    ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL.replace(":id", "")
  );
  const isDetailPage = isEventDetail || isCommunityDetail;

  // Data for slides
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { events: eventsData } = useEvents({ start_date: todayStr, size: 3 });
  const { communities } = useCommunities();

  const eventSlides: Slide[] = useMemo(() => {
    const list = eventsData?.events?.slice(0, 3) || [];
    return list.map((e) => ({
      key: e.id,
      render: () => {
        const poster = e.media?.[0]?.url || "/placeholder.svg";
        const dateStr = new Date(e.start_datetime).toLocaleDateString();
        const hostName =
          e.scope === "community"
            ? e.community?.name || ""
            : `${e.creator?.name || ""} ${e.creator?.surname || ""}`;
        return (
          <Link
            to={ROUTES.APPS.CAMPUS_CURRENT.EVENT.DETAIL_FN(String(e.id))}
            className="block w-full h-full"
          >
            <div className="relative w-full h-full bg-black/10">
              <div className="flex h-full">
                <div className="w-1/2 relative">
                  <HeroImage src={poster} alt={e.name} />
                </div>
                <div className="w-1/2 p-4 md:p-6 flex flex-col justify-center text-white bg-black/20 gap-2">
                  <h3 className="text-lg md:text-xl font-semibold line-clamp-2">
                    {e.name}
                  </h3>
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{dateStr}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{e.place}</span>
                  </div>
                  {hostName && (
                    <div className="mt-1 text-xs md:text-sm opacity-80">
                      by {hostName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      },
    }));
  }, [eventsData]);

  const communitySlides: Slide[] = useMemo(() => {
    const items: Community[] = communities?.communities?.slice(0, 3) || [];
    return items.map((c) => {
      const banner =
        getMediaByFormat(c.media, MediaFormat.banner)?.url ||
        profilePlaceholder;
      const profile =
        getMediaByFormat(c.media, MediaFormat.profile)?.url ||
        profilePlaceholder;
      return {
        key: c.id,
        render: () => (
          <Link
            to={ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(String(c.id))}
            className="block w-full h-full"
          >
            <div className="relative w-full h-full">
              <HeroImage src={banner} alt={c.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-3">
                <img
                  src={profile}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "src/assets/images/welcome-nu-space.jpg";
                  }}
                  alt={c.name}
                  className="w-12 h-12 rounded-full border-2 border-white object-cover bg-background"
                />
                <div className="text-white drop-shadow-sm max-w-[100%]">
                  <div className="text-sm opacity-90">
                    {c.category[0].toUpperCase()}
                    {c.category.slice(1)} {c.type}
                  </div>
                  <div className="text-base font-semibold line-clamp-1">
                    {c.name}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ),
      };
    });
  }, [communities]);

  const homeSlides: Slide[] = useMemo(() => {
    // Fallback to a single default image if no hero images are found
    if (heroImages.length === 0) {
      return [
        {
          key: "default",
          render: () => (
            <HeroImage
              src="src/assets/images/welcome-nu-space.jpg"
              alt="Campus Current"
            />
          ),
        },
      ];
    }

    return heroImages.map((heroImage, i) => ({
      key: `home-${i}`,
      render: () => <HeroImage src={heroImage.src} alt={heroImage.alt} />,
    }));
  }, []);

  const hero = isHome
    ? {
        title: "Campus ⚡️ Current",
        description:
          " Discover NU Campus Life. Find events, join communities, and connect with the Nazarbayev University community.",
        bg: "bg-blue-700",
        primary: {
          label: "Explore Events",
          onClick: () => navigate(ROUTES.APPS.CAMPUS_CURRENT.EVENTS),
        },
        secondary: {
          label: "Discover Communities",
          onClick: () => navigate(ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES),
        },
        slides: homeSlides,
      }
    : isEvents
    ? {
        title: "Events you don't want to miss",
        description: "Browse and track upcoming events across NU campus.",
        bg: "bg-purple-700",
        primary: {
          label: "Explore Events",
          onClick: () => {
            if (isEvents) {
              document
                .getElementById("events-section")
                ?.scrollIntoView({ behavior: "smooth" });
            } else {
              navigate(`${ROUTES.APPS.CAMPUS_CURRENT.EVENTS}#events-section`);
            }
          },
        },
        secondary: {
          label: (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Create Event
            </div>
          ),
          onClick: () => setIsCreateEventModalOpen(true),
        },
        slides: eventSlides,
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
              document
                .getElementById("communities-section")
                ?.scrollIntoView({ behavior: "smooth" });
            } else {
              navigate(
                `${ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES}#communities-section`
              );
            }
          },
        },
        secondary: {
          label: (
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Community
            </div>
          ),
          onClick: () => setIsCreateCommunityModalOpen(true),
        },
        slides: communitySlides,
      };

  return (
    <div className="space-y-6 pb-20">
      {!isDetailPage && (
        <>
          {/* Route-aware full-width hero */}
          <div className="-mx-3 sm:-mx-4">
            <section
              className={`w-screen relative left-1/2 right-1/2 -mx-[50vw] -mt-4 sm:-mt-6 py-12 md:py-20 text-white ${hero.bg}`}
            >
              <div className="container px-4 md:px-6">
                <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
                  {/* Mobile: carousel on top */}
                  <div className="lg:hidden -mt-2 mb-2">
                    <AutoCarousel slides={hero.slides} />
                  </div>

                  <div className="space-y-4">
                    <h1 className="text-3xl md:text-5xl font-bold">
                      {hero.title}
                    </h1>
                    <p className="text-lg md:text-xl text-white/90">
                      {hero.description}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        size="lg"
                        className="bg-yellow-500 text-black hover:bg-yellow-600"
                        onClick={hero.primary.onClick}
                      >
                        {hero.primary.label}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-white text-black hover:bg-white/10 dark:text-white dark:border-white"
                        onClick={hero.secondary.onClick}
                      >
                        {hero.secondary.label}
                      </Button>
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <AutoCarousel slides={hero.slides} />
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
                onValueChange={handleTabChange}
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

      {/* Main Content */}
      <Outlet />

      {/* Create Community Modal */}
      <CommunityModal
        isOpen={isCreateCommunityModalOpen}
        onClose={() => setIsCreateCommunityModalOpen(false)}
        isEditMode={false}
      />

      {/* Create Event Modal */}
      <EventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        isEditMode={false}
      />
    </div>
  );
}
