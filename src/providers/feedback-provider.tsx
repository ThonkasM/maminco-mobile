import { Ionicons } from '@expo/vector-icons';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { fontSize, fontWeight, radii, spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FeedbackVariant = 'success' | 'error' | 'info';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface FeedbackContextValue {
  notify: (variant: FeedbackVariant, message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const ICONS: Record<FeedbackVariant, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

function accentFor(variant: FeedbackVariant, colors: ThemeColors): string {
  switch (variant) {
    case 'success':
      return colors.success;
    case 'error':
      return colors.danger;
    default:
      return colors.info;
  }
}

/**
 * Global, centred feedback: a custom notification banner and a confirmation
 * dialog, both styled with the design-system tokens.
 */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ variant: FeedbackVariant; message: string } | null>(
    null,
  );
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const notify = useCallback((variant: FeedbackVariant, message: string) => {
    setToast({ variant, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToast(null),
      variant === 'error' ? 5000 : 3500,
    );
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setConfirmOptions(options);
      }),
    [],
  );

  const closeConfirm = useCallback((value: boolean) => {
    setConfirmOptions(null);
    resolver.current?.(value);
    resolver.current = null;
  }, []);

  const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {toast ? (
        <View
          pointerEvents="none"
          style={[styles.toastOverlay, { top: insets.top + spacing.md }]}
        >
          <View
            style={[
              styles.toast,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name={ICONS[toast.variant]}
              size={20}
              color={accentFor(toast.variant, colors)}
            />
            <Text style={[styles.toastText, { color: colors.text }]}>
              {toast.message}
            </Text>
          </View>
        </View>
      ) : null}

      <Modal
        visible={confirmOptions !== null}
        transparent
        animationType="fade"
        onRequestClose={() => closeConfirm(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => closeConfirm(false)}>
          <Pressable
            style={[
              styles.dialog,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => undefined}
          >
            {confirmOptions ? (
              <>
                <View style={styles.dialogHeader}>
                  <Ionicons
                    name={
                      confirmOptions.destructive
                        ? 'warning'
                        : 'help-circle'
                    }
                    size={22}
                    color={
                      confirmOptions.destructive ? colors.danger : colors.primary
                    }
                  />
                  <Text style={[styles.dialogTitle, { color: colors.text }]}>
                    {confirmOptions.title}
                  </Text>
                </View>
                {confirmOptions.message ? (
                  <Text style={[styles.dialogMessage, { color: colors.muted }]}>
                    {confirmOptions.message}
                  </Text>
                ) : null}
                <View style={styles.dialogActions}>
                  <Button
                    title={confirmOptions.cancelText ?? 'Cancelar'}
                    variant="outline"
                    fullWidth
                    onPress={() => closeConfirm(false)}
                    style={styles.flex}
                  />
                  <Button
                    title={confirmOptions.confirmText ?? 'Confirmar'}
                    variant={confirmOptions.destructive ? 'danger' : 'primary'}
                    fullWidth
                    onPress={() => closeConfirm(true)}
                    style={styles.flex}
                  />
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback debe usarse dentro de FeedbackProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 420,
    width: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toastText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    gap: spacing.md,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dialogTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  dialogMessage: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
