import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PixelButton } from '@/components/PixelButton';
import { PixelBorderPanel } from '@/components/PixelBorderPanel';
import { CourtBackground } from '@/components/CourtBackground';
import { DefenderSprite } from '@/components/DefenderSprite';
import { BallSprite } from '@/components/BallSprite';
import { useProgression } from '@/context/ProgressionContext';
import {
  CourtId,
  COURT_UNLOCK_COST,
  DefenderId,
  DEFENDER_UNLOCK_COST,
  SkinId,
  SKIN_UNLOCK_COST,
} from '@/constants/gameConfig';
import { FONT, PALETTE, SPACING } from '@/constants/theme';
import { RootStackParamList } from '@/navigation';
import { lookupCost, xpProgressInLevel } from '@/game/progression';

type Props = NativeStackScreenProps<RootStackParamList, 'Progression'>;

const COURT_LABELS: Record<CourtId, string> = {
  playground: 'PLAYGROUND',
  gym: 'GYM',
  rooftop: 'ROOFTOP',
  space: 'SPACE',
};
const DEFENDER_LABELS: Record<DefenderId, string> = {
  grandpa: 'GRANDPA',
  recLeague: 'REC LEAGUE',
  pro: 'PRO',
  alien: 'ALIEN',
};
const SKIN_LABELS: Record<SkinId, string> = {
  classic: 'CLASSIC',
  neon: 'NEON',
  gold: 'GOLD',
  ghost: 'GHOST',
};

const COURT_IDS: CourtId[] = ['playground', 'gym', 'rooftop', 'space'];
const DEFENDER_IDS: DefenderId[] = ['grandpa', 'recLeague', 'pro', 'alien'];
const SKIN_IDS: SkinId[] = ['classic', 'neon', 'gold', 'ghost'];

export const ProgressionScreen: React.FC<Props> = ({ navigation }) => {
  const { progression, buy, select } = useProgression();
  const { level, xpInLevel, xpForNextLevel } = xpProgressInLevel(progression.totalXp);

  const xpPercent = Math.min(100, Math.round((xpInLevel / Math.max(1, xpForNextLevel)) * 100));

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <Text style={styles.title}>PROGRESSION</Text>

        {/* Level + XP bar */}
        <PixelBorderPanel innerPadding={SPACING.md} color={PALETTE.midnight}>
          <View style={styles.levelRow}>
            <View>
              <Text style={styles.smallText}>LEVEL</Text>
              <Text style={styles.levelText}>{level}</Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: SPACING.md }}>
              <Text style={styles.smallText}>{xpInLevel} / {xpForNextLevel} XP</Text>
              <View style={styles.xpBarTrack}>
                <View style={[styles.xpBarFill, { width: `${xpPercent}%` }]} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.smallText}>POINTS</Text>
              <Text style={styles.pointsText}>{progression.unlockPoints}</Text>
            </View>
          </View>
        </PixelBorderPanel>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <CategorySection
            title="COURTS"
            ids={COURT_IDS}
            labels={COURT_LABELS}
            costs={COURT_UNLOCK_COST as Record<string, number>}
            unlocked={progression.unlocked.courts}
            selected={progression.selected.court}
            unlockPoints={progression.unlockPoints}
            renderPreview={(id) => <CourtPreview id={id as CourtId} />}
            onBuy={(id) => buy('court', id)}
            onSelect={(id) => select('court', id)}
          />
          <CategorySection
            title="DEFENDERS"
            ids={DEFENDER_IDS}
            labels={DEFENDER_LABELS}
            costs={DEFENDER_UNLOCK_COST as Record<string, number>}
            unlocked={progression.unlocked.defenders}
            selected={progression.selected.defender}
            unlockPoints={progression.unlockPoints}
            renderPreview={(id) => <DefenderPreview id={id as DefenderId} />}
            onBuy={(id) => buy('defender', id)}
            onSelect={(id) => select('defender', id)}
          />
          <CategorySection
            title="BALL SKINS"
            ids={SKIN_IDS}
            labels={SKIN_LABELS}
            costs={SKIN_UNLOCK_COST as Record<string, number>}
            unlocked={progression.unlocked.skins}
            selected={progression.selected.skin}
            unlockPoints={progression.unlockPoints}
            renderPreview={(id) => <SkinPreview id={id as SkinId} />}
            onBuy={(id) => buy('skin', id)}
            onSelect={(id) => select('skin', id)}
          />
        </ScrollView>

        <PixelButton label="BACK" color={PALETTE.fog} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    </View>
  );
};

