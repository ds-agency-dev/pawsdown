import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Draft } from '@/data/evening';
import { useClockOut, useDraft, useUpdateDraft } from '@/data/evening-store';
import { usePet, useSwitchOff, useWorkday } from '@/data/profile-store';
import { DeskScene } from '@/desk/DeskScene';
import { CARD_PARTS, type DeskPart, type DeskScript, filedCount, type NoteState } from '@/desk/draw';
import { BoundaryEditor } from '@/desk/editor/BoundaryEditor';
import { CardEditor } from '@/desk/editor/CardEditor';
import { type LiftFrom, PET_PEEK_PT, type LiftTo } from '@/desk/editor/LiftSheet';
import { WinEditor } from '@/desk/editor/WinEditor';
import { BUTTON, CARD, FAN, IDLE, NOTE, shutdownCues, TICKET } from '@/desk/timeline';
import { useBeatCues } from '@/desk/use-beat-cues';
import { useMinute } from '@/desk/use-minute';
import { type ShutdownPhase, useShutdown } from '@/desk/use-shutdown';
import { color, menu, motion } from '@/design/tokens';
import { pickFeedback, tapFeedback } from '@/motion/feedback';
import { clockLabel, shortClock } from '@/notifications/nudge';
import { type SizedArtGrid, useArtGrid, useCanvasSize } from '@/render/swirl';

const A = menu.artPt;

interface ArtRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A scene rect (art px) in points on this screen. */
function toPt(art: SizedArtGrid, r: ArtRect) {
  return {
    x: (art.originX + r.x) * art.unitPt,
    y: (art.originY + r.y) * art.unitPt,
    w: r.w * art.unitPt,
    h: r.h * art.unitPt,
  };
}

/** Absolute style covering a scene rect, for touch targets laid over the Skia art. */
function over(art: SizedArtGrid, r: ArtRect) {
  const p = toPt(art, r);
  return { position: 'absolute' as const, left: p.x, top: p.y, width: p.w, height: p.h };
}

/** Grows a small art rect around its centre to the minimum touch size. */
function touchable(art: SizedArtGrid, r: ArtRect): ArtRect {
  const min = menu.minTouchPt / art.unitPt;
  const w = Math.max(r.w, min);
  const h = Math.max(r.h, min);
  return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w, h };
}

const CARD_SLOTS: readonly ArtRect[] = FAN.map((f) => ({
  x: f.x - CARD.w / 2,
  y: f.y - CARD.h / 2,
  w: CARD.w,
  h: CARD.h,
}));

/** Where the pieces rest on the desk: the editor flies from and back to these. */
function deskRect(part: DeskPart): ArtRect & { rotDeg: number } {
  if (part === 'win') return { ...TICKET, rotDeg: 0 };
  if (part === 'boundary') return { ...NOTE, rotDeg: 0 };
  const slot = CARD_PARTS.indexOf(part);
  const f = FAN[slot] ?? FAN[0];
  return { x: f.x - CARD.w / 2, y: f.y - CARD.h / 2, w: CARD.w, h: CARD.h, rotDeg: (f.r * 180) / Math.PI };
}

/** Keyboards (with the suggestion bar) take up to ~42% of the window on iPhones; editors stay above that. */
const KEYBOARD_SHARE = 0.42;

function withCard(cards: Draft['cards'], slot: number, text: string): Draft['cards'] {
  return [slot === 0 ? text : cards[0], slot === 1 ? text : cards[1], slot === 2 ? text : cards[2]];
}

function noteState(draft: Pick<Draft, 'boundary' | 'boundaryDone'>): NoteState {
  if (!draft.boundary) return 'blank';
  return draft.boundaryDone ? 'done' : 'set';
}

const BUTTON_LABEL: Record<ShutdownPhase, string> = {
  idle: 'Clock out',
  filing: 'Skip',
  hold: 'Lights out',
  night: 'Skip',
  done: 'See you tomorrow',
};

/** What tonight's clock-out filed, kept for the sequence after the draft is emptied. */
interface Filed {
  readonly draft: Draft;
  readonly evenings: number;
}

