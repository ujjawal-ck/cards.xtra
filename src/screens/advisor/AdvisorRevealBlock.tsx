/**
 * AdvisorRevealBlock: the current cards, as the advisor's message.
 *
 * A left bubble with the header (and the note when something did not match as asked), then ONE
 * horizontal rail with a tile per top card, the "Undo" line when cards were hidden by "I have this",
 * the "final decision" caption when a card is likely to qualify, and "See all" that opens the full
 * list as its own page.
 *
 * The rail bleeds to the screen edges: its first tile starts at the bubbles' left edge and the
 * next tile peeks in from the right. Every tile has the same height (the row stretches them).
 * Each tile stays its own accessible element: the block is not one element.
 */
import React from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Text } from '../../atoms';
import { colors, spacing, sizing } from '../../tokens';
import type { CardModel } from '../../molecules';
import type { AdvisorReveal, ProofLevel } from '../../lib/advisor/types';
import { AdvisorBubble, CHAT_GUTTER } from './AdvisorChatBubble';
import { AdvisorCardTile } from './AdvisorCardTile';
import { AdvisorMessageEntrance } from './AdvisorMessageEntrance';

/** A tile takes this share of the window width, so the next tile peeks. A layout ratio. */
const TILE_WIDTH_RATIO = 0.72;
/** Tile width bounds (dp). No size token covers a card tile width. */
const TILE_MIN_WIDTH = 240;
const TILE_MAX_WIDTH = 300;
const TILE_GAP = spacing[12];

export function AdvisorRevealBlock({
  header,
  note,
  reveal,
  onSeeAll,
  onOpen,
  onHaveThis,
  heldCount,
  onUndoHeld,
  animateTiles,
  tileDelay,
  tileStagger,
}: {
  header: string;
  /** The honest line under the header, or undefined. The screen passes reveal.note unless the
   *  same line already stands in the chat as its own message. */
  note?: string;
  reveal: AdvisorReveal;
  /** Opens the full list page. */
  onSeeAll: () => void;
  /** slot is 1-based for a rail tile. */
  onOpen: (card: CardModel, slot: number, proof: ProofLevel) => void;
  onHaveThis: (card: CardModel) => void;
  /** How many cards "I have this" hid. */
  heldCount: number;
  /** Brings back the card hidden last. */
  onUndoHeld: () => void;
  /** True when the block itself is new and entrances may run (iOS, reduce motion off). */
  animateTiles: boolean;
  /** ms before the first tile starts. */
  tileDelay: number;
  /** ms between tiles. */
  tileStagger: number;
}) {
  const { width } = useWindowDimensions();
  const tileWidth = Math.min(TILE_MAX_WIDTH, Math.max(TILE_MIN_WIDTH, Math.round(width * TILE_WIDTH_RATIO)));

  return (
    <View style={{ gap: spacing[8] }}>
      <AdvisorBubble accessibilityLabel={`Swipey: ${[header, note].filter(Boolean).join('. ')}`}>
        <Text variant="body15SemiBold" color={colors.text.primary}>
          {header}
        </Text>
        {note ? (
          <Text variant="body12Regular" color={colors.text.secondary}>
            {note}
          </Text>
        ) : null}
      </AdvisorBubble>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={tileWidth + TILE_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        style={{ marginHorizontal: -CHAT_GUTTER }}
        contentContainerStyle={{ paddingHorizontal: CHAT_GUTTER, gap: TILE_GAP, alignItems: 'stretch' }}
      >
        {reveal.top.map((t, i) => (
          <AdvisorMessageEntrance
            key={t.card.id}
            id={t.card.id}
            animate={animateTiles}
            delay={tileDelay + i * tileStagger}
            style={{ width: tileWidth }}
          >
            <AdvisorCardTile
              card={t.card}
              label={t.label}
              proof={t.proof}
              reason={t.reason}
              isNew={t.isNew}
              onPress={() => onOpen(t.card, i + 1, t.proof)}
              onHaveThis={() => onHaveThis(t.card)}
            />
          </AdvisorMessageEntrance>
        ))}
      </ScrollView>

      {heldCount > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing[12] }}>
          <Text variant="body12Regular" color={colors.text.secondary} style={{ flexShrink: 1 }}>
            {heldCount === 1 ? '1 card hidden because you have it.' : `${heldCount} cards hidden because you have them.`}
          </Text>
          <Pressable
            onPress={onUndoHeld}
            accessibilityRole="button"
            accessibilityLabel="Undo, show the hidden card again"
            style={{ minHeight: sizing.touchMin, justifyContent: 'center' }}
          >
            <Text variant="body12SemiBold" color={colors.text.link}>
              Undo
            </Text>
          </Pressable>
        </View>
      ) : null}

      {reveal.proof === 'likely' || reveal.total > 3 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing[12] }}>
          {reveal.proof === 'likely' ? (
            <Text variant="body12Regular" color={colors.text.secondary} style={{ flexShrink: 1 }}>
              The bank makes the final decision.
            </Text>
          ) : null}
          {reveal.total > 3 ? (
            <Pressable
              onPress={onSeeAll}
              accessibilityRole="button"
              style={{ minHeight: sizing.touchMin, justifyContent: 'center' }}
            >
              <Text variant="body12SemiBold" color={colors.text.link}>
                {`See all ${reveal.total} cards`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
