import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { Button, Card, Input, Screen } from '@/components/ui';
import { fonts, fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { useFeedback } from '@/providers/feedback-provider';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const { notify } = useFeedback();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      notify('error', 'Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim().toLowerCase(), password);
      // The root layout redirects to the correct experience based on the role.
    } catch (err) {
      setError(getErrorMessage(err));
      notify('error', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      scroll
      edges={['top', 'bottom', 'left', 'right']}
      contentContainerStyle={styles.content}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.flex}
      >
        <View style={styles.brand}>
          <Image source={require('@/assets/icons/maminco-logo-192.png')} style={styles.logo} />
          <Text style={[styles.title, { color: colors.text }]}>Maminco</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Sistema de punto de venta
          </Text>
        </View>

        <Card elevated style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Iniciar sesión</Text>
          <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
            Ingresa con tu cuenta de trabajo
          </Text>

          <View style={styles.form}>
            <Input
              label="Correo electrónico"
              icon="mail-outline"
              placeholder="tu@maminco.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Contraseña"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

            {error ? (
              <View style={[styles.error, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Button
              title="Ingresar"
              variant="brand"
              onPress={handleSubmit}
              loading={loading}
              fullWidth
              size="lg"
              icon="log-in-outline"
            />
          </View>
        </Card>

        <Text style={[styles.footer, { color: colors.muted }]}>
          Gestiona mesas, pedidos y pagos en un solo lugar.
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  flex: {
    flex: 1,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontFamily: fonts.display,
    fontWeight: 'normal',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: fontSize.md,
  },
  card: {
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  footer: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontSize: fontSize.xs,
  },
});
