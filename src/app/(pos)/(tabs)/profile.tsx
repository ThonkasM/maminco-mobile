import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Screen } from '@/components/ui';
import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE } from '@/lib/api';
import { roleLabel } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

export default function PosProfileScreen() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>

      <Card style={styles.card} elevated>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Ionicons name="person" size={28} color={colors.onPrimary} />
          </View>
          <View style={styles.identityText}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {user?.name ?? 'Usuario'}
            </Text>
            <Text style={[styles.email, { color: colors.muted }]} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
          </View>
        </View>
        <Badge label={roleLabel(user?.role)} tone="primary" />
      </Card>

      <Card title="Aplicación" style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.muted }]}>Versión</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.muted }]}>Servidor</Text>
          <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
            {API_BASE}
          </Text>
        </View>
      </Card>

      <Button
        title="Cerrar sesión"
        variant="danger"
        icon="log-out-outline"
        fullWidth
        loading={signingOut}
        onPress={handleSignOut}
        style={styles.signOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  email: {
    fontSize: fontSize.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: fontSize.sm,
  },
  infoValue: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'right',
  },
  signOut: {
    marginTop: spacing.sm,
  },
});
