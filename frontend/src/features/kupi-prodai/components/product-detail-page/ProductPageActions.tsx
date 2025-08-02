"use client";

import { Button } from "@/components/atoms/button";
import { ExternalLink, Flag } from "lucide-react";

interface ProductPageActionsProps {
    initiateContactWithSeller: () => void;
    isContactLoading: boolean;
    setShowReportModal: (show: boolean) => void;
}

export function ProductPageActions({
    initiateContactWithSeller,
    isContactLoading,
    setShowReportModal
}: ProductPageActionsProps) {
    return (
        <div className="flex flex-wrap gap-2 mt-6">
            <Button
                variant="outline"
                className="flex items-center gap-1"
                onClick={initiateContactWithSeller}
                disabled={isContactLoading}
            >
                <ExternalLink className="h-4 w-4" />
                <span>
                    {isContactLoading ? "Loading..." : "Contact on Telegram"}
                </span>
            </Button>

            <Button
                variant="outline"
                className="flex items-center gap-1 text-destructive"
                onClick={() => setShowReportModal(true)}
            >
                <Flag className="h-4 w-4" />
                <span>Report</span>
            </Button>
        </div>
    );
} 