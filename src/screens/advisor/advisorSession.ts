/**
 * advisorSession: the card advisor chat kept in memory for the app session.
 *
 * Leaving the advisor (the header back arrow, a card page, the full list) and coming back keeps
 * the answers. Nothing here goes to disk. The store is one live object: useAdvisor reads it on
 * mount and writes every change back. Call resetAdvisorSession() on logout.
 */
import type { AdvisorState } from '../../lib/advisor/types';

/** The saved eligibility details, as the advisor uses them. */
export interface SavedInputs {
  pincode: string;
  incomeMonthly: number;
  selfEmployed: boolean;
}

export interface AdvisorSession {
  state: AdvisorState;
  /** null until the saved eligibility details were read once. */
  useSaved: boolean | null;
  /** The saved eligibility details read with `useSaved`, kept so a remount does not wait for the read.
   *  In memory only. */
  saved: SavedInputs | null;
  /** The large intro mascot was shown and the user has answered once. */
  introDone: boolean;
  /** Analytics memory, so a remount does not fire events again. */
  started: boolean; // advisor_start fired for the current opener answer
  revealCount: number;
  lastRevealKey: string;
  seenTipIds: string[];
  lastQuestionViewed: string | null;
}

function empty(): AdvisorSession {
  return {
    state: { answers: {}, held: [] },
    useSaved: null,
    saved: null,
    introDone: false,
    started: false,
    revealCount: 0,
    lastRevealKey: '',
    seenTipIds: [],
    lastQuestionViewed: null,
  };
}

const session: AdvisorSession = empty();

/** The live object. */
export function getAdvisorSession(): AdvisorSession {
  return session;
}

/** Back to empty, in place (a held reference stays valid). The lead calls it on logout. */
export function resetAdvisorSession(): void {
  Object.assign(session, empty());
}
