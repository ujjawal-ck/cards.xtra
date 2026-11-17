/**
 * Static snapshot from the UAT calculate response, 2026-11-17. Temporary: replace with a gateway-cached map.
 *
 * The catalogue API has no cashback-vs-rewards field, so the cross-sell engine
 * (src/lib/crossSell.ts) reads a card's reward type from this list: an alias
 * in the set is 'cashback', every other card is 'rewards'.
 */
export const CROSS_SELL_CASHBACK_ALIASES: Set<string> = new Set<string>([
  'au-altura-credit-card',
  'au-instapay-rupay-credit-card',
  'au-xcite-ace-credit-card',
  'axis-ace-credit-card',
  'axis-cashback-credit-card',
  'axis-flipkart-credit-card',
  'axis-supermoney-credit-card',
  'bob-cashback-credit-card',
  'fibe-axis-credit-card',
  'flipkart-sbi-credit-card',
  'hdfc-bharat-credit-card',
  'hdfc-flipkart-wholesale-credit-card',
  'hdfc-millenia-credit-card',
  'hdfc-pixel-go-credit-card',
  'hdfc-pixel-play-credit-card',
  'hsbc-live-plus-credit-card',
  'hsbc-rupay-cashback-credit-card',
  'icici-amazon-pay-credit-card',
  'idfc-first-earn-credit-card',
  'idfc-first-hello-cashback-credit-card',
  'idfc-first-quantum-plus-credit-card',
  'kotak-cashback-plus-credit-card',
  'kotak-delight-platinum-credit-card',
  'paytm-hdfc-bank-select-credit-card',
  'rbl-popcorn-credit-card',
  'sbi-cashback-credit-card',
  'stanc-smart-credit-card',
  'swiggy-blck-hdfc-credit-card',
  'swiggy-ornge-hdfc-credit-card',
  'yes-bank-paisabazaar-paisasave-credit-card',
]);
