import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

type Props = PropsWithChildren<{
  disabled?: boolean;
  loading?: boolean;
  tone?: "primary" | "secondary" | "danger";
  onPress: () => void;
}>;

export function PrimaryButton({ children, disabled, loading, tone = "primary", onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === "secondary" && styles.secondary,
        tone === "danger" && styles.danger,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {loading ? <ActivityIndicator color={tone === "secondary" ? colors.text : colors.surface} /> : null}
      <Text style={[styles.label, tone === "secondary" && styles.secondaryLabel]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.brand,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    backgroundColor: colors.brandPressed,
  },
  label: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryLabel: {
    color: colors.text,
  },
});
