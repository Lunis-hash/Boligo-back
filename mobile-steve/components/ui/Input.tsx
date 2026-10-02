import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
}

export default function Input({
  label,
  hint,
  error,
  secureTextEntry,
  style,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.text.primary40}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword((prev) => !prev)}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOff size={20} color={Colors.text.primary40} />
            ) : (
              <Eye size={20} color={Colors.text.primary40} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    width: '100%',
  },
  label: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.body.fontSize,
    color: Colors.text.primary100,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral.white,
    paddingHorizontal: Spacing.md,
    height: 50,
  },
  inputWrapperError: {
    borderColor: Colors.primary.red,
  },
  input: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.body.fontSize,
    color: Colors.text.primary100,
    height: '100%',
  },
  eyeBtn: {
    padding: Spacing.xs,
  },
  hintText: {
    fontSize: 12,
    color: Colors.text.primary40,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.primary.red,
    marginTop: 4,
  },
});
