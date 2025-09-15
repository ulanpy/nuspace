"use client";

import { Card,CardDescription, CardHeader, CardTitle } from "@/components/atoms/card";
import { MessageCircle } from "lucide-react";


export function TelegramPromptCard() {
  return (
    <Card
      className="border-2 border-dashed border-primary/20 from-primary/5 to-primary/10 hover:border-primary/40"
    >
      <CardHeader className="text-center pb-4">
            <MessageCircle className="justify-center mx-auto h-8 w-8 text-white-600 dark:text-white-400" />
          <CardTitle className="text-lg text-white-800 dark:text-white-200">
            Connect Telegram
          </CardTitle>

        <div className="max-w-sm mx-auto">
          <CardDescription className="text-white-600 dark:text-white-400 text-sm opacity-70">
            Link your Telegram account to enable secure communication with buyers. 
            This helps buyers contact you directly and securely about your listings
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}