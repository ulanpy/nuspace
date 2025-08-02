"use client";
import { useUser } from "@/hooks/use-user";
import { ProductCreateForm } from "@/modules/kupi-prodai/components/product-create-form";
import { useCreateProduct } from "@/modules/kupi-prodai/api/hooks/useCreateProduct";
import { useListingState } from "@/context/ListingContext";
import { motion } from "framer-motion";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import { User, MessageCircle, Sparkles } from "lucide-react";
import { FloatingElements } from "@/components/animations/FloatingElements";
import { AnimatedCard } from "@/components/animations/AnimatedCard";
import { containerVariants, itemVariants } from "@/utils/animationVariants";

export function SellSection() {
    const { user, login } = useUser();
    const isTelegramLinked = user?.tg_id || false;
    const { handleCreate } = useCreateProduct();
    const { uploadProgress } = useListingState();



    return (
        <div className="relative overflow-hidden">
            <FloatingElements />
            
            <motion.div 
                className="relative space-y-6 pt-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
            {!user ? (
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
                        
                        <motion.div
                            animate={{ y: [0, -2, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <CardTitle className="text-xl font-bold">Ready to Sell?</CardTitle>
                        </motion.div>
                        
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
                                onClick={() => login()} 
                                size="lg"
                                className="relative w-full sm:w-auto px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 group/button overflow-hidden"
                            >
                                {/* Button ripple effect */}
                                <motion.div
                                    className="absolute inset-0 bg-white/20 rounded-md opacity-0 group-hover/button:opacity-100"
                                    animate={{
                                        scale: [0, 1],
                                        opacity: [1, 0]
                                    }}
                                    transition={{
                                        duration: 0.6,
                                        repeat: Infinity,
                                        ease: "easeOut"
                                    }}
                                />
                                
                                <motion.div
                                    className="flex items-center gap-2"
                                    whileHover={{ x: 2 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
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
            ) : !isTelegramLinked ? (
                <AnimatedCard
                    variants={itemVariants}
                    className="border-2 border-dashed border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 dark:border-yellow-800 hover:border-yellow-300 dark:hover:border-yellow-700 overflow-hidden group"
                    hasFloatingBackground
                    backgroundEffects={
                        <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-yellow-200/30 via-transparent to-yellow-200/30"
                            animate={{
                                x: ['-100%', '100%'],
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
                            className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center mx-auto mb-4 relative"
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
                                <MessageCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
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
                            <CardTitle className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                                Connect Telegram
                            </CardTitle>
                        </motion.div>
                        
                        <CardDescription className="text-yellow-700 dark:text-yellow-300 text-base">
                            Link your Telegram account to enable secure communication with buyers
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="text-center">
                        <motion.p 
                            className="text-sm text-yellow-600 dark:text-yellow-400 mb-4"
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                            This helps buyers contact you directly and securely about your listings
                        </motion.p>
                        
                        {/* Progress indicator */}
                        <motion.div className="flex justify-center space-x-2 mt-4">
                            {[0, 1, 2].map((index) => (
                                <motion.div
                                    key={index}
                                    className="w-2 h-2 bg-yellow-400 rounded-full"
                                    animate={{ 
                                        scale: [1, 1.5, 1],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: index * 0.2,
                                        ease: "easeInOut"
                                    }}
                                />
                            ))}
                        </motion.div>
                    </CardContent>
                </AnimatedCard>
            ) : (
                <motion.div variants={itemVariants}>
                    <ProductCreateForm
                        handleCreate={handleCreate}
                        isTelegramLinked={isTelegramLinked}
                        uploadProgress={uploadProgress}
                    />
                </motion.div>
            )}
            </motion.div>
        </div>
    );
}



