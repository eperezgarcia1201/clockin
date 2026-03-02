import { useEffect, type Dispatch, type SetStateAction } from "react";
import { Keyboard, Platform } from "react-native";

export const useKeyboardInsetEffects = (params: {
  setKeyboardInset: Dispatch<SetStateAction<number>>;
}) => {
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const nextInset = event.endCoordinates?.height ?? 0;
      params.setKeyboardInset(nextInset > 0 ? nextInset : 0);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      params.setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [params.setKeyboardInset]);
};
