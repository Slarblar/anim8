import { describe, expect, it } from 'vitest';
import { copiedRuns, copyReport } from '@/lib/scoop-copycheck';

const source = 'Police in South Jordan drew their weapons during an arrest near 10600 South 10th West on Saturday. "We had reason to believe he was armed," Sgt. Jane Doe said.';

describe('copy check', () => {
  it('finds a copied run of 7+ words', () => {
    expect(copiedRuns(source, 'Officers say police in South Jordan drew their weapons during an arrest on Saturday.')).toEqual([
      'police in south jordan drew their weapons during an arrest',
    ]);
  });
  it('ignores exact quotes inside quotation marks', () => {
    expect(copiedRuns(source, 'Sgt. Jane Doe said, "We had reason to believe he was armed."')).toEqual([]);
  });
  it('passes rewritten text', () => {
    expect(copiedRuns(source, 'South Jordan officers drew guns while arresting a man Saturday near 10600 South.')).toEqual([]);
  });
  it('reports by field', () => {
    const r = copyReport(source, { dek: 'Police in South Jordan drew their weapons during an arrest near 10600 South.', headline: 'GUNS DRAWN IN ARREST' });
    expect(r.map((x) => x.field)).toEqual(['dek']);
  });
});
