import { describe, expect, it } from 'vitest';
import { defaultSnapshotName } from './snapshots';

describe('defaultSnapshotName', () => {
  it('names a snapshot after the date and time it was taken', () => {
    expect(defaultSnapshotName(new Date(2026, 9, 7, 14, 5))).toBe('Snapshot Oct 7, 2026, 2:05 PM');
  });
});
