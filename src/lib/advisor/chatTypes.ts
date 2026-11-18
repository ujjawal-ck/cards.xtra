/**
 * Card advisor chat: the contract between the transcript builder
 * (src/lib/advisor/transcript.ts) and the chat screen (src/screens/advisor).
 *
 * The advisor's messages sit on the left. The user's answers sit on the right.
 * The transcript is DERIVED from the answers, like everything else in the
 * advisor (see types.ts): there is no stored message list.
 *
 * Rules that hold:
 *   - A message id never changes once it exists, so the screen can animate only
 *     the new ones. Ids are built from the question id.
 *   - History does not rewrite itself: a later answer, an eligibility result or
 *     "I have this" never changes the TEXT of an earlier message. Only the last
 *     reveal carries cards; every earlier reveal is one collapsed line.
 *   - Changing an earlier answer is a rewind: that answer and every later one go.
 */
import type { CardModel } from '../../molecules';
import type {
  AdvisorConfig,
  AdvisorEligibility,
  AdvisorReveal,
  AdvisorState,
  AdvisorStep,
  QuestionId,
} from './types';
import type { AdvisorAvatarState } from '../advisorAvatar/types';

export type ChatMessage =
  /** Left. A plain line from the advisor: the greeting, a "same cards" note, the closing line. */
  | { id: string; kind: 'agent-text'; text: string }
  /** Left. One question: the expert line (`why`) and the question (`ask`).
   *  `current` is true for the question that waits for an answer now. */
  | { id: string; kind: 'agent-question'; questionId: QuestionId; why: string; ask: string; current: boolean }
  /** Right. The user's answer, in the words of the option they tapped
   *  ("Not sure" for NOT_SURE, "PIN 110001" for the pincode). */
  | { id: string; kind: 'user-answer'; questionId: QuestionId; text: string }
  /** Left. Cards. `reveal` is present ONLY on the last reveal of the transcript.
   *  An earlier reveal shows one line: `header`. */
  | { id: string; kind: 'agent-reveal'; header: string; reveal?: AdvisorReveal }
  /** Left. Added by the screen hook, never by buildTranscript: the eligibility check state. */
  | { id: string; kind: 'agent-status'; status: 'checking' | 'check-failed' };

export interface BuildTranscriptInput {
  state: AdvisorState;
  config: AdvisorConfig;
  /** The full loaded catalogue, in API order. */
  cards: CardModel[];
  /** The finished eligibility check, or null (not asked, loading or failed). */
  eligibility: AdvisorEligibility | null;
  /** True when saved eligibility details are in use (the eligibility questions are not asked).
   *  The eligibility result then applies to every reveal from the first one. */
  eligibilityKnown: boolean;
}

export interface AdvisorTranscript {
  messages: ChatMessage[];
  /** The question that waits for an answer, or null when the advisor has no more questions. */
  step: AdvisorStep | null;
  /** The current cards (the same object as on the last 'agent-reveal' message), or null before the first answer. */
  reveal: AdvisorReveal | null;
}

/** What the screen knows right now, for the avatar. Every field is a real event of the screen. */
export interface AvatarSignals {
  /** The card catalogue failed to load. */
  catalogueError: boolean;
  /** The eligibility check failed. */
  eligibilityError: boolean;
  /** The eligibility check is running. */
  eligibilityFetching: boolean;
  /** A new advisor message is still arriving on screen (its entrance has not finished). */
  messageArriving: boolean;
  /** Cards just turned "likely to qualify" (set for a short moment, once per result). */
  justFoundLikely: boolean;
  /** A question waits for the user's answer. */
  waitingForAnswer: boolean;
}

/**
 * src/lib/advisor/transcript.ts exports exactly:
 *
 *   buildTranscript(input: BuildTranscriptInput): AdvisorTranscript
 *   rewindAnswers(state: AdvisorState, config: AdvisorConfig, questionId: QuestionId): AdvisorState
 *   avatarStateFor(signals: AvatarSignals): AdvisorAvatarState
 */
export type { AdvisorAvatarState };
