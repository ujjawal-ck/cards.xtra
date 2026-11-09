/**
 * Image registry — every PNG in src/assets/images, grouped by subfolder.
 *
 * Why explicit require()s: Metro can only resolve `require()` when the
 * path is a string literal at the call site, so we list each file. If
 * an image is added or removed, this file must be updated too. The
 * camelCase key is the filename with its category prefix and extension
 * stripped (e.g. `card-axis-magnus.png` -> `axisMagnus`).
 *
 * Usage:
 *   import { images } from '../assets/images';
 *   <Image source={images.cards.axisMagnus} ... />
 *   <ImageBackground source={images.backgrounds.home} ... />
 */

export const images = {
  cards: {
    axisBurgundyPrivateTheOneCard: require('./cards/card-axis-burgundy-private-the-one-card.png'),
    axisClubVistara: require('./cards/card-axis-club-vistara.png'),
    axisFlipkart: require('./cards/card-axis-flipkart.png'),
    axisMagnus: require('./cards/card-axis-magnus.png'),
    axisSupermoneyRupayCard: require('./cards/card-axis-supermoney-rupay-card.png'),
    federalCelesta: require('./cards/card-federal-celesta.png'),
    federalJupiterEdge: require('./cards/card-federal-jupiter-edge.png'),
    federalScapia: require('./cards/card-federal-scapia.png'),
    hdfcRegaliaGold: require('./cards/card-hdfc-regalia-gold.png'),
    hdfcSwiggy: require('./cards/card-hdfc-swiggy.png'),
    hdfcUpiRupay: require('./cards/card-hdfc-upi-rupay.png'),
    hsbcCashback: require('./cards/card-hsbc-cashback.png'),
    hsbcPlatninum: require('./cards/card-hsbc-platninum.png'), // filename typo preserved
    hsbcPremierMastercard: require('./cards/card-hsbc-premier-mastercard.png'),
    hsbcTravelOne: require('./cards/card-hsbc-travel-one.png'),
    iciciCoral: require('./cards/card-icici-coral.png'),
    iciciHpclSuperSaver: require('./cards/card-icici-hpcl-super-saver.png'),
    iciciRubyx: require('./cards/card-icici-rubyx.png'),
    iciciSapphiro: require('./cards/card-icici-sapphiro.png'),
    otherEdgeRupay: require('./cards/card-other-edge-rupay.png'),
    otherKiwiUpi: require('./cards/card-other-kiwi-upi.png'),
    sbiCashback: require('./cards/card-sbi-cashback.png'),
    sbiIrctcPlatinum: require('./cards/card-sbi-irctc-platinum.png'),
    sbiSimplyclick: require('./cards/card-sbi-simplyclick.png'),
    sbiSimplysave: require('./cards/card-sbi-simplysave.png'),
    tataNeuInfinitySbiCard: require('./cards/card-tata-neu-infinity-sbi-card.png'),
    tataNuePlus: require('./cards/card-tata-nue-plus.png'),
    tataNue: require('./cards/card-tata-nue.png'),
  },
  categories: {
    banking: require('./categories/cat-banking.png'),
    beautyAndGrooming: require('./categories/cat-beauty-and-grooming.png'),
    departmental: require('./categories/cat-departmental.png'),
    education: require('./categories/cat-education.png'),
    electronics: require('./categories/cat-electronics.png'),
    fashion: require('./categories/cat-fashion.png'),
    flightsAndTravel: require('./categories/cat-flights-and-travel.png'),
    foodAndGrocery: require('./categories/cat-food-and-grocery.png'),
    healthAndWellness: require('./categories/cat-health-and-wellness.png'),
    homeAndKitchen: require('./categories/cat-home-and-kitchen.png'),
    hosting: require('./categories/cat-hosting.png'),
    loans: require('./categories/cat-loans.png'),
    mobile: require('./categories/cat-mobile.png'),
    newOnCashkaro: require('./categories/cat-new-on-cashkaro.png'),
    pharmacy: require('./categories/cat-pharmacy.png'),
  },
  brands: {
    ajio: require('./brands/brand-ajio.png'),
    amazon: require('./brands/brand-amazon.png'),
    clove: require('./brands/brand-clove.png'),
    dotAndKey: require('./brands/brand-dot-and-key.png'),
    flipkart: require('./brands/brand-flipkart.png'),
    foxtale: require('./brands/brand-foxtale.png'),
    koparo: require('./brands/brand-koparo.png'),
    mamaearth: require('./brands/brand-mamaearth.png'),
    myntra: require('./brands/brand-myntra.png'),
    nykaa: require('./brands/brand-nykaa.png'),
    relianceDigital: require('./brands/brand-reliance-digital.png'),
    timesprime: require('./brands/brand-timesprime.png'),
  },
  stores: {
    amazon2: require('./stores/store-amazon-2.png'),
    axisIndianOilCard1: require('./stores/store-axis-indian-oil-card-1.png'),
    clove12: require('./stores/store-clove-1-2.png'),
    fkFashion1: require('./stores/store-fk-fashion-1.png'),
    genieshine11: require('./stores/store-genieshine-1-1.png'),
    hsbcCreditCardt11: require('./stores/store-hsbc-credit-cardt-1-1.png'), // filename typo preserved
    idfcFirstEarn11: require('./stores/store-idfc-first-earn-1-1.png'),
    indigoHotel11: require('./stores/store-indigo-hotel-1-1.png'),
    jioMart12: require('./stores/store-jio-mart-1-2.png'),
    makeMyTripCab1: require('./stores/store-make-my-trip-cab-1.png'),
    mcaffeine: require('./stores/store-mcaffeine.png'),
    myntra31: require('./stores/store-myntra-3-1.png'),
    myzoneLtfRupayCard1: require('./stores/store-myzone-ltf-rupay-card-1.png'),
    redRail11: require('./stores/store-red-rail-1-1.png'),
    sbiMilesCard1: require('./stores/store-sbi-miles-card-1.png'),
    sbicard: require('./stores/store-sbicard.png'),
    tataNeu12: require('./stores/store-tata-neu-1-2.png'),
    tata: require('./stores/store-tata.png'),
    tatamg: require('./stores/store-tatamg.png'),
  },
  backgrounds: {
    blue: require('./backgrounds/bg-blue.png'),
    darkblue: require('./backgrounds/bg-darkblue.png'),
    home: require('./backgrounds/bg-home.png'),
    large: require('./backgrounds/bg-large.png'),
    medium: require('./backgrounds/bg-medium.png'),
    onboarding: require('./backgrounds/bg-onboarding.png'),
    small: require('./backgrounds/bg-small.png'),
  },
  help: {
    // Cobalt hero for the "We're here to help!" page — gradient + headset
    // illustration + baked heading, exported from Figma (node 6308:31058).
    masthead: require('./help/help-masthead.png'),
    // Cards.xtra app-logo tile for the "How Cards.xtra Works?" help topic
    // (Figma 3632:194976).
    appLogo: require('./help/help-app-logo.png'),
    // Cobalt "Missing Cashback?" hero — gradient + phone-checklist illustration
    // + baked heading, exported from Figma (Masthead/Main, node 3437:72827).
    missingCashbackMasthead: require('./help/missing-cashback-masthead.png'),
  },
  filters: {
    bills: require('./filters/filter-bills.png'),
    dining: require('./filters/filter-dining.png'),
    foodOrdering: require('./filters/filter-food-ordering.png'),
    fuel: require('./filters/filter-fuel.png'),
    grocery: require('./filters/filter-grocery.png'),
    shopping: require('./filters/filter-shopping.png'),
    travel: require('./filters/filter-travel.png'),
  },
  logos: {
    darkBig: require('./logos/logo-dark-big.png'),
    darkSmall: require('./logos/logo-dark-small.png'),
    lightBig: require('./logos/logo-light-big.png'),
    lightSmall: require('./logos/logo-light-small.png'),
  },
  storepage: {
    amazon: require('./storepage/storepage-amazon.png'),
    myntra: require('./storepage/storepage-myntra.png'),
    nocashback: require('./storepage/storepage-nocashback.png'),
  },
  // ScreenState illustrations (Figma "Image/ScreenState", 156×156 raster
  // renders) — used by the store-page timeline info bottom sheets.
  screenstate: {
    appOrders: require('./screenstate/screenstate-app-orders.png'),
    tracking: require('./screenstate/screenstate-tracking.png'),
    confirmation: require('./screenstate/screenstate-confirmation.png'),
  },
  onboarding: {
    slide1: require('./onboarding/onboarding-1.png'),
    slide2: require('./onboarding/onboarding-2.png'),
    slide3: require('./onboarding/onboarding-3.png'),
  },
  // Promotional full-bleed banners shown in sheets/overlays. `shopAsUsual`
  // is the "Shop as Usual, Earn Cashback" Offers welcome banner — the
  // portrait artwork is ~720×900 (4:5); PROMO_ASPECT in PromoTopSheet
  // assumes that ratio, so keep new banners here close to it.
  promos: {
    shopAsUsual: require('./promos/promo-shop-as-usual.png'),
  },
} as const;

export type ImageGroupKey = keyof typeof images;
