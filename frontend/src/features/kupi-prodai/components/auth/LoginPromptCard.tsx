"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import { User } from "lucide-react";

interface LoginPromptCardProps {
  onLogin: () => void;
}

export function LoginPromptCard({ onLogin }: LoginPromptCardProps) {
  return (
    <Card
      className="border-2 border-dashed border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 hover:border-primary/40 overflow-hidden group"
    >
      <CardHeader className="text-center pb-4">
          <User className="justify-center mx-auto h-8 w-8 text-primary" />
          <CardTitle className="text-lg text-white-800 dark:text-white-200">Ready to Sell?</CardTitle>
        
        <CardDescription className="text-sm">
          Join our marketplace and start selling your items today
        </CardDescription>
      </CardHeader>
      
      <CardContent className="text-center">
          <Button 
            onClick={onLogin} 
            size="lg"
            variant="outline"
          >
            Login to Start Selling
          </Button>
  
      </CardContent>
    </Card>
  );
}