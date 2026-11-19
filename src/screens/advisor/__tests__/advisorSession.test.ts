/** The advisor chat kept in memory for the app session. */
import { getAdvisorSession, resetAdvisorSession } from '../advisorSession';

describe('advisorSession', () => {
  afterEach(() => resetAdvisorSession());

  it('starts empty', () => {
    expect(getAdvisorSession()).toEqual({
      state: { answers: {}, held: [] },
      useSaved: null,
      saved: null,
      formDraft: null,
      introDone: false,
      started: false,
      revealCount: 0,
      lastRevealKey: '',
      seenTipIds: [],
      lastQuestionViewed: null,
    });
  });

  it('keeps writes on the live object', () => {
    getAdvisorSession().state = { answers: { opener: 'first' }, held: ['c1'] };
    getAdvisorSession().introDone = true;
    expect(getAdvisorSession().state.answers.opener).toBe('first');
    expect(getAdvisorSession().introDone).toBe(true);
  });

  it('reset empties the same object in place', () => {
    const held = getAdvisorSession();
    held.state = { answers: { opener: 'first' }, held: [] };
    held.useSaved = false;
    held.formDraft = { job: 'self', income: '35000', pincode: '110001' };
    held.seenTipIds.push('t:x');
    resetAdvisorSession();
    expect(getAdvisorSession()).toBe(held);
    expect(held.state).toEqual({ answers: {}, held: [] });
    expect(held.useSaved).toBeNull();
    expect(held.formDraft).toBeNull();
    expect(held.seenTipIds).toEqual([]);
  });
});
