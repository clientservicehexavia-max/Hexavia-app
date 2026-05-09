// hooks/useKeyboardSpacer.ts
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardSpacer() {
    const [h, setH] = useState(0);
    useEffect(() => {
        const show =
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hide =
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
        const s = Keyboard.addListener(show, (e) =>
            setH(e.endCoordinates.height),
        );
        const hdl = Keyboard.addListener(hide, () => setH(0));
        return () => {
            s.remove();
            hdl.remove();
        };
    }, []);
    return h;
}
