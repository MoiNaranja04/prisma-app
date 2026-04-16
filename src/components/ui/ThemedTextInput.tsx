import React, { forwardRef, useState } from "react";
import {
  NativeSyntheticEvent,
  Platform,
  StyleProp,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  TextStyle,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

type ThemedTextInputProps = TextInputProps & {
  focusBorderColorLight?: string;
  focusBorderColorDark?: string;
};

const webFocusResetStyle: StyleProp<TextStyle> =
  Platform.OS === "web"
    ? ({
        outlineStyle: "none",
        outlineWidth: 0,
        outlineColor: "transparent",
        boxShadow: "none",
      } as any)
    : null;

const ThemedTextInput = forwardRef<TextInput, ThemedTextInputProps>(
  (
    {
      style,
      onFocus,
      onBlur,
      focusBorderColorLight,
      focusBorderColorDark,
      ...props
    },
    ref,
  ) => {
    const { isDark, colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const focusBorderColor = isDark
      ? (focusBorderColorDark ?? "#E8FFF4")
      : (focusBorderColorLight ?? colors.emerald);

    const handleFocus = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(true);
      onFocus?.(event);
    };

    const handleBlur = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(false);
      onBlur?.(event);
    };

    return (
      <TextInput
        ref={ref}
        {...props}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          style,
          webFocusResetStyle,
          isFocused ? { borderColor: focusBorderColor } : null,
        ]}
      />
    );
  },
);

ThemedTextInput.displayName = "ThemedTextInput";

export default ThemedTextInput;
