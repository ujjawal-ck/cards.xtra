/**
 * Harness navigation: the app's navigator SHAPE with stub screens.
 *
 *   Root native stack (every RootStackParamList route)
 *     MainTabs      → bottom tabs (Home, Offers, Earnings, Profile), tab bar hidden
 *     WithdrawStack → native stack (every WithdrawStackParamList route)
 *     every other route → Stub ("→ RouteName")
 *
 * The story's screen replaces the stub of its own route, wherever that route
 * lives (root, tabs or withdraw). So `navigate`, `replace`, `reset`, `popTo`
 * and `getParent()` resolve as in the app, and a tap that navigates shows the
 * target's name instead of throwing. A name that is not an app route (e.g.
 * "Component") is added to the root stack.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, TabParamList, WithdrawStackParamList } from '../../src/navigation/types';
import { colors } from '../../src/tokens/colors';
import { spacing } from '../../src/tokens/spacing';
import { typography } from '../../src/tokens/typography';

// `satisfies Record<keyof X, true>` makes tsc fail when the app adds or renames a route.
const ROOT = {
  Splash: true, FoundationCheck: true, Onboarding: true, NameInput: true, Greeting: true, MainTabs: true,
  Notifications: true, GetHelp: true, CashbackGuard: true, WithdrawStack: true, OffersBrandAmazon: true,
  MissingCashbackHelp: true, MissingCashbackOops: true, MissingCashbackDidYouShop: true, MissingCashbackTrack: true,
  MissingCashbackWhereDidYouShop: true, MissingCashbackChooseDate: true, MissingCashbackEnterOrderId: true,
  MissingCashbackEnterAmount: true, MissingCashbackNewUserCheck: true, MissingCashbackCategorySelect: true,
  MissingCashbackInvoiceUpload: true, MissingCashbackTicketSuccess: true, MissingCashbackResult: true,
  MissingCashbackTicketStatusReview: true, MissingCashbackTicketListClosed: true, MissingCashbackTicketListTracked: true,
  OrdersList: true, OrdersDetail: true, AllCardBenefits: true, CardsYouCanGet: true, SpendQuiz: true, ToolResults: true,
  BeatMyCardPick: true, BeatMyCardSpends: true, BeatMyCardResult: true, BestForBrands: true, BestForCategory: true, Advisor: true,
  AdvisorResults: true, AdvisorAvatarDemo: true, ProfilePaymentHistory: true, ProfilePaymentHistoryDetails: true,
  ProfilePaymentHistoryEmpty: true, ReviewUs: true, WriteReview: true, PrivacyPolicy: true, AccountSettings: true,
  EditContactVerifyIdentity: true, EditContactEnterNew: true, EditContactVerifyNew: true, DeleteAccount: true,
  DeleteAccountOtp: true, AccountDeleted: true,
} satisfies Record<keyof RootStackParamList, true>;

const TABS = { Home: true, Offers: true, Earnings: true, Profile: true } satisfies Record<keyof TabParamList, true>;

const WITHDRAW = {
  WithdrawMethodSelect: true, WithdrawEnterUPI: true, WithdrawAmazon: true, WithdrawFlipkart: true,
  WithdrawGiftCard: true, WithdrawVerifyOTP: true, WithdrawSuccess: true, WithdrawTerms: true,
} satisfies Record<keyof WithdrawStackParamList, true>;

export const ROOT_ROUTES = Object.keys(ROOT) as (keyof RootStackParamList)[];
export const TAB_ROUTES = Object.keys(TABS) as (keyof TabParamList)[];
export const WITHDRAW_ROUTES = Object.keys(WITHDRAW) as (keyof WithdrawStackParamList)[];

export type RouteName = keyof RootStackParamList | keyof TabParamList | keyof WithdrawStackParamList;

/** Params type of any app route (root, tab or withdraw). */
export type ParamsOf<N extends RouteName> = N extends keyof RootStackParamList
  ? RootStackParamList[N]
  : N extends keyof TabParamList
    ? TabParamList[N]
    : N extends keyof WithdrawStackParamList
      ? WithdrawStackParamList[N]
      : never;

