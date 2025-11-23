"use client";

import { Modal } from "@/components/atoms/modal";
import { Button } from "@/components/atoms/button";
import { ExternalLink } from "lucide-react";

interface ContactSellerModalProps {
    isOpen: boolean;
    onClose: () => void;
    telegramLink: string;
}

export function ContactSellerModal({ isOpen, onClose, telegramLink }: ContactSellerModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Contact Seller"
            description="Click the button below to contact the seller on Telegram"
        >
            <div className="space-y-4 py-2 flex flex-col items-center">
                <p className="text-sm text-muted-foreground">
                    You will be redirected to Telegram to chat with the seller about
                    this item
                </p>

                <Button
                    className="flex items-center gap-2"
                    onClick={() => {
                        window.open(telegramLink, "_blank");
                        onClose();
                    }}
                >
                    <ExternalLink className="h-4 w-4" />
                    Open in Telegram
                </Button>
            </div>
        </Modal>
    );
} 