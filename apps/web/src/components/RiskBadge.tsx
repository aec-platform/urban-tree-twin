import clsx from 'clsx';
import type { RiskLevel } from '@utt/shared';

const styles: Record<RiskLevel | 'UNASSESSED', string> = {
  LOW: 'bg-risk-low/15 text-risk-low',
  MODERATE: 'bg-risk-moderate/15 text-risk-moderate',
  HIGH: 'bg-risk-high/15 text-risk-high',
  EXTREME: 'bg-risk-extreme/15 text-risk-extreme',
  UNASSESSED: 'bg-canopy-100 text-canopy-700',
};

const label: Record<RiskLevel | 'UNASSESSED', string> = {
  LOW: 'Thấp',
  MODERATE: 'Trung bình',
  HIGH: 'Cao',
  EXTREME: 'Cực cao',
  UNASSESSED: 'Chưa đánh giá',
};

export function RiskBadge({ level }: { level: RiskLevel | null | undefined }) {
  const key = level ?? 'UNASSESSED';
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles[key],
      )}
    >
      {label[key]}
    </span>
  );
}
