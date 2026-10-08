import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import type { ComponentBlock, Project } from '../../app/types';
import { createBlock } from '../../components/registry';
import { homePage } from '../../test/fixtures';
import { packOf, quoteCardBlockJson, quoteCardDefinition } from '../../test/packFixtures';
import { upgradeNotice, upgradeProjectToPack, withoutUnusedDefinitions } from './packUpdates';

function fieldsWithout(name: string): unknown[] {
  const fields = quoteCardBlockJson().fields;
  if (!Array.isArray(fields)) throw new Error('fixture has no fields');
  const kept: unknown[] = [];
  for (const field of fields) {
    const isRemoved =
      typeof field === 'object' && field !== null && 'name' in field && field.name === name;
    if (!isRemoved) kept.push(field);
  }
  return kept;
}

function projectWithQuoteCard(): { project: Project; block: ComponentBlock } {
  const project = createSampleProject();
  const custom = quoteCardDefinition();
  project.packBlocks[custom.definition.id] = custom;
  const block = createBlock(custom.definition);
  block.values.author = 'Ana Lima, Fieldnote';
  block.values.quote = 'Our edited quote';
  project.blocks.ids.push(block.id);
  project.blocks.entities[block.id] = block;
  homePage(project).blockIds.push(block.id);
  return { project, block };
}

describe('upgradeProjectToPack', () => {
  it('keeps content and lists the pages of removed fields', () => {
    const { project, block } = projectWithQuoteCard();
    const newer = quoteCardDefinition({ fields: fieldsWithout('author') }, '1.1.0');
    const upgrade = upgradeProjectToPack(project, packOf([newer]), 'newer');
    if (upgrade === null) throw new Error('Expected an upgrade');
    const [upgraded] = upgrade.blocks;
    expect(upgraded?.id).toBe(block.id);
    expect(upgraded?.kind === 'component' && upgraded.values.quote).toBe('Our edited quote');
    expect(upgrade.removedFields).toEqual([
      { blockName: 'Quote card', field: 'author', pageNames: ['Home'] },
    ]);
    expect(upgradeNotice(packOf([newer]), upgrade)).toBe(
      'Updated Acme blocks to 1.1.0. Removed “author” in Quote card on Home.',
    );
  });

  it('never lets an older or equal pack replace the project copy unless it changed on an explicit load', () => {
    const { project } = projectWithQuoteCard();
    const same = quoteCardDefinition();
    expect(upgradeProjectToPack(project, packOf([same]), 'newer-or-changed')).toBeNull();
    const older = quoteCardDefinition({}, '0.9.0');
    expect(upgradeProjectToPack(project, packOf([older]), 'newer-or-changed')).toBeNull();
    const edited = quoteCardDefinition({ name: 'Quote card, edited' });
    expect(upgradeProjectToPack(project, packOf([edited]), 'newer')).toBeNull();
    expect(upgradeProjectToPack(project, packOf([edited]), 'newer-or-changed')).not.toBeNull();
  });
});

describe('withoutUnusedDefinitions', () => {
  it('keeps only the definitions blocks still use', () => {
    const { project, block } = projectWithQuoteCard();
    const unused = quoteCardDefinition({}, '1.0.0', 'other-card');
    project.packBlocks[unused.definition.id] = unused;
    expect(Object.keys(withoutUnusedDefinitions(project).packBlocks)).toEqual([block.componentId]);
  });
});
