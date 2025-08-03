"use client";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { useListingState } from "@/context/ListingContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/atoms/tabs";
import { BuySection } from "@/features/kupi-prodai/components/main-page/BuySection";
import { SellSection } from "@/features/kupi-prodai/components/main-page/SellSection";
import { MyListingsSection } from "@/features/kupi-prodai/components/main-page/my-listings/MyListingsSection";
import { ActiveTab } from "@/features/kupi-prodai/types";
import { AuthenticationGuard } from "../components/auth/AuthenticationGuard";

export default function KupiProdaiPage() {
    const { activeTab, setActiveTab } = useListingState();

    return (
        <MotionWrapper>
            <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col space-y-1 sm:space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold">Kupi&Prodai</h1>
                </div>

                <Tabs
                    defaultValue="buy"
                    className="w-full flex flex-col gap-4"
                    onValueChange={(value) => setActiveTab(value as ActiveTab)}
                    value={activeTab}
                >
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="buy">Buy</TabsTrigger>
                        <TabsTrigger value="sell">Sell</TabsTrigger>
                        <TabsTrigger value="my-listings">My Listings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="buy">
                        <BuySection />
                    </TabsContent>

                    <TabsContent value="sell">
                        <SellSection />
                    </TabsContent>

                    <TabsContent value="my-listings">
                        <AuthenticationGuard>
                            <MyListingsSection />
                        </AuthenticationGuard>
                    </TabsContent>
                </Tabs>
            </div>
        </MotionWrapper>
    );
}
