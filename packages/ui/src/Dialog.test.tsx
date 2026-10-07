import { describe, expect, it, vi } from 'vitest';
import { click, render, runInAct } from '../../../src/test/dom';
import { Button } from './Button';
import { closeDialogOf, Dialog, DialogActions, DialogBody } from './Dialog';

describe('Dialog', () => {
  it('opens as a modal named by its title', () => {
    const { container } = render(
      <Dialog labelId="t" onClose={() => {}}>
        <DialogBody titleId="t" title="Project settings">
          Fields
        </DialogBody>
      </Dialog>,
    );
    const dialog = container.querySelector('dialog');
    expect(dialog?.open).toBe(true);
    expect(dialog?.getAttribute('aria-labelledby')).toBe('t');
    expect(container.querySelector('#t')?.textContent).toBe('Project settings');
    expect(dialog?.getAttribute('data-size')).toBe('normal');
  });

  it('closes from a button inside and tells the owner', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog labelId="t" size="wide" onClose={onClose}>
        <DialogBody titleId="t" title="Export">
          <DialogActions>
            <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Cancel</Button>
          </DialogActions>
        </DialogBody>
      </Dialog>,
    );
    click(container.querySelector('button'));
    runInAct(() => {
      container.querySelector('dialog')?.dispatchEvent(new Event('close'));
    });
    expect(container.querySelector('dialog')?.open).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders its body as a form when it handles submit', () => {
    const onSubmit = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    const { container } = render(
      <Dialog labelId="t" onClose={() => {}}>
        <DialogBody titleId="t" title="Add page" onSubmit={onSubmit}>
          <Button type="submit">Add</Button>
        </DialogBody>
      </Dialog>,
    );
    expect(container.querySelector('form.ui-dialog-body')).not.toBeNull();
    click(container.querySelector('button'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
