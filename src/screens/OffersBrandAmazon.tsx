/**
 * OffersBrandAmazon — screen (Figma 3832:31590, "offers/brand/amazon")
 *
 * The brand page that opens when Amazon is tapped on the Offers page.
 * PURE COMPOSITION — every floor is an existing component, reused with
 * Amazon-specific props. Nothing is re-implemented here.
 *
 * Shell:
 *   - Vertical ScrollView, bg background.sunken (#fcfcfd), 360-wide
 *     content centred, floors separated by spacing[24] + a Divider.
 *   - MastheadHeader (Overlay) pinned absolute over the hero (top, below
 *     the status bar).
 *   - FooterButtons pinned absolute at the bottom.
 *
 * Floors (top → bottom), each an EXISTING component:
 *   1. PromoBanner (Carousels hero)          — Amazon hero + progress bars
 *   2. StoreAboutBrand                        — Amazon logo + blurb + View More
 *   — Divider —
 *   3. StoreCashbackDetails  bonusOffer=false — Upto 5% Cashback
 *   — Divider —
 *   4. StoreOfferDetails     copyCode=false   — Upto 90% Off, "See +5 Offers"
 *   — Divider —
 *   5. StoreCashbackTimelines appOrderTile    — 72 min / 90 days / app=yes
 *   — Divider —
 *   6. StoreTermsConditions  Card View
 *   — Divider —
 *   7. StoreSimilarStore     Stores (1 row)
 *   — Divider —  (Figma has 3 stacked here — artifact; render only ONE)
 *   8. Did You Know? floor   — title + Carousels MilestoneStat
 *
 * Screen-level tokens: spacing[16] / spacing[24], radius (via children),
 * colors.background.sunken, colors.text.primary, typography.body16SemiBold;
 * Indicator / footer / masthead colours + the footer Shadow/Light/Up all
 * come from the reused components' own tokens.
 */
import React, { useCallback, useRef, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Share } from 'react-native';
import { FocusAwareStatusBar as StatusBar } from '../navigation/FocusAwareStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { Text, Divider } from '../atoms';
import {
  PromoBanner,
  MilestoneStat,
  MastheadHeader,
  FooterButtons,
  StoreAboutBrand,
  StoreBenefitDetails,
  StoreCashbackDetails,
  StoreOfferDetails,
  StoreCashbackTimelines,
  StoreTermsConditions,
  StoreSimilarStore,
  StoreBestCards,
  StoreFaq,
  BottomSheet,
  ScreenState,
} from '../organisms';
import type { BottomSheetTemplate, BottomSheetBodyProps } from '../organisms';
import { images } from '../assets/images';
import {
  AMAZON_RATE_ROWS,
  AMAZON_TC_INTRO,
  AMAZON_TC_BULLETS,
} from '../data/amazonOffers';
import { colors, spacing } from '../tokens';
import { useOfferStore } from '../query/useOffers';
import type { TimelineTile } from '../api/offersMapper';
import { useClickOut } from '../lib/useClickOut';
import { analytics, Events } from '../analytics';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OffersBrandAmazon'>;
type BrandRoute = RouteProp<RootStackParamList, 'OffersBrandAmazon'>;

// "72" + "Minutes" → "72 minutes" (lower-cased for sentence flow). A blank
// or unparsed ("—") metric falls back to the Figma sample copy, so a store
// missing the value still reads cleanly.
function timelinePhrase(tile: TimelineTile | undefined, fallback: string): string {
  if (!tile || !tile.metric || tile.metric === '—') return fallback;
  return `${tile.metric} ${(tile.unit ?? '').toLowerCase()}`.trim();
}

// "Did You Know?" promo cards — real, distinct images (not one repeated
// placeholder), cover-cropped by MilestoneStat into 258×166 cards.
const DID_YOU_KNOW = [
  { id: 'dyk-1', image: images.storepage.amazon },
  { id: 'dyk-2', image: images.storepage.myntra },
  { id: 'dyk-3', image: images.storepage.nocashback },
];