interface CategorySectionProps {
  title: string;
  ids: string[];
  labels: Record<string, string>;
  costs: Record<string, number>;
  unlocked: string[];
  selected: string;
  unlockPoints: number;
  renderPreview: (id: string) => React.ReactNode;
  onBuy: (id: string) => Promise<boolean>;
  onSelect: (id: string) => Promise<boolean>;
}
const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  ids,
  labels,
  costs,
  unlocked,
  selected,
  unlockPoints,
  renderPreview,
  onBuy,
  onSelect,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {ids.map((id) => {
      const isUnlocked = unlocked.includes(id);
      const isSelected = selected === id;
      const cost = costs[id] ?? 0;
      const canAfford = unlockPoints >= cost;
      return (
        <View key={id} style={styles.row}>
          <View style={styles.preview}>{renderPreview(id)}</View>
          <View style={styles.rowMid}>
            <Text style={styles.rowLabel}>{labels[id]}</Text>
            {!isUnlocked && (
              <Text style={styles.costLabel}>COST {cost} PT{cost === 1 ? '' : 'S'}</Text>
            )}
            {isUnlocked && isSelected && <Text style={styles.equippedLabel}>EQUIPPED</Text>}
          </View>
          <View style={styles.rowAction}>
            {isUnlocked ? (
              <PixelButton
                label={isSelected ? '✓' : 'EQUIP'}
                size="sm"
                color={isSelected ? PALETTE.greenGo : PALETTE.yellowBright}
                disabled={isSelected}
                onPress={() => onSelect(id)}
              />
            ) : (
              <PixelButton
                label="UNLOCK"
                size="sm"
                color={canAfford ? PALETTE.orangeBall : PALETTE.fog}
                disabled={!canAfford}
                onPress={() => onBuy(id)}
              />
            )}
          </View>
        </View>
      );
    })}
  </View>
);

const CourtPreview: React.FC<{ id: CourtId }> = ({ id }) => (
  <View style={styles.previewBox}>
    <CourtBackground width={56} height={40} court={id} perspective="offense" />
  </View>
);

const DefenderPreview: React.FC<{ id: DefenderId }> = ({ id }) => (
  <View style={styles.previewBox}>
    <DefenderSprite size={36} variant={id} frame={0} />
  </View>
);

const SKIN_TINTS: Record<SkinId, string> = {
  classic: PALETTE.orangeBall,
  neon: PALETTE.greenGo,
  gold: PALETTE.yellowBright,
  ghost: PALETTE.purpleSpace,
};
const SkinPreview: React.FC<{ id: SkinId }> = ({ id }) => (
  <View style={[styles.previewBox, { backgroundColor: SKIN_TINTS[id], padding: 4 }]}>
    <BallSprite size={32} />
  </View>
);

// Sanity-check imports
void lookupCost;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.midnight },
  safe: { flex: 1, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  title: {
    fontFamily: FONT.family,
    fontSize: FONT.titleL,
    color: PALETTE.orangeBall,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: SPACING.md,
    textShadowColor: PALETTE.black,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallText: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
    marginBottom: 2,
  },
  levelText: {
    fontFamily: FONT.family,
    fontSize: FONT.titleL,
    color: PALETTE.yellowBright,
  },
  pointsText: {
    fontFamily: FONT.family,
    fontSize: FONT.titleM,
    color: PALETTE.orangeBall,
  },
  xpBarTrack: {
    height: 14,
    backgroundColor: PALETTE.shadow,
    borderWidth: 2,
    borderColor: PALETTE.black,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: PALETTE.greenGo,
  },
  scroll: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONT.family,
    fontSize: FONT.body,
    color: PALETTE.lineWhite,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.shadow,
    borderWidth: 2,
    borderColor: PALETTE.black,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  preview: { marginRight: SPACING.sm },
  previewBox: {
    width: 56,
    height: 40,
    backgroundColor: PALETTE.midnight,
    borderWidth: 2,
    borderColor: PALETTE.black,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowMid: { flex: 1 },
  rowLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.small,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
  },
  costLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.fog,
    letterSpacing: 1,
    marginTop: 4,
  },
  equippedLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.greenGo,
    letterSpacing: 1,
    marginTop: 4,
  },
  rowAction: { marginLeft: SPACING.sm },
});
