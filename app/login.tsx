import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { palette, radius, spacing, typography } from '@/theme';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { startLogin, verifyOtp, resendOtp, cancelOtp, loading, error, step, pendingEmail, otpChannel } =
    useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState('');
  const autoSubmittedOtp = useRef<string | null>(null);

  const onPassword = async () => {
    await startLogin(email, password);
  };

  const onVerify = async () => {
    const ok = await verifyOtp(otp);
    if (ok) router.replace('/dashboard');
  };

  useEffect(() => {
    if (step !== 'otp') return;
    if (otp.length < 6) {
      autoSubmittedOtp.current = null;
      return;
    }
    if (loading || autoSubmittedOtp.current === otp) return;
    autoSubmittedOtp.current = otp;
    onVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step, loading]);

  const channelText =
    otpChannel === 'slack'
      ? 'We sent a 6-digit code to your Slack.'
      : otpChannel === 'email'
        ? `We sent a 6-digit code to ${pendingEmail}.`
        : 'Enter the 6-digit code we just sent you.';

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero lives inside the scroll so the sheet can overlap it cleanly */}
          <LinearGradient
            colors={palette.inkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { paddingTop: insets.top + spacing.xxl }]}
          >
            <View style={styles.logoBadge}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brand}>Nysonian ERP</Text>
            <Text style={styles.tagline}>Employee Self-Service</Text>
          </LinearGradient>

          <View style={styles.sheetWrap}>
            <View style={styles.sheet}>
            {step === 'credentials' ? (
              <>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Sign in to continue to your dashboard</Text>

                <View style={styles.field}>
                  <Ionicons name="mail-outline" size={18} color={palette.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Work email"
                    placeholderTextColor={palette.textFaint}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.field}>
                  <Ionicons name="lock-closed-outline" size={18} color={palette.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={palette.textFaint}
                    secureTextEntry={!showPw}
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={onPassword}
                  />
                  <Pressable hitSlop={10} onPress={() => setShowPw((s) => !s)}>
                    <Ionicons
                      name={showPw ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={palette.textMuted}
                    />
                  </Pressable>
                </View>

                {error ? <ErrorRow message={error} /> : null}

                <Button label="Continue" onPress={onPassword} loading={loading} />
                <Text style={styles.footnote}>
                  You'll confirm a one-time code sent to your Slack or email.
                </Text>
              </>
            ) : (
              <>
                <Pressable style={styles.back} hitSlop={8} onPress={cancelOtp}>
                  <Ionicons name="chevron-back" size={18} color={palette.primary} />
                  <Text style={styles.backText}>Back</Text>
                </Pressable>

                <Text style={styles.title}>Verify it's you</Text>
                <Text style={styles.subtitle}>{channelText}</Text>

                <View style={styles.field}>
                  <Ionicons name="keypad-outline" size={18} color={palette.textMuted} />
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="• • • • • •"
                    placeholderTextColor={palette.textFaint}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    onSubmitEditing={onVerify}
                  />
                </View>

                {error ? <ErrorRow message={error} /> : null}

                <Button
                  label="Verify & sign in"
                  onPress={onVerify}
                  loading={loading}
                  disabled={otp.length < 4}
                />

                <Pressable style={styles.resend} onPress={resendOtp} hitSlop={6}>
                  <Ionicons name="refresh" size={15} color={palette.primary} />
                  <Text style={styles.resendText}>Resend code</Text>
                </Pressable>
              </>
            )}
            </View>

            <Text style={styles.footer}>Secured by Nysonian · 2-factor sign-in</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <View style={styles.error}>
      <Ionicons name="alert-circle" size={16} color={palette.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl + spacing.xl,
    alignItems: 'center',
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoImg: { width: 38, height: 38 },
  brand: { ...typography.h1, color: palette.white, fontSize: 28 },
  tagline: { ...typography.overline, color: palette.onInkMuted, marginTop: 6 },
  scrollContent: { flexGrow: 1 },
  sheetWrap: { paddingHorizontal: spacing.lg },
  sheet: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginTop: -spacing.xxxl,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#1A1F36',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.md, marginLeft: -4 },
  backText: { ...typography.small, color: palette.primary, fontWeight: '700' },
  title: { ...typography.h1, color: palette.text },
  subtitle: { ...typography.body, color: palette.textMuted, marginTop: 4, marginBottom: spacing.xl },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  input: { flex: 1, paddingVertical: 14, ...typography.body, color: palette.text },
  otpInput: { letterSpacing: 6, fontSize: 18, fontWeight: '700' },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.small, color: palette.danger, flex: 1 },
  footnote: { ...typography.caption, color: palette.textFaint, textTransform: 'none', textAlign: 'center', marginTop: spacing.lg },
  resend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  resendText: { ...typography.small, color: palette.primary, fontWeight: '700' },
  footer: {
    textAlign: 'center',
    ...typography.caption,
    color: palette.textFaint,
    marginTop: spacing.xl,
    textTransform: 'none',
  },
});
