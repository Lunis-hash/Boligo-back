import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, BorderRadius } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[styles.buttonWrap, isDisabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={[Colors.primary.red, Colors.primary.purple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color={Colors.neutral.white} />
          ) : (
            <>
              {icon}
              <Text style={[styles.textPrimary, textStyle]}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.buttonWrap,
        variant === 'outline' ? styles.outline : styles.secondary,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary.red} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              variant === 'outline' ? styles.textOutline : styles.textSecondary,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonWrap: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    height: 52,
    justifyContent: 'center',
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  secondary: {
    backgroundColor: Colors.neutral.backgroundLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: Colors.primary.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  textPrimary: {
    color: Colors.neutral.white,
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
  },
  textSecondary: {
    color: Colors.text.primary100,
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
  },
  textOutline: {
    color: Colors.primary.red,
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
  },
});

export default Button;
