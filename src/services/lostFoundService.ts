import { dataSource } from '@/constants/config';
import type { LostFoundReport, LostFoundType, TransportMode } from '@/types';
import { createId, createReference } from '@/utils/id';

/**
 * Lost & Found reporting. Mock backend for now — `submitReport` simulates a
 * depot-system round-trip and returns a stored report with a reference number.
 * Point `HttpLostFoundProvider` at the real DPMK dispatcher API later.
 */

export interface LostFoundInput {
  type: LostFoundType;
  description: string;
  mode: TransportMode;
  routeShortName: string;
  date: string;
  timeWindow: string;
  contactEmail: string;
  contactPhone: string;
  photoUri?: string;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const lostFoundService = {
  async submitReport(input: LostFoundInput): Promise<LostFoundReport> {
    if (!dataSource.useMockLostFound) {
      throw new Error('Live Lost & Found backend not configured.');
    }
    await delay(900);
    return {
      id: createId('lf'),
      type: input.type,
      description: input.description.trim(),
      mode: input.mode,
      routeShortName: input.routeShortName,
      date: input.date,
      timeWindow: input.timeWindow,
      contactEmail: input.contactEmail.trim(),
      contactPhone: input.contactPhone.trim(),
      photoUri: input.photoUri,
      status: 'open',
      createdAt: new Date().toISOString(),
      reference: createReference('LF'),
    };
  },

  /** Simulated status progression for the "Your reports" list. */
  projectedStatusNote(report: LostFoundReport): string {
    const ageHours = (Date.now() - new Date(report.createdAt).getTime()) / 3_600_000;
    if (report.status === 'resolved') return 'Vyriešené — kontaktujeme vás';
    if (report.status === 'matched') return 'Možná zhoda nájdená v depe';
    if (ageHours < 24) return 'Hľadáme v depe';
    return 'Depo tím preveruje';
  },
};
