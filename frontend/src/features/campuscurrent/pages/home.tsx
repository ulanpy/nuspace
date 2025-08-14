"use client";

import { useState } from "react";
import { SubspacePosts } from "@/features/campuscurrent/subspace/components/SubspacePosts";
import { Button } from "@/components/atoms/button";
import { SubspacePostModal } from "@/features/campuscurrent/subspace/components/SubspacePostModal";
import { Plus } from "lucide-react";
import MotionWrapper from "@/components/atoms/motion-wrapper";

// Main component
export default function NUEventsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <MotionWrapper>
      <div className="w-full overflow-x-hidden">
        {/* Subspace Section */}
        <section className="py-6">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-6 space-y-6">
            {/* Posts Feed */}
            <SubspacePosts />
          </div>
        </section>

        {/* Create Post Modal */}
        <SubspacePostModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />

        {/* Floating Action Button - Above Bottom Navigation */}
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-[9999] p-0 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </MotionWrapper>
  );
}
