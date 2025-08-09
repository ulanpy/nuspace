"use client";
import { motion } from "framer-motion";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/card";
import { MessageCircle } from "lucide-react";
import { AnimatedCard } from "@/components/organisms/animations/AnimatedCard";
import { itemVariants } from "@/utils/animationVariants";

export function TelegramPromptCard() {
  return (
    <AnimatedCard
      variants={itemVariants}
      className="border-2 border-dashed border-white-200 bg-gradient-to-r from-white-50 to-white-100 dark:from-white-900/20 dark:to-white-800/20 dark:border-white-800 hover:border-white-300 dark:hover:border-white-700 overflow-hidden group"
      hasFloatingBackground
    >
      <CardHeader className="text-center pb-4">
        <motion.div 
          className="w-16 h-16 rounded-full bg-white-100 dark:bg-yellow-900/40 flex items-center justify-center mx-auto mb-4 relative"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <MessageCircle className="h-8 w-8 text-white-600 dark:text-white-400" />
          </motion.div>
          
          {/* Notification dot */}
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.7, 1]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
        
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <CardTitle className="text-xl text-white-800 dark:text-white-200">
            Connect Telegram
          </CardTitle>
        </motion.div>
        
        <div className="max-w-sm mx-auto">
          <CardDescription className="text-white-600 dark:text-white-400 text-sm opacity-70">
            Link your Telegram account to enable secure communication with buyers. 
            This helps buyers contact you directly and securely about your listings
          </CardDescription>
        </div>
      </CardHeader>
      
      {/* <CardContent className="text-center">
        <motion.p 
          className="text-sm text-white-600 dark:text-white-400 mb-4"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          This helps buyers contact you directly and securely about your listings
        </motion.p>

      </CardContent> */}
    </AnimatedCard>
  );
}