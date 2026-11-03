/**
 * RootNavigator — top-level native stack.
 *   FoundationCheck (TEMPORARY) -> Splash -> Login -> Otp -> MainTabs
 *
 * FoundationCheck stays as the initial route during the design-token
 * verification phase. A "Play Splash" CTA inside FoundationCheck
 * navigates to the Splash screen, which then replaces itself with
 * Login on onAnimationFinish / its 7-s safety timeout (so you can't
 * swipe back to the splash from Login).
 *
 * Headers are off everywhere: the four-screen flow uses custom branded
 * headers / hero sections per the Figma spec.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { StaggeredEntrance } from '../organisms';
import { colors } from '../tokens';
import type { RootStackParamList } from './types';
import { SplashScreen } from '../screens/SplashScreen';
import { FoundationCheck } from '../screens/FoundationCheck';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { NameInputScreen } from '../screens/NameInputScreen';
import { GreetingScreen } from '../screens/GreetingScreen';
import { WithdrawStack } from './WithdrawStack';
import { OffersBrandAmazon } from '../screens/OffersBrandAmazon';
import { MissingCashbackHelp } from '../screens/MissingCashbackHelp';
import { MissingCashbackOops } from '../screens/MissingCashbackOops';
import { MissingCashbackDidYouShop } from '../screens/MissingCashbackDidYouShop';
import { MissingCashbackTrack } from '../screens/MissingCashbackTrack';
import { MissingCashbackWhereDidYouShop } from '../screens/MissingCashbackWhereDidYouShop';
import { MissingCashbackChooseDate } from '../screens/MissingCashbackChooseDate';
import { MissingCashbackEnterOrderId } from '../screens/MissingCashbackEnterOrderId';
import { MissingCashbackEnterAmount } from '../screens/MissingCashbackEnterAmount';
import { MissingCashbackNewUserCheck } from '../screens/MissingCashbackNewUserCheck';
import { MissingCashbackCategorySelect } from '../screens/MissingCashbackCategorySelect';
import { MissingCashbackInvoiceUpload } from '../screens/MissingCashbackInvoiceUpload';
import { MissingCashbackTicketSuccess } from '../screens/MissingCashbackTicketSuccess';
import { MissingCashbackResult } from '../screens/MissingCashbackResult';
import { MissingCashbackTicketStatusReview } from '../screens/MissingCashbackTicketStatusReview';
import { MissingCashbackTicketListClosed } from '../screens/MissingCashbackTicketListClosed';
import { MissingCashbackTicketListTracked } from '../screens/MissingCashbackTicketListTracked';
import { OrdersList } from '../screens/OrdersList';
import { OrdersDetail } from '../screens/OrdersDetail';
import { AllCardBenefitsScreen } from '../screens/AllCardBenefitsScreen';
import { ProfilePaymentHistory } from '../screens/ProfilePaymentHistory';
import { ProfilePaymentHistoryDetails } from '../screens/ProfilePaymentHistoryDetails';
import { ProfilePaymentHistoryEmpty } from '../screens/ProfilePaymentHistoryEmpty';
import { ReviewUsScreen } from '../screens/ReviewUsScreen';
import { WriteReviewScreen } from '../screens/WriteReviewScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { AccountSettingsScreen } from '../screens/AccountSettingsScreen';
import { DeleteAccountScreen } from '../screens/DeleteAccountScreen';
import { DeleteAccountOtpScreen } from '../screens/DeleteAccountOtpScreen';
import { AccountDeletedScreen } from '../screens/AccountDeletedScreen';
import { EditContactVerifyIdentityScreen } from '../screens/EditContactVerifyIdentityScreen';
import { EditContactEnterNewScreen } from '../screens/EditContactEnterNewScreen';
import { EditContactVerifyNewScreen } from '../screens/EditContactVerifyNewScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { CashbackGuardScreen } from '../screens/CashbackGuardScreen';
import { GetHelpScreen } from '../screens/GetHelpScreen';
import { TabNavigator } from './TabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Screens that own their own entrance and must NOT get the generic settle:
// the splash/auth flow (bespoke gradients + lottie + keyboard handling) and
// MainTabs (each tab runs its own staggered cascade — wrapping the navigator
// would re-settle the whole tab UI, floating nav included, on every pop-back).
const NO_ENTRANCE = new Set<string>([
  'Splash',
  'FoundationCheck',
  'Onboarding',
  'Login',
  'Otp',
  // The post-OTP name/greeting handoff owns its own entrance + cross-fades.
  'NameInput',
  'Greeting',
  'MainTabs',
]);

// The post-OTP handoff (Otp → NameInput → Greeting → MainTabs) must read as
// one continuous moment: clean cross-fades, no header, no swipe-back, and a
// warm card background so no white edge shows mid-fade (each screen also paints
// its own full-bleed greeting gradient).
const HANDOFF_OPTIONS = {
  animation: 'fade',
  gestureEnabled: false,
  contentStyle: { backgroundColor: colors.surface.default },
} as const;

export function RootNavigator() {
  return (
    <Stack.Navigator
      id={undefined}
      initialRouteName="Splash"
      // Every pushed content screen settles into place (rise + a whisper of
      // scale) after the native slide finishes — no opacity fade here, which
      // would show the screen underneath through it mid-slide. Replays on
      // focus, so popping back to a screen re-settles it.
      screenLayout={({ route, children }) =>
        NO_ENTRANCE.has(route.name) ? (
          children
        ) : (
          <StaggeredEntrance fill fade={false} rise={14} duration={340}>
            {children}
          </StaggeredEntrance>
        )
      }
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        // Crossfade for the splash → Login handoff so there's no
        // sideways slide breaking the cinematic moment.
        options={{ animation: 'fade' }}
      />
      <Stack.Screen name="FoundationCheck" component={FoundationCheck} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen
        name="NameInput"
        component={NameInputScreen}
        options={HANDOFF_OPTIONS}
      />
      <Stack.Screen
        name="Greeting"
        component={GreetingScreen}
        options={HANDOFF_OPTIONS}
      />
      {/* Cross-fade into the app so the greeting dissolves into Home (rather
          than sliding) on the Greeting → MainTabs reset. */}
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="CashbackGuard" component={CashbackGuardScreen} />
      <Stack.Screen name="GetHelp" component={GetHelpScreen} />
      <Stack.Screen name="WithdrawStack" component={WithdrawStack} />
      <Stack.Screen name="OffersBrandAmazon" component={OffersBrandAmazon} />
      <Stack.Screen
        name="MissingCashbackHelp"
        component={MissingCashbackHelp}
      />
      <Stack.Screen
        name="MissingCashbackOops"
        component={MissingCashbackOops}
      />
      <Stack.Screen
        name="MissingCashbackDidYouShop"
        component={MissingCashbackDidYouShop}
      />
      <Stack.Screen
        name="MissingCashbackTrack"
        component={MissingCashbackTrack}
      />
      <Stack.Screen
        name="MissingCashbackWhereDidYouShop"
        component={MissingCashbackWhereDidYouShop}
      />
      <Stack.Screen
        name="MissingCashbackChooseDate"
        component={MissingCashbackChooseDate}
      />
      <Stack.Screen
        name="MissingCashbackEnterOrderId"
        component={MissingCashbackEnterOrderId}
      />
      <Stack.Screen
        name="MissingCashbackEnterAmount"
        component={MissingCashbackEnterAmount}
      />
      <Stack.Screen
        name="MissingCashbackNewUserCheck"
        component={MissingCashbackNewUserCheck}
      />
      <Stack.Screen
        name="MissingCashbackCategorySelect"
        component={MissingCashbackCategorySelect}
      />
      <Stack.Screen
        name="MissingCashbackInvoiceUpload"
        component={MissingCashbackInvoiceUpload}
      />
      <Stack.Screen
        name="MissingCashbackTicketSuccess"
        component={MissingCashbackTicketSuccess}
      />
      <Stack.Screen
        name="MissingCashbackResult"
        component={MissingCashbackResult}
      />
      <Stack.Screen
        name="MissingCashbackTicketStatusReview"
        component={MissingCashbackTicketStatusReview}
      />
      <Stack.Screen
        name="MissingCashbackTicketListClosed"
        component={MissingCashbackTicketListClosed}
      />
      <Stack.Screen
        name="MissingCashbackTicketListTracked"
        component={MissingCashbackTicketListTracked}
      />
      <Stack.Screen name="OrdersList" component={OrdersList} />
      <Stack.Screen name="OrdersDetail" component={OrdersDetail} />
      <Stack.Screen name="AllCardBenefits" component={AllCardBenefitsScreen} />
      <Stack.Screen
        name="ProfilePaymentHistory"
        component={ProfilePaymentHistory}
      />
      <Stack.Screen
        name="ProfilePaymentHistoryDetails"
        component={ProfilePaymentHistoryDetails}
      />
      <Stack.Screen
        name="ProfilePaymentHistoryEmpty"
        component={ProfilePaymentHistoryEmpty}
      />
      <Stack.Screen name="ReviewUs" component={ReviewUsScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <Stack.Screen
        name="EditContactVerifyIdentity"
        component={EditContactVerifyIdentityScreen}
      />
      <Stack.Screen
        name="EditContactEnterNew"
        component={EditContactEnterNewScreen}
      />
      <Stack.Screen
        name="EditContactVerifyNew"
        component={EditContactVerifyNewScreen}
      />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen
        name="DeleteAccountOtp"
        component={DeleteAccountOtpScreen}
      />
      <Stack.Screen
        name="AccountDeleted"
        component={AccountDeletedScreen}
        // Terminal screen — block the swipe-back gesture so the user can't
        // return to the OTP step after the account is "deleted".
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
