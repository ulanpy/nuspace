"use client";

import { useState } from "react";
import { SubspacePosts } from "@/features/campuscurrent/subspace/components/SubspacePosts";
import { SubspacePostModal } from "@/features/campuscurrent/subspace/components/SubspacePostModal";
import MotionWrapper from "@/components/atoms/motion-wrapper";

export default function SubspacePage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <MotionWrapper>
      <div className="w-full overflow-x-hidden">
        <section className="py-6">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-6 space-y-6">
            <SubspacePosts 
              onCreatePost={() => setIsCreateModalOpen(true)}
            />
          </div>
        </section>

        <SubspacePostModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    </MotionWrapper>
  );
}


