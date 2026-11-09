/**
 * WithdrawTerms — Withdraw "Terms & Conditions" screen, shared across methods.
 *
 * The `variant` route param selects which method's copy to show (UPI / bank
 * transfer / Amazon Pay / Flipkart) — see termsContent.ts, sourced from Figma
 * (upi 2898:166743, bank 2898:166869, amazon 2898:166847, flipkart 2898:166825).
 *
 * Composition:
 *   - <Header leading='back' title='Terms & Conditions' />   (organism)
 *   - section title (Heading/18/Semi Bold)
 *   - one block per section: Body/14/Semi Bold heading + a Body/14/Regular
 *     paragraph and/or a disc-bullet list. A block's optional `emailBullet`
 *     renders a final bullet ending in the tappable support email.
 *
 * Tokens: bg background/default; section gap Spacing/24; in-block gap Spacing/8;
 * horizontal Spacing/24; title Heading/18/Semi Bold; sub-headings Body/14/Semi
 * Bold text/primary; body + bullets Body/14/Regular text/secondary; link
 * text/link.
 */
import React from 'react';
import { View, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FocusAwareStatusBar as StatusBar } from '../../navigation/FocusAwareStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text } from '../../atoms';
import { Header } from '../../organisms';
import { colors, spacing } from '../../tokens';
import type { WithdrawStackParamList } from '../../navigation/types';
import { WITHDRAW_TERMS, SUPPORT_EMAIL, type TermsBlock } from './termsContent';

type Nav = NativeStackNavigationProp<WithdrawStackParamList, 'WithdrawTerms'>;
type Rt = RouteProp<WithdrawStackParamList, 'WithdrawTerms'>;

// Hanging-indent column for the bullet glyph (matches DiscBulletList).
const BULLET_INDENT = 21;

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ width: BULLET_INDENT }}>
        <Text variant="body14Regular" color={colors.text.secondary}>
          {'•'}
        </Text>
      </View>
      <Text variant="body14Regular" color={colors.text.secondary} style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

function Block({ block }: { block: TermsBlock }) {
  return (
    <View style={{ paddingHorizontal: spacing[24], gap: spacing[8] }}>
      <Text variant="body14SemiBold" color={colors.text.primary}>
        {block.heading}
      </Text>

      {block.body ? (
        <Text variant="body14Regular" color={colors.text.secondary}>
          {block.body}
        </Text>
      ) : null}

      {block.bullets?.map((t, i) => <Bullet key={i}>{t}</Bullet>)}

      {block.emailBullet ? (
        <Bullet>
          {block.emailBullet}
          <Text
            variant="body14Regular"
            color={colors.text.link}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            {SUPPORT_EMAIL}
          </Text>
        </Bullet>
      ) : null}
    </View>
  );
}

export function WithdrawTerms() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  // Default to UPI for safety if a caller forgets the param.
  const content = WITHDRAW_TERMS[params?.variant ?? 'upi'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.default }}>
      <StatusBar style="dark" />

      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            gap: spacing[24],
            paddingBottom: spacing[24],
          }}
        >
          <Header
            leading="back"
            title="Terms & Conditions"
            onLeadingPress={() => navigation.goBack()}
          />

          {/* Section title (e.g. "Amazon Pay Balance"). */}
          <View style={{ paddingHorizontal: spacing[24] }}>
            <Text variant="heading18SemiBold" color={colors.text.primary}>
              {content.title}
            </Text>
          </View>

          {content.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
