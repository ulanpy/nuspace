"use client";
import { useUser } from "@/hooks/use-user";
import { AuthRequiredAlert, TelegramRequiredAlert } from "@/components/molecules/auth-required-alert";
import { ProductCreateForm } from "@/components/organisms/kp/product-create-form";
import { useCreateProduct } from "@/modules/kupi-prodai/api/hooks/useCreateProduct";
import { useListingState } from "@/context/ListingContext";

export function SellSection() {
    const { user, login } = useUser();
    const isTelegramLinked = user?.tg_id || false;
    const { handleCreate } = useCreateProduct();
    const { uploadProgress } = useListingState();

    return (
        <div className="space-y-4 pt-4">
            {!user ? (
                <AuthRequiredAlert onClick={() => login()} />
            ) : !isTelegramLinked ? (
                <TelegramRequiredAlert />
            ) : (
                <ProductCreateForm
                    handleCreate={handleCreate}
                    isTelegramLinked={isTelegramLinked}
                    uploadProgress={uploadProgress}
                />
            )}
        </div>
    );
}



