/**
 * Presentation helpers for DPMK service alerts — the single place that maps the
 * backend `ServiceAlert` model onto Slovak labels, design-system tones and
 * icons. Screens/components stay declarative and consistent.
 */
import type { Ionicons } from '@expo/vector-icons';

import type { BadgeTone } from '@/components/ui/StatusBadge';
import { colors } from '@/constants/theme';
import { getRoute } from '@/data/routes';
import type {
  AlertSeverity,
  AlertStatus,
  AlertStopRef,
  AlertType,
  ServiceAlert,
  TransportMode,
} from '@/types';
import { formatClock, formatDate } from '@/utils/format';

type IconName = keyof typeof Ionicons.glyphMap;

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  connection_cancelled: 'Výpadok spoja',
  delays: 'Meškanie spojov',
  planned: 'Plánovaná výluka',
  other: 'Informácia',
};

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  active: 'Aktívne',
  upcoming: 'Plánované',
  ended: 'Ukončené',
};

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  severe: 'Vážne obmedzenie',
  major: 'Dôležité',
  minor: 'Obmedzenie',
  info: 'Informácia',
};

export interface AlertVisual {
  /** Tone for `StatusBadge`. */
  tone: BadgeTone;
  /** Strong colour — icon chip background, title text. */
  accent: string;
  /** Pale surface behind the whole card / strip. */
  tint: string;
  /** Border that reads on the tint. */
  border: string;
  /** Secondary (body) text colour that stays legible on the tint. */
  body: string;
  icon: IconName;
}

const SEVERITY_VISUAL: Record<AlertSeverity, Omit<AlertVisual, 'icon'>> = {
  severe: {
    tone: 'error',
    accent: colors.error,
    tint: colors.errorTint,
    border: '#F6D6D3',
    body: colors.errorText,
  },
  major: {
    tone: 'warning',
    accent: colors.warning,
    tint: colors.warningTint,
    border: '#F0E2B3',
    body: '#7A5B06',
  },
  minor: {
    // low severity — a plain surface with just an amber accent bar/icon
    tone: 'warning',
    accent: colors.warning,
    tint: colors.surface,
    border: colors.border,
    body: colors.textSecondary,
  },
  info: {
    tone: 'info',
    accent: colors.primary,
    tint: colors.primaryTint,
    border: colors.border,
    body: colors.textSecondary,
  },
};

function iconFor(type: AlertType, severity: AlertSeverity): IconName {
  if (type === 'planned') return 'construct';
  if (type === 'delays') return 'time';
  if (type === 'connection_cancelled') return 'close-circle';
  return severity === 'info' ? 'information-circle' : 'warning';
}

/** Colour + icon treatment for an alert, keyed on severity and type. */
export function alertVisual(alert: Pick<ServiceAlert, 'severity' | 'type'>): AlertVisual {
  return { ...SEVERITY_VISUAL[alert.severity], icon: iconFor(alert.type, alert.severity) };
}

/** Transport mode for a route short name, defaulting to bus when unknown. */
export function routeMode(shortName: string): TransportMode {
  return getRoute(shortName)?.mode ?? 'bus';
}

/**
 * A short "when" line for a card: a planned window as dates, an operational
 * restoration estimate as a time, else `null` (never invented).
 */
export function alertWhenText(alert: ServiceAlert): string | null {
  const from = alert.validFrom ? new Date(alert.validFrom) : null;
  const to = alert.validTo ? new Date(alert.validTo) : null;

  if (alert.type === 'planned') {
    if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
    if (from) return `Od ${formatDate(from)}`;
    if (to) return `Do ${formatDate(to)}`;
    return null;
  }
  if (to) return `Predpokladané obnovenie o ${formatClock(to)}`;
  return null;
}

/** The affected-stops line for a card ("Zastávka X" / "Zastávky X, Y"). */
export function alertStopsText(alert: ServiceAlert): string | null {
  const names = Array.from(new Set(alert.affectedStops.map((s) => s.name)));
  if (names.length === 0) return null;
  if (names.length === 1) return `Zastávka ${names[0]}`;
  if (names.length <= 3) return `Zastávky ${names.join(', ')}`;
  return `Zastávky ${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

/** True when this affected stop can be opened in StopDetail (resolved + real id). */
export function stopRefIsNavigable(ref: AlertStopRef): boolean {
  return (
    (ref.confidence === 'exact' || ref.confidence === 'fuzzy') &&
    typeof ref.id === 'string' &&
    ref.id.length > 0
  );
}
