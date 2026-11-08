import * as React from 'react';
import { getTheme, Text } from '@fluentui/react';

export type KpiTone = 'good' | 'info' | 'warning' | 'danger';

export interface IKpiTileProps {
  label: string;
  value: number;
  tone: KpiTone;
}

/** Number card for the dashboard. Colors come from the SharePoint theme, not fixed hex values. */
const KpiTile: React.FC<IKpiTileProps> = ({ label, value, tone }) => {
  const theme = getTheme();
  const accent: Record<KpiTone, string> = {
    good: theme.palette.green,
    info: theme.palette.themePrimary,
    warning: theme.palette.orange,
    danger: theme.palette.redDark
  };

  return (
    <div
      role="group"
      aria-label={`${label}: ${value}`}
      style={{
        minWidth: 150,
        padding: '12px 16px',
        background: theme.palette.neutralLighter,
        borderLeft: `4px solid ${accent[tone]}`,
        borderRadius: 2
      }}
    >
      <Text variant="mediumPlus" block>{label}</Text>
      <Text variant="superLarge" block styles={{ root: { color: accent[tone], fontWeight: 600 } }}>{value}</Text>
    </div>
  );
};

export default KpiTile;
