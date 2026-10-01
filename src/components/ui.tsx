import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text as RNText,
  type TextProps,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Palette, radius, space, TOUCH, typography, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------- text ----------

export function Text({
  variant = 'body',
  color = 'text',
  style,
  ...rest
}: TextProps & { variant?: TypographyVariant; color?: keyof Palette }) {
  const theme = useTheme();
  return <RNText style={[typography[variant], { color: theme[color] }, style]} {...rest} />;
}

// ---------- icons ----------

export interface IconName {
  ios: string;
  android: string;
}

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const theme = useTheme();
  return (
    <SymbolView
      name={{ ios: name.ios as SFSymbol, android: name.android as AndroidSymbol, web: name.android as AndroidSymbol }}
      size={size}
      tintColor={color ?? theme.text}
      accessibilityElementsHidden
      importantForAccessibility="no"
      fallback={<View style={{ width: size, height: size }} />}
    />
  );
}

export function IconBadge({ name, tone = 'primary', size = 44 }: { name: IconName; tone?: Tone; size?: number }) {
  const theme = useTheme();
  const t = toneColors(theme, tone);
  return (
    <View style={[styles.iconBadge, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.soft }]}>
      <Icon name={name} size={size * 0.48} color={t.strong} />
    </View>
  );
}

// ---------- layout ----------

export function Screen({
  children,
  title,
  subtitle,
  action,
  tabScreen = false,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  tabScreen?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: tabScreen ? insets.top + space.lg : space.lg,
        paddingBottom: insets.bottom + (tabScreen ? 120 : space.xxl),
        paddingHorizontal: space.lg,
        gap: space.lg,
      }}>
      {title ? (
        <View style={styles.screenHeader}>
          <View style={{ flex: 1 }}>
            {subtitle ? (
              <Text variant="overline" color="textMuted">
                {subtitle}
              </Text>
            ) : null}
            <Text variant="display" accessibilityRole="header">
              {title}
            </Text>
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Section({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          {title ? (
            <Text variant="overline" color="textMuted" accessibilityRole="header">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  const base = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [base, pressed && { backgroundColor: theme.surfaceMuted }]}>
      {children}
    </Pressable>
  );
}

export function Row({ children, gap = space.md, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />;
}

// ---------- tones ----------

export type Tone = 'primary' | 'accent' | 'danger' | 'info' | 'neutral';

export function toneColors(theme: Palette, tone: Tone): { strong: string; soft: string } {
  switch (tone) {
    case 'primary':
      return { strong: theme.primary, soft: theme.primarySoft };
    case 'accent':
      return { strong: theme.accent, soft: theme.accentSoft };
    case 'danger':
      return { strong: theme.danger, soft: theme.dangerSoft };
    case 'info':
      return { strong: theme.info, soft: theme.infoSoft };
    default:
      return { strong: theme.textMuted, soft: theme.surfaceMuted };
  }
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const theme = useTheme();
  const t = toneColors(theme, tone);
  return (
    <View style={[styles.pill, { backgroundColor: t.soft }]}>
      <Text variant="label" style={{ color: t.strong }}>
        {label}
      </Text>
    </View>
  );
}

export function Banner({
  tone = 'info',
  icon,
  title,
  body,
  action,
}: {
  tone?: Tone;
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const theme = useTheme();
  const t = toneColors(theme, tone);
  return (
    <View style={[styles.banner, { backgroundColor: t.soft }]} accessibilityRole="summary">
      <Row style={{ alignItems: 'flex-start' }}>
        {icon ? <Icon name={icon} color={t.strong} /> : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" style={{ color: t.strong }}>
            {title}
          </Text>
          {body ? <Text variant="caption">{body}</Text> : null}
        </View>
      </Row>
      {action}
    </View>
  );
}

// ---------- buttons ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  busy,
  compact,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const colors: Record<ButtonVariant, { bg: string; pressed: string; fg: string; border?: string }> = {
    primary: { bg: theme.primary, pressed: theme.primaryPressed, fg: theme.onPrimary },
    secondary: { bg: theme.surface, pressed: theme.surfaceMuted, fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', pressed: theme.surfaceMuted, fg: theme.primary },
    danger: { bg: theme.dangerSoft, pressed: theme.surfaceMuted, fg: theme.danger },
  };
  const c = colors[variant];
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      hitSlop={compact ? 6 : 0}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: pressed ? c.pressed : c.bg, opacity: disabled ? 0.45 : 1 },
        c.border ? { borderWidth: 1, borderColor: c.border } : null,
        style,
      ]}>
      {busy ? <ActivityIndicator color={c.fg} /> : icon ? <Icon name={icon} size={20} color={c.fg} /> : null}
      <Text variant="headline" style={{ color: c.fg, fontSize: compact ? 16 : 17 }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A round icon-only button, e.g. "mark done" on a list row. Always labelled for screen readers. */
export function IconButton({
  icon,
  label,
  onPress,
  tone = 'primary',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: Tone;
}) {
  const theme = useTheme();
  const t = toneColors(theme, tone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? t.strong : t.soft }]}>
      {({ pressed }) => <Icon name={icon} size={22} color={pressed ? theme.surface : t.strong} />}
    </Pressable>
  );
}

// ---------- choices ----------

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected, checked: !!selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : pressed ? theme.surfaceMuted : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}>
      {icon ? <Icon name={icon} size={18} color={selected ? theme.onPrimary : theme.textMuted} /> : null}
      <Text variant="label" style={{ color: selected ? theme.onPrimary : theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipGroup<T extends string | number | null>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string; icon?: IconName }[];
  value: T | undefined;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.chipGroup}>
      {options.map((o) => (
        <Chip key={String(o.value)} label={o.label} icon={o.icon} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

// ---------- form fields ----------

export function FieldLabel({ label, hint, optional }: { label: string; hint?: string; optional?: boolean }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="label">
        {label}
        {optional ? <Text variant="caption" color="textMuted">{'  '}optional</Text> : null}
      </Text>
      {hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Field({
  label,
  hint,
  optional,
  suffix,
  error,
  style,
  ...input
}: TextInputProps & { label: string; hint?: string; optional?: boolean; suffix?: string; error?: string | null }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space.sm }}>
      <FieldLabel label={label} hint={hint} optional={optional} />
      <View
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.danger : focused ? theme.primary : theme.border,
            borderWidth: focused || error ? 2 : 1,
          },
        ]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.textMuted}
          {...input}
          style={[typography.body, { flex: 1, color: theme.text, minHeight: TOUCH }, style]}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
        />
        {suffix ? (
          <Text variant="body" color="textMuted">
            {suffix}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Parse a user-typed decimal ("1,5" or "1.5"); blank → null, garbage → NaN. */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
}

// ---------- states ----------

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: space.xxl, gap: space.md }}>
      <IconBadge name={icon} size={56} />
      <Text variant="title" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text color="textMuted" style={{ textAlign: 'center' }}>
        {body}
      </Text>
      {action}
    </Card>
  );
}

const styles = StyleSheet.create({
  screenHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginBottom: space.xs },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  iconBadge: { alignItems: 'center', justifyContent: 'center' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: 5, borderRadius: radius.pill },
  banner: { borderRadius: radius.md, padding: space.lg, gap: space.md },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonCompact: { minHeight: TOUCH, paddingHorizontal: space.lg },
  iconButton: { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  chip: {
    minHeight: TOUCH,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
});
