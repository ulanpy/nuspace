"use client";

import { ArrowRight, Calendar, Users, Sparkles, Library, Shield, Phone } from "lucide-react";
import { ROUTES } from "@/data/routes";
import { Button } from "@/components/atoms/button";
import { useUser } from "@/hooks/use-user";
import { FeatureCarousel } from "@/components/molecules/feature-carousel";
import eventImg1 from "@/assets/images/event_pics/1.webp";
import eventImg2 from "@/assets/images/event_pics/2.webp";
import eventImg3 from "@/assets/images/event_pics/3.webp";
import eventImg4 from "@/assets/images/event_pics/4.webp";
import eventImg5 from "@/assets/images/event_pics/5.webp";

const eventImages = [eventImg1, eventImg2, eventImg3, eventImg4, eventImg5];

export default function LandingPage() {
    const { login } = useUser();

    const scrollToLogin = () => {
        const element = document.getElementById('login-cta');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const features = [
        {
            icon: <Library className="w-12 h-12" />,
            title: "Courses",
            description: "Manage your classes, view detailed grade statistics, build your perfect schedule, and track your degree audit progress.",
            link: ROUTES.COURSES,
            gradient: "from-green-500/20 to-green-600/10",
            iconColor: "text-green-500",
        },
        {
            icon: <Calendar className="w-12 h-12" />,
            title: "Events",
            description: "Stay updated with campus events, club activities, and community gatherings. Never miss out on what's happening.",
            link: ROUTES.EVENTS.ROOT,
            gradient: "from-orange-500/20 to-orange-600/10",
            iconColor: "text-orange-500",
        },
        {
            icon: <Users className="w-12 h-12" />,
            title: "Communities",
            description: "Connect with student organizations and find your community at NU. Join clubs that match your interests.",
            link: ROUTES.COMMUNITIES.ROOT,
            gradient: "from-blue-500/20 to-blue-600/10",
            iconColor: "text-blue-500",
        },
        {
            icon: <Phone className="w-12 h-12" />,
            title: "Contacts",
            description: "Find important university contacts quickly when you need it most.",
            link: ROUTES.CONTACTS,
            gradient: "from-cyan-500/20 to-cyan-600/10",
            iconColor: "text-cyan-500",
        },
        {
            icon: <Shield className="w-12 h-12" />,
            title: "Sgotinish",
            description: "Your direct line to Student Government. Submit requests, file appeals, and make your voice heard.",
            link: ROUTES.SGOTINISH.ROOT,
            gradient: "from-pink-500/20 to-pink-600/10",
            iconColor: "text-pink-500",
        },
    ];

    return (
        <div className="flex flex-col">
            <section className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
                <div className="relative max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                        <Sparkles className="w-4 h-4" />
                        Built by students, for students
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        Your all-in-one platform for{" "}
                        <span className="text-primary">university life</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                        Nuspace brings together everything you need at Nazarbayev University —
                        academics, events, communities, and more — in one beautiful, unified experience.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            size="lg"
                            onClick={scrollToLogin}
                            className="text-base px-8 py-6 gap-2"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            asChild
                            className="text-base px-8 py-6"
                        >
                            <a
                                href="https://github.com/ulanpy/nuspace"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View on GitHub
                            </a>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Sections using Alternating Layout */}
            <div className="flex flex-col gap-0">
                {features.map((feature, index) => (
                    <section
                        key={feature.title}
                        className={`py-24 px-4 ${index % 2 === 1 ? "bg-background" : "bg-muted/30"
                            }`}
                    >
                        <div className="max-w-6xl mx-auto">
                            <div className={`flex flex-col md:flex-row items-center gap-12 ${index % 2 === 0 ? "md:flex-row-reverse" : ""
                                }`}>
                                {/* Content Side */}
                                <div className="flex-1 space-y-6 text-center md:text-left">
                                    <h2 className="text-3xl sm:text-4xl font-bold">
                                        {feature.title}
                                    </h2>
                                    <p className="text-lg text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>

                                {/* Visual Side */}
                                <div className="flex-1 w-full">
                                    {feature.title === "Events" ? (
                                        <div className={`aspect-video rounded-3xl overflow-hidden shadow-2xl border bg-gradient-to-br ${feature.gradient} p-1`}>
                                            <div className="w-full h-full rounded-[1.25rem] overflow-hidden bg-background relative">
                                                <FeatureCarousel images={eventImages} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`aspect-video rounded-3xl overflow-hidden shadow-2xl border bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}>
                                            <div className="bg-background/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm">
                                                <div className={`${feature.iconColor} opacity-50`}>
                                                    {feature.icon}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                ))}
            </div>

            {/* CTA Section */}
            <section id="login-cta" className="py-28 px-4 bg-muted/50">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                        Ready to get started?
                    </h2>
                    <p className="text-muted-foreground mb-8">
                        Join thousands of NU students already using Nuspace.
                    </p>
                    <Button size="lg" onClick={login} className="gap-2">
                        Login with NU Account
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 text-center text-sm text-muted-foreground border-t bg-muted/30">
                <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p>© {new Date().getFullYear()} Nuspace. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href={ROUTES.PRIVACY_POLICY} className="hover:text-foreground transition-colors">
                            Privacy Policy
                        </a>
                        <a href="https://github.com/ulanpy/nuspace" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                            GitHub
                        </a>
                    </div>
                </div>
            </footer>
        </div >
    );
}