import type { JSX } from 'react';
import { dialogOpened } from '../../app/editorSlice';
import { dispatch } from '../../app/store';
import { HELP_GROUPS, SHORTCUT_KEYS, type HelpShortcut } from '../editor/shortcutList';
import './help.css';
import {
  Button,
  closeDialogOf,
  Dialog,
  DialogActions,
  DialogBody,
  shortcutLabel,
} from '../../../packages/ui/src';

const TITLE_ID = 've-help-title';

const BASICS = [
  'Click or drag a block from the library to add it to the page.',
  'Select a block on the canvas to edit its content, style and settings on the right.',
  'Design system sets the colors, fonts and spacing of the whole site.',
  'Export downloads the site as plain HTML, CSS and JavaScript files.',
];

function ShortcutKeys({ shortcut }: { shortcut: HelpShortcut }): JSX.Element {
  return (
    <span className="ve-help-keys">
      {shortcut.names.map((name, index) => (
        <span key={name}>
          {index > 0 && <span className="ui-muted"> or </span>}
          <kbd>{shortcutLabel(SHORTCUT_KEYS[name])}</kbd>
        </span>
      ))}
    </span>
  );
}

export function HelpDialog({ onClose }: { onClose(): void }): JSX.Element {
  return (
    <Dialog labelId={TITLE_ID} size="wide" onClose={onClose}>
      <DialogBody titleId={TITLE_ID} title="Help">
        <section aria-labelledby="ve-help-basics">
          <h3 id="ve-help-basics" className="ve-help-heading">
            Basics
          </h3>
          <ul className="ve-help-basics">
            {BASICS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        {HELP_GROUPS.map((group, index) => (
          <section key={group.title} aria-labelledby={`ve-help-group-${index}`}>
            <h3 id={`ve-help-group-${index}`} className="ve-help-heading">
              {group.title}
            </h3>
            <dl className="ve-help-shortcuts">
              {group.shortcuts.map((shortcut) => (
                <div key={shortcut.label} className="ve-help-shortcut">
                  <dt>{shortcut.label}</dt>
                  <dd>
                    <ShortcutKeys shortcut={shortcut} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <DialogActions>
          <Button
            variant="ghost"
            className="ve-help-licenses"
            onClick={() => dispatch(dialogOpened({ kind: 'licenses' }))}
          >
            Open-source licenses
          </Button>
          <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Close</Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
