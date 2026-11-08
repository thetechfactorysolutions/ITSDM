import * as React from 'react';

/**
 * Responsive form layout: as many columns as fit (each at least 260px wide), a single column on
 * narrow screens. Wrap a field in <FormRow full> to make it span the whole width.
 */
export const FormGrid: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px 16px', alignItems: 'start' }}>
    {children}
  </div>
);

export const FormRow: React.FC<{ full?: boolean; children?: React.ReactNode }> = ({ full, children }) => (
  <div style={full ? { gridColumn: '1 / -1' } : undefined}>{children}</div>
);
