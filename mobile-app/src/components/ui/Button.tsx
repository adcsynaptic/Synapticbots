import React from 'react';
import { Platform, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { useThemeTokens } from '../../theme/useThemeTokens';
import { neon } from '../../theme/web-tokens';

type Variant = 'primary' | 'ghost' | 'danger';

export function AppButton({
  title,
  onPress,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
}) {
  const { colors } = useThemeTokens();

  const style = [styles.base, variantStyles[variant], disabled ? styles.disabled : null] as (ViewStyle | false)[];

  const textColor =
    variant === 'danger' ? neon.danger : variant === 'ghost' ? colors.textSecondary : neon.cyan;

  const borderColor =
    variant === 'danger' ? 'rgba(255, 59, 92, 0.3)' : variant === 'ghost' ? 'rgba(0, 229, 255, 0.08)' : 'rgba(0, 229, 255, 0.3)';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        ...style,
        { backgroundColor: pressed && !disabled ? pressedBg(variant) : undefined, borderColor },
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

function pressedBg(variant: Variant) {
  if (variant === 'danger') return 'rgba(255, 59, 92, 0.18)';
  if (variant === 'ghost') return 'rgba(255, 255, 255, 0.07)';
  return 'rgba(0, 229, 255, 0.18)';
}

const variantStyles: Record<Variant, ViewStyle> = {
  primary: {
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: `0 0 14px ${neon.cyan}` } as any)
      : {
          shadowColor: neon.cyan,
          shadowOpacity: 0.15,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  ghost: {
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  danger: {
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 92, 0.3)',
    backgroundColor: 'rgba(255, 59, 92, 0.1)',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: `0 0 14px ${neon.danger}` } as any)
      : {
          shadowColor: neon.danger,
          shadowOpacity: 0.15,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});

