import { describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { componentBlockOf, createTestStore, homePage } from '../../test/fixtures';
import { insertComponent } from '../editor/blockActions';
import { isIconSetLoaded } from './loadIconSet';
import { iconSetsUsedBy } from './ensureIconSets';

describe('iconSetsUsedBy', () => {
  it('needs Lucide, the default set and the sets of icons picked by hand', () => {
    const project = createSampleProject();
    const features = componentBlockOf(project, homePage(project).blockIds[2] ?? '');
    features.values.items = [{ icon: 'tabler:rocket', title: 'A', text: 'B' }];
    const sets = iconSetsUsedBy(Object.values(project.blocks.entities), 'phosphor');
    expect([...sets].sort()).toEqual(['lucide', 'phosphor', 'tabler']);
  });
});

describe('loadBlockIconSets', () => {
  it('loads the sets an inserted block needs and tells the canvas to render again', async () => {
    const store = createTestStore();
    store.dispatch(insertComponent('footer-columns'));
    await vi.waitFor(() => expect(isIconSetLoaded('simple-icons')).toBe(true));
    await vi.waitFor(() => expect(store.getState().editor.iconSetsVersion).toBeGreaterThan(0));
  });
});
