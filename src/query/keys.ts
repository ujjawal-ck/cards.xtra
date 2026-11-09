/**
 * keys.ts — every React Query key in one place.
 *
 * User data lives under ['user', ...]. Keys never contain the access token:
 * a token refresh used to change every key, so each refresh threw the cache
 * away and refetched everything. The cache is cleared on sign-in, sign-out
 * and session expiry instead (AuthContext), so one user's data can't leak to
 * the next. Public catalog data (offers, cards) is not user-scoped.
 */
import type { OrdersApiFilters } from '../api/cashkaro';

export const qk = {
  user: {
    all: ['user'] as const,
    profile: () => ['user', 'profile'] as const,
    earnings: () => ['user', 'earnings'] as const,
    orders: (filters: OrdersApiFilters = {}) => ['user', 'orders', filters] as const,
    order: (orderId?: string) => ['user', 'order', orderId] as const,
    paymentInfo: () => ['user', 'paymentInfo'] as const,
    mc: {
      all: ['user', 'mc'] as const,
      retailers: () => ['user', 'mc', 'retailers'] as const,
      exitDates: (storeId?: string) => ['user', 'mc', 'exitdates', storeId] as const,
      claims: (tab?: string) => (tab ? (['user', 'mc', 'claims', tab] as const) : (['user', 'mc', 'claims'] as const)),
    },
  },
  offers: {
    categories: (parent: string) => ['ck', 'offer-categories', parent] as const,
    category: (slug: string) => ['ck', 'category-offers', slug] as const,
    store: (slug: string) => ['ck', 'offer-store', slug] as const,
  },
  cards: {
    list: ['bk', 'cards'] as const,
    benefits: (alias: string) => ['bk', 'card-benefits', alias] as const,
  },
};
