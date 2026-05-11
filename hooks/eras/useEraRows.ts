// Builds the LegendList row data for the eras tab.
// - Splits eras into "available" (active/premium) and "coming soon"
// - Pairs grid-layout cards into 2-column rows; full_width cards stand alone
// - Inserts a section header row between the two groups

import { useMemo } from 'react';

import { Era } from '@/hooks/useEras';

export type EraRow = {
  type: 'full' | 'grid' | 'sectionHeader';
  eras: Era[];
  label?: string;
};

export function buildEraRows(eraList: Era[]): EraRow[] {
  const result: EraRow[] = [];
  let i = 0;
  while (i < eraList.length) {
    const era = eraList[i];
    if (era.card_layout === 'full_width') {
      result.push({ type: 'full', eras: [era] });
      i++;
    } else {
      const pair: Era[] = [era];
      if (i + 1 < eraList.length && eraList[i + 1].card_layout === 'grid') {
        pair.push(eraList[i + 1]);
        i += 2;
      } else {
        i++;
      }
      result.push({ type: 'grid', eras: pair });
    }
  }
  return result;
}

export function useEraRows(eras: Era[]): EraRow[] {
  return useMemo(() => {
    const sorted = [...eras].sort((a, b) => a.order_by - b.order_by);

    const available = sorted.filter((e) => e.status === 'active' || e.status === 'premium');
    const comingSoon = sorted.filter((e) => e.status !== 'active' && e.status !== 'premium');

    const rows: EraRow[] = buildEraRows(available);

    if (comingSoon.length > 0) {
      rows.push({ type: 'sectionHeader', eras: [], label: 'Eras Coming Soon...' });
      rows.push(...buildEraRows(comingSoon));
    }

    return rows;
  }, [eras]);
}