/**
 * Type-checked route params for a story: `params={routeParams('ToolResults', {...})}`.
 * ScreenHarness's own `params` prop is loose on purpose (old stories pass partial objects).
 */
export function routeParams<N extends RouteName>(_name: N, params: ParamsOf<N>): ParamsOf<N> {
  return params;
}

export type Placement = 'root' | 'tab' | 'withdraw' | 'extra';

export function placementOf(name: string): Placement {
  if (name in TABS) return 'tab';
  if (name in WITHDRAW) return 'withdraw';
  if (name in ROOT) return 'root';
  return 'extra';
}

/** Stub for every route the story does not render: shows where a tap went. */
export function StubScreen({ route }: { route: { name: string; params?: object } }) {
  const params = route.params && Object.keys(route.params).length ? JSON.stringify(route.params) : '';
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[24], backgroundColor: colors.background.default }}>
      <Text style={[typography.body16SemiBold, { color: colors.text.primary }]}>→ {route.name}</Text>
      {params ? (
        <Text numberOfLines={6} style={[typography.body12Regular, { color: colors.text.tertiary, marginTop: spacing[8], textAlign: 'center' }]}>
          {params}
        </Text>
      ) : null}
    </View>
  );
}

type AnyParams = Record<string, object | undefined>;
const Root = createNativeStackNavigator<AnyParams>();
const Tabs = createBottomTabNavigator<AnyParams>();
const Withdraw = createNativeStackNavigator<AnyParams>();

export interface HarnessTarget {
  name: string;
  component: React.ComponentType<any>;
  params?: object;
}

const noTabBar = () => null;

/**
 * Build the navigator tree for one story. Call once per mount (the host
 * components must keep their identity across renders).
 */
export function createHarnessNavigator(target: HarnessTarget): React.ComponentType {
  const place = placementOf(target.name);
  const pick = (route: string) => (route === target.name ? target.component : StubScreen);
  const paramsFor = (route: string) => (route === target.name ? target.params : undefined);

  function TabsHost() {
    return (
      <Tabs.Navigator
        id={undefined}
        tabBar={noTabBar}
        initialRouteName={place === 'tab' ? target.name : 'Home'}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background.default } }}
      >
        {TAB_ROUTES.map((r) => (
          <Tabs.Screen key={r} name={r} component={pick(r)} initialParams={paramsFor(r)} />
        ))}
      </Tabs.Navigator>
    );
  }

  function WithdrawHost() {
    return (
      <Withdraw.Navigator
        id={undefined}
        initialRouteName={place === 'withdraw' ? target.name : 'WithdrawMethodSelect'}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background.default } }}
      >
        {WITHDRAW_ROUTES.map((r) => (
          <Withdraw.Screen key={r} name={r} component={pick(r)} initialParams={paramsFor(r)} />
        ))}
      </Withdraw.Navigator>
    );
  }

  const initialRoute =
    place === 'tab' ? 'MainTabs' : place === 'withdraw' ? 'WithdrawStack' : target.name;

  return function HarnessNavigator() {
    return (
      <Root.Navigator
        id={undefined}
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background.default } }}
      >
        {place === 'extra' ? (
          <Root.Screen name={target.name} component={target.component} initialParams={target.params} />
        ) : null}
        {ROOT_ROUTES.map((r) =>
          r === 'MainTabs' ? (
            <Root.Screen key={r} name={r} component={TabsHost} />
          ) : r === 'WithdrawStack' ? (
            <Root.Screen key={r} name={r} component={WithdrawHost} />
          ) : (
            <Root.Screen key={r} name={r} component={pick(r)} initialParams={paramsFor(r)} />
          ),
        )}
      </Root.Navigator>
    );
  };
}