export default function Desk() {
  const pet = usePet();
  const workday = useWorkday();
  const switchOff = useSwitchOff();
  const draft = useDraft();
  const updateDraft = useUpdateDraft();
  const clockOut = useClockOut();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [size, onLayout] = useCanvasSize();
  const art = useArtGrid(size, insets.top);
  const now = useMinute();
  const seq = useSharedValue(IDLE);
  const held = useSharedValue(0);
  const deskTurn = useSharedValue(1);
  const shutdown = useShutdown(seq);
  const { phase } = shutdown;
  const [editing, setEditing] = useState<DeskPart | null>(null);
  const [closing, setClosing] = useState(false);
  const [filed, setFiled] = useState<Filed | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  // Async failures (saving the draft or the evening) reach the root ErrorBoundary instead of failing silently.
  if (error) throw error;

  const shown = phase !== 'idle' && filed ? filed.draft : draft;
  const cues = useMemo(
    () =>
      filed
        ? shutdownCues(
            filed.draft.cards.map((c) => c.length > 0),
            filed.draft.win.length > 0,
            filed.evenings,
          )
        : [],
    [filed],
  );
  useBeatCues(seq, cues);
  const evenings = filed?.evenings ?? 1;
  const minute = now.getHours() * 60 + now.getMinutes();
  const script = useMemo<DeskScript>(
    () => ({
      time: clockLabel(minute),
      ask: phase === 'idle' ? `Clock out at ${shortClock(workday.endMinute)}` : 'Ready to clock out?',
      tasks: shown.cards,
      win: shown.win,
      note: noteState(shown),
      editing,
      evenings,
      button: 'Clock out',
      topLabel: "Tomorrow's top 3",
      asleep: false,
      panelTitle: `Evening ${evenings}:`,
      panelCaption: `${pet?.name ?? ''} clocks in`,
    }),
    [minute, workday.endMinute, phase, shown, editing, evenings, pet?.name],
  );

  const save = useCallback(
    (patch: Partial<Omit<Draft, 'day'>>) => {
      updateDraft(patch).catch(setError);
      setClosing(true);
    },
    [updateDraft],
  );
  const onClosed = useCallback(() => {
    setEditing(null);
    setClosing(false);
  }, []);

  if (!pet) return null;

  const open = (part: DeskPart) => {
    if (phase !== 'idle' || editing) return;
    pickFeedback(false);
    setEditing(part);
  };

  const startClockOut = () => {
    const firstEmpty = draft.cards.findIndex((c) => c.trim().length === 0);
    // Clocking out needs one card; with none, the button opens the first slot instead of doing nothing.
    if (filedCount(draft.cards.map((c) => c.trim())) === 0) {
      open(CARD_PARTS[Math.max(0, firstEmpty)] ?? 'card0');
      return;
    }
    if (saving) return;
    tapFeedback();
    setSaving(true);
    const snapshot = draft;
    clockOut()
      .then((count) => {
        setFiled({ draft: snapshot, evenings: count });
        shutdown.start();
      })
      .catch(setError)
      .finally(() => setSaving(false));
  };

  // Idle, the hold and the end wait for the button; while an act plays, a tap anywhere skips ahead.
  const buttonOnly = phase === 'idle' || phase === 'hold' || phase === 'done';
  const onButton = () => {
    if (phase === 'idle') startClockOut();
    else if (phase === 'hold') {
      tapFeedback();
      shutdown.lightsOut();
    } else if (phase === 'done') {
      shutdown.reset();
      setFiled(null);
    } else shutdown.skip();
  };

  // Editors settle near the top, under the pet's peek, and fit above the keyboard on the smallest phone.
  const width = size?.width ?? window.width;
  const top = insets.top + PET_PEEK_PT + 4 * A;
  const sheetW = Math.min(width - 8 * A, 360);
  const sheetTo: LiftTo = { x: (width - sheetW) / 2, y: top, w: sheetW };
  const roomForCard = window.height * (1 - KEYBOARD_SHARE) - top - menu.minTouchPt - 6 * A;
  const cardW = Math.min(width - 16 * A, 300, (roomForCard * CARD.w) / CARD.h);
  const cardTo: LiftTo = { x: (width - cardW) / 2, y: top, w: cardW };
  const fromOf = (part: DeskPart): LiftFrom => {
    const r = deskRect(part);
    return { ...toPt(art, r), rotDeg: r.rotDeg };
  };
  const slot = CARD_PARTS.findIndex((p) => p === editing);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <DeskScene script={script} pet={pet} art={art} seq={seq} held={held} flip={deskTurn} />
      <View
        style={over(art, { x: 0, y: 4, w: 135, h: 20 })}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${script.time}. ${script.ask}`}
      />
      {phase === 'idle' && (
        <>
          {CARD_SLOTS.map((r, i) => {
            const task = draft.cards[i] ?? '';
            const part = CARD_PARTS[i] ?? 'card0';
            return (
              <Pressable
                key={part}
                style={over(art, r)}
                onPress={() => open(part)}
                accessibilityRole="button"
                accessibilityLabel={`Tomorrow, card ${i + 1}: ${task || 'empty'}`}
                accessibilityHint="Lifts the card to write on"
              />
            );
          })}
          <Pressable
            style={over(art, TICKET)}
            onPress={() => open('win')}
            accessibilityRole="button"
            accessibilityLabel={`Today's win: ${draft.win || 'empty'}`}
          />
          <Pressable
            style={over(art, touchable(art, NOTE))}
            onPress={() => open('boundary')}
            accessibilityRole="button"
            accessibilityLabel={`Boundary move: ${draft.boundary || 'none yet'}${draft.boundaryDone ? ', done' : ''}`}
          />
        </>
      )}
      <Pressable
        style={buttonOnly ? over(art, { ...BUTTON, h: BUTTON.h + 2 }) : StyleSheet.absoluteFill}
        onPressIn={() => held.set(withSpring(1, motion.springs.snap))}
        onPressOut={() => held.set(withSpring(0, motion.springs.snap))}
        onPress={onButton}
        accessibilityRole="button"
        accessibilityLabel={BUTTON_LABEL[phase]}
      />
      {slot >= 0 && (
        <CardEditor
          slot={slot}
          initial={draft.cards[slot] ?? ''}
          from={fromOf(editing ?? 'card0')}
          to={cardTo}
          deskTurn={deskTurn}
          height={(cardW * CARD.h) / CARD.w}
          pet={pet}
          closing={closing}
          onDone={(text) => save({ cards: withCard(draft.cards, slot, text.trim()) })}
          onClosed={onClosed}
        />
      )}
      {editing === 'win' && (
        <WinEditor
          initial={draft.win}
          from={fromOf('win')}
          to={sheetTo}
          deskTurn={deskTurn}
          pet={pet}
          closing={closing}
          onDone={(text) => save({ win: text.trim() })}
          onClosed={onClosed}
        />
      )}
      {editing === 'boundary' && (
        <BoundaryEditor
          initial={{ text: draft.boundary, done: draft.boundaryDone }}
          switchOff={switchOff}
          from={fromOf('boundary')}
          to={sheetTo}
          deskTurn={deskTurn}
          pet={pet}
          closing={closing}
          onDone={(answer) => save({ boundary: answer.text.trim(), boundaryDone: answer.done })}
          onClosed={onClosed}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surfaceDeep },
});
