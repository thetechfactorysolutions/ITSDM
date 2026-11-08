import * as React from 'react';
import { getTheme, Stack, Text } from '@fluentui/react';
import { useT } from '../../i18n/I18n';

export interface IChartBar {
  name: string;
  value: number;
  color: string;
}

export interface IChartRow {
  label: string;
  bars: IChartBar[];
}

export interface IBarChartProps {
  title: string;
  rows: IChartRow[];
  formatValue?: (value: number) => string;
}

const ROW_HEIGHT = 22;
const BAR_HEIGHT = 14;
const LABEL_WIDTH = 150;
const VALUE_WIDTH = 80;
const CHART_WIDTH = 600;

/**
 * Horizontal bar chart drawn as SVG (no chart library). It scales to the width of its container,
 * and a table with the same numbers is available for screen readers and for copying.
 */
const BarChart: React.FC<IBarChartProps> = ({ title, rows, formatValue }) => {
  const t = useT();
  const theme = getTheme();
  const format = formatValue ?? ((v: number) => String(v));
  const max = Math.max(1, ...rows.map(row => Math.max(0, ...row.bars.map(bar => bar.value))));
  const barArea = CHART_WIDTH - LABEL_WIDTH - VALUE_WIDTH;
  const rowHeight = Math.max(ROW_HEIGHT, rows.reduce((m, r) => Math.max(m, r.bars.length), 1) * (BAR_HEIGHT + 2) + 8);
  const height = rows.length * rowHeight + 4;
  const names = rows.length > 0 ? rows[0].bars.map(bar => bar) : [];

  return (
    <Stack tokens={{ childrenGap: 6 }} styles={{ root: { minWidth: 280, flex: '1 1 320px' } }}>
      <Text variant="large" as="h3">{title}</Text>
      {rows.length === 0 ? (
        <Text>{t('chart.noData')}</Text>
      ) : (
        <>
          <svg viewBox={`0 0 ${CHART_WIDTH} ${height}`} width="100%" role="img" aria-label={`${title}: ${rows.map(r => `${r.label} ${r.bars.map(b => format(b.value)).join('/')}`).join(', ')}`}>
            {rows.map((row, rowIndex) => {
              const top = rowIndex * rowHeight + 2;
              return (
                <g key={row.label}>
                  <text x={0} y={top + rowHeight / 2} dominantBaseline="middle" fontSize="12" fill={theme.palette.neutralPrimary}>
                    {row.label.length > 22 ? `${row.label.slice(0, 21)}…` : row.label}
                  </text>
                  {row.bars.map((bar, barIndex) => {
                    const width = Math.max(bar.value > 0 ? 2 : 0, (Math.max(0, bar.value) / max) * barArea);
                    const y = top + 4 + barIndex * (BAR_HEIGHT + 2);
                    return (
                      <g key={bar.name}>
                        <rect x={LABEL_WIDTH} y={y} width={width} height={BAR_HEIGHT} rx={2} fill={bar.color} />
                        <text x={LABEL_WIDTH + width + 6} y={y + BAR_HEIGHT / 2} dominantBaseline="middle" fontSize="11" fill={theme.palette.neutralSecondary}>
                          {format(bar.value)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
          {names.length > 1 && (
            <Stack horizontal wrap tokens={{ childrenGap: 12 }}>
              {names.map(bar => (
                <span key={bar.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, background: bar.color, display: 'inline-block' }} />{bar.name}
                </span>
              ))}
            </Stack>
          )}
          <details>
            <summary>{t('chart.showTable')}</summary>
            <table style={{ borderCollapse: 'collapse', marginTop: 4 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left', paddingRight: 12 }} />
                  {names.map(bar => <th key={bar.name} scope="col" style={{ textAlign: 'right', paddingLeft: 12 }}>{bar.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.label}>
                    <th scope="row" style={{ textAlign: 'left', paddingRight: 12, fontWeight: 400 }}>{row.label}</th>
                    {row.bars.map(bar => <td key={bar.name} style={{ textAlign: 'right', paddingLeft: 12 }}>{format(bar.value)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Stack>
  );
};

export default BarChart;
