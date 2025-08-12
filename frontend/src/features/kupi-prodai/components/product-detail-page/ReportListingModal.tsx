"use client";

import { useState } from "react";
import { Modal } from "@/components/atoms/modal";
import { Button } from "@/components/atoms/button";
import { useToast } from "@/hooks/use-toast";

interface ReportListingModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: number;
}

export function ReportListingModal({ isOpen, onClose, productId }: ReportListingModalProps) {
    const [reportReason, setReportReason] = useState("");
    const { toast } = useToast();

    const handleReport = async () => {
        if (!reportReason.trim()) {
            toast({
                title: "Error",
                description: "Please provide a reason for reporting",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch(`/api/products/${productId}/report`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    product_id: productId,
                    text: reportReason,
                }),
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Report submitted successfully",
                });
                onClose();
                setReportReason("");
            } else {
                throw new Error("Failed to submit report");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to submit report. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Report Listing"
            description="Please explain why you're reporting this listing"
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Reason for reporting</label>
                    <textarea
                        className="w-full p-2 border rounded-md min-h-[100px] bg-background"
                        placeholder="Please explain why you're reporting this listing..."
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleReport}>
                        Report
                    </Button>
                </div>
            </div>
        </Modal>
    );
} 