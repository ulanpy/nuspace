import { usePersistentState } from "@/hooks/use-persistent-state";

export const useKupiProdaiTab = () => {
  return usePersistentState<Types.ActiveTab>(
    "kupi-prodai-tab",
    "buy"
  );
};