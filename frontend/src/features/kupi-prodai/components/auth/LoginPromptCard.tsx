"use client";
import { motion } from "framer-motion";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import { User, Sparkles } from "lucide-react";
import { AnimatedCard } from "@/components/organisms/animations/AnimatedCard";
import { itemVariants } from "@/utils/animationVariants";

interface LoginPromptCardProps {
  onLogin: () => void;
}

export function LoginPromptCard({ onLogin }: LoginPromptCardProps) {
  return (
    <AnimatedCard
      variants={itemVariants}
      className="border-2 border-dashed border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 hover:border-primary/40 overflow-hidden group"
      hasFloatingBackground
      backgroundEffects={
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      }
    >
      <CardHeader className="text-center pb-4">
        <motion.div 
          className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 relative"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <User className="h-8 w-8 text-primary" />
          
          {/* Pulsing ring effect */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
          <CardTitle className="text-xl font-bold">Ready to Sell?</CardTitle>
        
        <CardDescription className="text-base">
          Join our marketplace and start selling your items today
        </CardDescription>
      </CardHeader>
      
      <CardContent className="text-center">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button 
            onClick={onLogin} 
            size="lg"
            className="relative w-full sm:w-auto px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 group/button overflow-hidden"
          >
                         
            
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ x: 2 }}
              transition={{ type: "spring", stiffness: 50, damping: 50 }}
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-5 w-5" />
              </motion.div>
              Login to Start Selling
            </motion.div>
          </Button>
        </motion.div>
      </CardContent>
    </AnimatedCard>
  );
}