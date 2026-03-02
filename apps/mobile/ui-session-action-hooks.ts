import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { ScrollView } from "react-native";
import { TIPS_SUBMITTED_STORAGE_KEY } from "./app-config";

export const useUiSessionActions = (params: {
  scrollRef: MutableRefObject<ScrollView | null>;
  setTipsSubmittedByDay: Dispatch<SetStateAction<Record<string, boolean>>>;
}) => {
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      params.scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, [params.scrollRef]);

  const scrollToBottomSoon = useCallback(() => {
    setTimeout(() => {
      params.scrollRef.current?.scrollToEnd({ animated: true });
    }, 90);
  }, [params.scrollRef]);

  const markTipsSubmitted = useCallback(
    (tipKey: string) => {
      params.setTipsSubmittedByDay((prev) => {
        if (prev[tipKey]) {
          return prev;
        }
        const next = { ...prev, [tipKey]: true };
        void AsyncStorage.setItem(TIPS_SUBMITTED_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [params.setTipsSubmittedByDay],
  );

  return {
    scrollToBottom,
    scrollToBottomSoon,
    markTipsSubmitted,
  };
};
