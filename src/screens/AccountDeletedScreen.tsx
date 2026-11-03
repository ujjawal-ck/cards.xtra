/**
 * AccountDeletedScreen — terminal success state (Figma 3396:29405,
 * file P7UcoZYBnfyefmJIA8wcM7). Reached after the delete-account OTP.
 *
 * Layout:
 *   1. Header (close, right-aligned) — REUSED organism. Closing signs the
 *      user out and resets to Onboarding (the account is "gone").
 *   2. Centred: a yellow alert seal (80px) + "Account Deleted" title +
 *      "Your CashKaro account has been deleted. We hope to see you again."
 *
 * The yellow 12-point seal is drawn inline with react-native-svg (no seal
 * asset shipped) using feedback.warning for the fill, with a bold "!"
 * overlaid — an on-brand stand-in for the Figma image.
 *
 * Token map:
 *   screen bg   → colors.background.default
 *   seal fill   → colors.feedback.warning.default
 *   seal mark   → colors.text.primary
 *   title       → body16SemiBold / text.primary (centred)
 *   body        → body14Medium / text.primary (centred)
 */
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Polygon } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text } from '../atoms';
import { Header } from '../organisms';
import { colors, spacing } from '../tokens';
import { useAuth } from '../auth/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AccountDeleted'>;

// Seal dimensions — component-spec values (image placeholder, not type).
const SEAL_SIZE = 80;

/** 12-point yellow seal/burst, drawn as a 24-vertex star polygon. */
function AlertSeal({ size }: { size: number }) {
  const points = 12;
  const cx = 50;
  const cy = 50;
  const outer = 50;
  const inner = 40;
  const verts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    // Start at the top (−90°) so a point faces up.
    const angle = (Math.PI / points) * i - Math.PI / 2;
    verts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon points={verts.join(' ')} fill={colors.feedback.warning.default} />
      </Svg>
      {/* "!" mark, overlaid and centred on the seal. */}
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="heading24ExtraBold" color={colors.text.primary} align="center">
          !
        </Text>
      </View>
    </View>
  );
}

export function AccountDeletedScreen() {
  const navigation = useNavigation<Nav>();
  const { signOut } = useAuth();

  const finish = async () => {
    await signOut();
    // The account is gone — clear the stack and return to the entry screen.
    navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <Header
          leading="close"
          align="end"
          onLeadingPress={finish}
        />

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing[24],
            gap: spacing[16],
            // Lift the cluster slightly above true centre, matching Figma.
            paddingBottom: spacing[64],
          }}
        >
          <AlertSeal size={SEAL_SIZE} />
          <Text variant="body16SemiBold" color={colors.text.primary} align="center">
            Account Deleted
          </Text>
          <Text variant="body14Medium" color={colors.text.primary} align="center">
            Your CashKaro account has been deleted.{'\n'}We hope to see you again.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
