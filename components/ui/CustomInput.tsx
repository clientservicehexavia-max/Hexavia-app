import React, { type ComponentRef, forwardRef } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  type TextInputProps,
} from "react-native";

export interface CustomTextInputProps extends TextInputProps {}

/**
 * CustomTextInput (AlignedTextInput)
 *
 * Universal, cross-platform aligned TextInput component for Custom.
 * Automatically resolves iOS and Android font baseline and placeholder alignment quirks:
 * - Resets asymmetrical platform vertical padding (paddingTop: 0, paddingBottom: 0).
 * - Enforces Android vertical centering (textAlignVertical: 'center', includeFontPadding: false).
 * - Avoids line-height conflicts on single-line inputs that cause text descenders ('g', 'j', 'p', 'q', 'y')
 *   to clip on iOS or placeholders to be pushed off-center.
 * - Defaults to Custom brand typography and primary text color.
 * - Supports forwardRef for seamless focus/blur management.
 */
export const CustomTextInput = forwardRef<
  ComponentRef<typeof TextInput>,
  CustomTextInputProps
>(({ style, placeholderTextColor = "#9CA3AF", ...rest }, ref) => {
  return (
    <TextInput
      ref={ref}
      style={[styles.input, style]}
      placeholderTextColor={placeholderTextColor}
      {...rest}
    />
  );
});

CustomTextInput.displayName = "CustomTextInput";

// Export alias for developer convenience
export const AlignedTextInput = CustomTextInput;

const styles = StyleSheet.create({
  input: {
    fontFamily: "KumbhSans-Regular",
    fontSize: 15,
    color: "#111827",
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    textAlignVertical: "center",
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
});

export default CustomTextInput;
