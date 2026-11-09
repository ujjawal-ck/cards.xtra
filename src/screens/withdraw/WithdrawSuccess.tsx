/**
 * WithdrawSuccess — Figma withdraw/.../success (2898:165272).
 *
 * Final screen of the UPI withdraw flow. Composition of existing
 * components:
 *   - <Header leading='close' align='end' />                (organism — close-
 *       only, pushed right)
 *   - <FooterButtons buttons='single' size=44 />            (organism)
 *
 * ⚠️ ASSET PENDING — no success animation ships in the repo yet (searched
 * src/assets: only splash-animation.json). The brief mentions a success
 * GIF; once it's added (e.g. src/assets/animations/withdraw-success.gif)
 * the SuccessMark placeholder becomes a one-line swap (see TODO below).
 * I do NOT fake it: SuccessMark is an explicit, flagged placeholder.
 *
 * "Continue Shopping" and the close ✕ both exit the withdraw stack back
 * to the Home tab.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import LottieView from 'lottie-react-native'; // enable with the asset (see header)

import { Text, Icon } from '../../atoms';
import { Header, FooterButtons } from '../../organisms';
import { colors, spacing, radius, iconSize } from '../../tokens';
import type {
  WithdrawStackParamList,
  RootStackParamList,
} from '../../navigation/types';
import { formatRupees } from './amount';
import type { WithdrawMethod } from '../../navigation/types';
import { play } from '../../lib/haptics';

type Nav = NativeStackNavigationProp<WithdrawStackParamList, 'WithdrawSuccess'>;
type Rt = RouteProp<WithdrawStackParamList, 'WithdrawSuccess'>;

// Per-method success copy (Figma: UPI "withdrawn Successfully!", Amazon /
// Flipkart "… Payment Initiated"). Amount comes from the route param.
function successCopy(method: WithdrawMethod, amount: number): {
  title: string;
  body: string;
} {
  switch (method) {
    case 'amazon':
      return {
        title: 'Amazon Pay Balance\nPayment Initiated',
        body: `We have initiated your payment of ${formatRupees(
          amount
        )}. It will be added to your Amazon Pay Balance within 5 minutes. In rare cases it may take upto 72 hours. We will notify you once the payment is done.`,
      };
    case 'flipkart':
      return {
        title: 'Flipkart Gift Card\nPayment Initiated',
        body: `We have initiated your payment of ${formatRupees(
          amount
        )}. Gift card will be emailed to you in 5 minutes. In rare cases it may take upto 72 hours for the Gift Card to reach you. We will notify you once the payment is processed.`,
      };
    case 'upi':
    case 'bank':
    default:
      return {
        title: `${formatRupees(amount)}\nwithdrawn Successfully!`,
        body: "It may take up to 72 hours for the payment to reflect in your account. We'll notify you once it's processed.",
      };
  }
}

// Backdrop circle that hosts the success animation (Figma Ellipse 172).
const SUCCESS_CIRCLE = 172;
// Body copy width (~295 in Figma) — kept as a screen-local layout const.
const BODY_MAX_WIDTH = 295;

/**
 * Placeholder for the missing success Lottie. Flagged, NOT a silent
 * static substitute — a light-green circle with a check mark so the
 * screen reads while the real animation asset is pending.
 */
function SuccessMark() {
  return (
    <View
      style={{
        width: SUCCESS_CIRCLE,
        height: SUCCESS_CIRCLE,
        borderRadius: radius.full,
        backgroundColor: colors.feedback.success.subtle,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* TODO(asset): replace this Icon with the success GIF once it's
          added, e.g.:
            <Image
              source={require('../../assets/animations/withdraw-success.gif')}
              style={{ width: SUCCESS_CIRCLE, height: SUCCESS_CIRCLE }}
              resizeMode="contain"
            />
          (RN <Image> animates GIFs in Expo Go.) */}
      <Icon
        name="check-circle-filled"
        size={iconSize[56]}
        color={colors.feedback.success.default}
      />
    </View>
  );
}

export function WithdrawSuccess() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { title, body } = successCopy(params.method, params.amount);

  // Celebrate the completed withdrawal once, on mount.
  useEffect(() => {
    play('success');
  }, []);

  // Exit the whole withdraw stack back to the Home tab.
  const exitToHome = () =>
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('MainTabs', { screen: 'Home' });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />

      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <Header leading="close" align="end" onLeadingPress={exitToHome} />

        {/* Centre block */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[24],
          }}
        >
          <SuccessMark />

          {/* Amount + headline (single block, centred) */}
          <View style={{ alignItems: 'center', gap: spacing[12] }}>
            <Text
              variant="heading24Bold"
              color={colors.text.primary}
              align="center"
            >
              {title}
            </Text>

            <Text
              variant="body12Regular"
              color={colors.text.primary}
              align="center"
              style={{ maxWidth: BODY_MAX_WIDTH, paddingHorizontal: spacing[24] }}
            >
              {body}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Footer pinned bottom — Shadow/Light/Up via FooterButtons default. */}
      <FooterButtons
        buttons="single"
        size={44}
        color="second"
        primaryLabel="Continue Shopping"
        onPrimary={exitToHome}
        style={{ paddingBottom: insets.bottom }}
      />
    </View>
  );
}