export function OffersBrandAmazon() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<BrandRoute>();
  const insets = useSafeAreaInsets();

  // Live store from the CK offers API (by slug). Floors fall back to the
  // existing Amazon static content while loading / if no slug was passed.
  const slug = route.params?.slug ?? null;
  const { data: store, isLoading, refetch } = useOfferStore(slug);
  // Logged-in user id — injected into the cashback click-out so CashKaro
  // attributes the exit click (and the store shows up in Missing Cashback).
  // Shop & Earn click-out: login-to-earn for guests, user id on the link,
  // CLICK_OUT logged (src/lib/useClickOut.tsx).
  const { openClickOut, clickOutSheets } = useClickOut();
  const brandName = store?.name ?? 'Amazon';
  // First load of a real store: show a spinner rather than flashing the
  // Amazon placeholder content until the store's data arrives.
  const storeLoading = !!slug && isLoading && !store;
  // Loaded but no store (failed, or opened without a slug): show an error
  // instead of the Amazon sample content the floors fall back to.
  const storeMissing = !storeLoading && !store;

  // Per-store timeline values — ONE source shared by the on-page tiles and
  // the tap-through info sheets, so a sheet quotes the store's real tracking
  // / confirmation time instead of a hardcoded 48h / 30d. Falls back to the
  // Figma sample on the no-slug demo or when the API omits the field.
  const timelineTiles: TimelineTile[] = store?.timelineTiles ?? [
    { label: 'Cashback tracks in', metric: '72', unit: 'Minutes' },
    { label: 'Cashback Confirms in', metric: '90', unit: 'Days' },
    {
      label: `Cashback on ${brandName} app orders?`,
      metric: 'Yes',
      unit: 'Minutes',
      unitHidden: true,
    },
  ];
  const trackPhrase = timelinePhrase(timelineTiles[0], '48 hours');
  const confirmPhrase = timelinePhrase(timelineTiles[1], '30 days');
  const appOrdersEligible =
    (timelineTiles[2]?.metric ?? 'Yes').toLowerCase() !== 'no';

  // Section selection (data-driven):
  //   • Benefits block when the store has benefit lines (Jaypore-style).
  //   • else the Offer/How-to block when there's how-to data or coupons
  //     (coupons hint passed from the grid's coupons_count).
  //   • Upsell adds the bonus card + timer to the cashback block.
  const showBenefits = (store?.benefits?.length ?? 0) > 0;
  // Coupons are not fetched (the API's coupon include isn't mapped), so the
  // offer block shows only when the store has real "how to get" steps. It
  // used to render for any store with coupons, with a sample headline
  // ("Upto 90% Off across categories"), "See +5 Offers" and code MCCK300.
  const showOfferDetails = !showBenefits && !!store?.hasHowTo;

  const noop = () => undefined;

  // Share the store via the OS share sheet. Prefers the store's real
  // cashback URL (so the recipient lands on the live offer); falls back to a
  // plain brand message when no URL is available (no-slug demo).
  const handleShare = useCallback(() => {
    const url = store?.cashbackUrl;
    const message = url
      ? `Earn cashback on ${brandName} via CashKaro — ${url}`
      : `Earn cashback on ${brandName} via CashKaro.`;
    Share.share({ message })
      .then((res) => {
        if (res.action === Share.sharedAction) {
          analytics.track(Events.SHARE, {
            method: res.activityType ?? 'os_share_sheet',
            content_type: 'store',
            item_id: slug ?? undefined,
          });
        }
      })
      .catch(() => undefined);
  }, [store?.cashbackUrl, brandName, slug]);

  // ONE shared offer-detail sheet (the reusable BottomSheet organism).
  // The floor hyperlinks swap its title + body template, then present it.
  const sheetRef = useRef<BottomSheetModal>(null);
  const [sheetTitle, setSheetTitle] = useState('Reward Rates');
  const [sheetTemplate, setSheetTemplate] =
    useState<BottomSheetTemplate>('rate-list');
  const [sheetBodyProps, setSheetBodyProps] = useState<
    Omit<BottomSheetBodyProps, 'template'>
  >({ rewardRates: AMAZON_RATE_ROWS });
  // CTA label for the sticky footer — set for the info sheets ("Ok, Got It");
  // null for the list sheets (rates / terms), which have no footer.
  const [sheetCta, setSheetCta] = useState<string | null>(null);

  const presentSheet = useCallback(
    (
      title: string,
      template: BottomSheetTemplate,
      bodyProps: Omit<BottomSheetBodyProps, 'template'>,
      cta: string | null = null
    ) => {
      setSheetTitle(title);
      setSheetTemplate(template);
      setSheetBodyProps(bodyProps);
      setSheetCta(cta);
      // Let state apply before presenting so the body renders the new
      // template (same pattern as FoundationCheck's sheet menu).
      requestAnimationFrame(() => sheetRef.current?.present());
    },
    []
  );

  // "Important Details" timeline tiles → info bottom sheets (Figma
  // 3834:44318 / 44606 / 50923). Each explains a timeline metric + an
  // "Ok, Got It" CTA that dismisses the sheet.
  const dismissSheet = useCallback(() => sheetRef.current?.dismiss(), []);
  const openAppOrdersInfo = useCallback(
    () =>
      presentSheet(
        'Rewards on App Orders?',
        'icon-heading-body',
        {
          image: images.screenstate.appOrders,
          heading: appOrdersEligible
            ? 'App Orders Are Eligible For Rewards'
            : 'App Orders Are Not Eligible For Rewards',
          body: appOrdersEligible
            ? `Shop on ${brandName}'s app or website by clicking through CashKaro to be eligible for rewards`
            : `Shop on ${brandName}'s website (not the app) by clicking through CashKaro to be eligible for rewards`,
        },
        'Ok, Got It'
      ),
    [presentSheet, brandName, appOrdersEligible]
  );
  const openTrackingInfo = useCallback(
    () =>
      presentSheet(
        'Rewards Tracking Timeline',
        'icon-heading-body',
        {
          image: images.screenstate.tracking,
          heading: '',
          body: `Your Rewards will be added in ${trackPhrase} after your ${brandName} order has been shipped`,
        },
        'Ok, Got It'
      ),
    [presentSheet, brandName, trackPhrase]
  );
  const openConfirmationInfo = useCallback(
    () =>
      presentSheet(
        'Rewards Confirmation Timeline',
        'icon-heading-body',
        {
          image: images.screenstate.confirmation,
          heading: '',
          body: `After the return exchange period ends ${brandName} takes up to ${confirmPhrase} to finalise their report. Once we receive them we update your rewards status`,
        },
        'Ok, Got It'
      ),
    [presentSheet, brandName, confirmPhrase]
  );
  // Tiles order: 0 tracks-in, 1 confirms-in, 2 app-orders.
  const handleTimelineTilePress = useCallback(
    (i: number) => {
      if (i === 0) openTrackingInfo();
      else if (i === 1) openConfirmationInfo();
      else openAppOrdersInfo();
    },
    [openTrackingInfo, openConfirmationInfo, openAppOrdersInfo]
  );

  // "View Cashback Rates" (Cashback Details floor) → rate-list sheet.
  // Title follows the store kind — "Cashback Rates" for cashback_type
  // 'Cashback', "Reward Rates" for 'Rewards'. Uses the store's real rates
  // (headline + every category-wise secondary rate); falls back to the
  // Amazon sample only on the no-slug demo (no store loaded).
  const openRewardRates = useCallback(
    () =>
      presentSheet(
        store?.cashbackKind === 'Rewards' ? 'Reward Rates' : 'Cashback Rates',
        'rate-list',
        {
          rewardRates:
            store?.rewardRates && store.rewardRates.length > 0
              ? store.rewardRates
              : AMAZON_RATE_ROWS,
        }
      ),
    [presentSheet, store]
  );

  // "View All T&C" (Terms & Conditions floor) → terms-conditions sheet.
  const openTerms = useCallback(
    () =>
      presentSheet('Terms & Conditions', 'terms-list', {
        text: store?.termsIntro ?? (slug ? 'Standard CashKaro reward terms apply.' : AMAZON_TC_INTRO),
        bullets:
          store?.termsBullets && store.termsBullets.length > 0
            ? store.termsBullets
            : slug
            ? []
            : AMAZON_TC_BULLETS,
      }),
    [presentSheet, store, slug]
  );

  // "How to get this offer?" → steps sheet from the store's real
  // popup_steps_to_shop (offersMapper → howToSteps). List sheet styled
  // like "View All T&C" (no footer CTA; drag / scrim to dismiss).
  const openHowToGet = useCallback(
    () =>
      presentSheet('How To Get This Offer', 'terms-list', {
        text: `Shop at ${brandName} through Cards.xtra to earn your reward:`,
        bullets:
          store?.howToSteps && store.howToSteps.length > 0
            ? store.howToSteps
            : [
                `Click through Cards.xtra to visit ${brandName}`,
                'Shop as usual — same prices & offers apply',
                'Get your reward in your account after the order ships',
              ],
      }),
    [presentSheet, store, brandName]
  );

  // "See Offer Details" / "See +5 Offers" → offer-detail sheet from the
  // store's benefit_card_details (offersMapper → offerDetails), falling
  // back to its reward rates. Same list style as the rates / T&C sheets.
  const openOfferDetails = useCallback(
    () =>
      // numbered-list (not disc bullets) so the sheet's offer lines read with
      // the SAME numbered pills as the on-page Benefits block above it.
      presentSheet('Offer Details', 'numbered-list', {
        text: store
          ? `Earn ${store.cashbackPrefix} ${store.cashbackValue} ${store.cashbackKind} on ${brandName}.`
          : 'Earn rewarding cashback on every order.',
        bullets:
          store?.offerDetails && store.offerDetails.length > 0
            ? store.offerDetails
            : store?.rewardRates && store.rewardRates.length > 0
            ? store.rewardRates.map((r) => `${r.rate} ${r.description}`)
            : slug
            ? []
            : AMAZON_RATE_ROWS.map((r) => `${r.rate} ${r.description}`),
      }),
    [presentSheet, store, brandName, slug]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.sunken }}>
      {/* Dark icons — the status-bar sits on the PromoBanner's white band. */}
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          // Clear the pinned footer (single size-52 bar ≈ 80) + safe area.
          paddingBottom: spacing[80] + spacing[24] + insets.bottom,
        }}
      >
        {storeLoading ? (
          <View
            style={{
              flex: 1,
              minHeight: 480,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator color={colors.action.primary.default} />
          </View>
        ) : storeMissing ? (
          <ScreenState
            title="Couldn’t load this store"
            body="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => refetch()}
            style={{ paddingTop: insets.top + spacing[80] }}
          />
        ) : (
        /* Full-width content column; floors fill the width and separate
            by spacing[24]. Banner is full-bleed; every other floor keeps
            its own 16px L/R padding. Separators are full-bleed 'section'
            bands (8px gray), no horizontal padding. */
        <View style={{ width: '100%', gap: spacing[24] }}>
          {/* 1. Hero carousel (PromoBanner) — full-bleed, timed progress bars.
              `safeTop` reserves the device status-bar / notch height as a
              solid colour band (gradiented into the hero) so the full
              banner sits below the notch, uncropped. Squared TOP corners
              (radius 0 L/R) fill corner-to-corner. */}
          <PromoBanner
            images={
              store?.banners && store.banners.length > 0
                ? store.banners.map((uri) => ({ uri }))
                : undefined
            }
            image={store?.bannerImage ? { uri: store.bannerImage } : images.storepage.amazon}
            autoScroll
            safeTop={insets.top}
            safeTopColor={colors.surface.default}
            style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
          />

          {/* 2. Store / About Brand */}
          <StoreAboutBrand
            brandDescription
            logo={store?.logo ? { uri: store.logo } : images.stores.amazon2}
            description={
              store?.description ??
              (slug
                ? `Shop on ${brandName} via Cards.xtra and earn rewarding cashback on your orders.`
                : "Amazon, India's largest online marketplace, offers everything from electronics to fashion, groceries and more.")
            }
            onViewMore={noop}
            style={{ width: '100%' }}
          />

          <Divider style="section" />

          {/* 3. Store / Cashback Details — Off state */}
          {/* Upsell-timer variant adds the bonus/countdown card. */}
          <StoreCashbackDetails
            bonusOffer={store?.isUpsell ?? false}
            flatText={store?.cashbackPrefix ?? 'Upto'}
            strikeText={store?.cashbackStrikeValue}
            percentText={store?.cashbackValue ?? '5%'}
            cashbackText={store?.cashbackKind ?? 'Cashback'}
            subtitle={store?.cashbackDetails ?? 'on mobile, fashion, beauty and more'}
            bonusValue={store?.upsellText}
            onViewRates={openRewardRates}
            style={{ width: '100%' }}
          />

          <Divider style="section" />

          {/* 4. Benefits block (benefit-list stores like Jaypore) OR the
              Offer/How-to block (coupon / how-to stores). A store with
              benefit lines and no how-to shows benefits only — no
              "Top Offers" / "How to get" section. */}
          {showBenefits ? (
            <StoreBenefitDetails
              title={`${brandName} Benefits`}
              benefits={store!.benefits}
              howToGetThisOffer={store?.hasHowTo ?? false}
              onSeeDetails={openOfferDetails}
              onHowToGet={openHowToGet}
              style={{ width: '100%' }}
            />
          ) : showOfferDetails ? (
            <StoreOfferDetails
              copyCode={false}
              howToGetThisOffer
              title={`${brandName} Offer`}
              offerText={`${store?.cashbackPrefix ?? ''} ${store?.cashbackValue ?? ''} ${store?.cashbackKind ?? ''}`.trim()}
              seeDetailsLabel="See offer details"
              onSeeDetails={openOfferDetails}
              onHowToGet={openHowToGet}
              style={{ width: '100%' }}
            />
          ) : null}

          <Divider style="section" />

          {/* 5. Store / Cashback Timelines — real tracking / confirmation /
              app-order values from the store. */}
          <StoreCashbackTimelines
            appOrderTile
            tiles={timelineTiles}
            onTilePress={handleTimelineTilePress}
            style={{ width: '100%' }}
          />

          <Divider style="section" />

          {/* 6. Store / Terms & Conditions — Card View */}
          <StoreTermsConditions
            property1="Card View"
            cards={store ? store.termsCards : undefined}
            onViewAll={openTerms}
            style={{ width: '100%' }}
          />

          <Divider style="section" />

          {/* 7. Best cards to use here — credit-card upsell floor. Self-hides
              (no leading divider) until the catalog loads; renders its own
              leading section divider when it has cards, so the separators
              collapse cleanly when empty. Card match is driven by the Offers
              category the store was opened from. */}
          <StoreBestCards category={route.params?.category} style={{ width: '100%' }} />

          {/* 8. Store / Similar Store — one row of 3 */}
          <StoreSimilarStore
            property1="Stores"
            onStorePress={noop}
            style={{ width: '100%' }}
          />

          {/* Single divider (Figma stacks 3 here — artifact) */}
          <Divider style="section" />

          {/* 9. Did You Know? floor — title + MilestoneStat carousel */}
          <View style={{ width: '100%', gap: spacing[16] }}>
            <Text
              variant="body16SemiBold"
              color={colors.text.primary}
              style={{ width: '100%', paddingHorizontal: spacing[16] }}
            >
              Did You Know?
            </Text>
            <MilestoneStat items={DID_YOU_KNOW} />
          </View>

          {/* 10. FAQ floor — store's own API `faq[]` as single-open
              accordions. Self-hides when the store has no FAQ. */}
          {store?.faq && store.faq.length > 0 ? (
            <>
              <Divider style="section" />
              <StoreFaq items={store.faq} style={{ width: '100%' }} />
            </>
          ) : null}
        </View>
        )}
      </ScrollView>

      {/* Pinned Masthead (Overlay) over the hero, below the status bar */}
      <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0 }}>
        <MastheadHeader
          iconType="solid"
          leading="back"
          trailingGlyph="share"
          onLeadingPress={() => navigation.goBack()}
          onTrailingPress={handleShare}
        />
      </View>

      {/* Pinned Footer — single saffron CTA with top shadow, flush to the
          bottom edge (FooterButtons supplies its own padding). Only with a
          real store to shop at. */}
      {store ? (
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface.default,
        }}
      >
        <FooterButtons
          buttons="single"
          size={52}
          shadow="on"
          color="main"
          primaryLabel={`Earn Cashback on ${brandName}`}
          primaryIcon="trailing"
          primaryIconName="chevron-right"
          shine
          onPrimary={() => {
            // Outbound "Shop & Earn" click — the offers conversion.
            analytics.track(Events.OFFER_SHOP, {
              store: brandName,
              cashback_kind: store?.cashbackKind,
            });
            openClickOut({ kind: 'store', url: store?.cashbackUrl, itemId: slug ?? undefined, itemName: brandName });
          }}
        />
      </View>
      ) : null}

      {/* Guest "Log in to earn cashback" sheet for Shop & Earn. */}
      {clickOutSheets}

      {/* Shared offer-detail sheet — opened by the floor hyperlinks above.
          Drag-down / scrim dismiss it (gorhom). */}
      <BottomSheet
        ref={sheetRef}
        title={sheetTitle}
        showStroke
        template={sheetTemplate}
        bodyProps={sheetBodyProps}
        footer={!!sheetCta}
        footerProps={
          sheetCta
            ? {
                buttons: 'single',
                size: 52,
                color: 'second',
                primaryLabel: sheetCta,
                onPrimary: dismissSheet,
              }
            : undefined
        }
      />
    </View>
  );
}
