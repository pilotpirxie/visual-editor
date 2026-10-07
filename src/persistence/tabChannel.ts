export type TabMessage =
  | { kind: 'project-saved'; projectId: string }
  | { kind: 'project-deleted'; projectId: string }
  | { kind: 'saved-blocks-changed' };

type TabMessageListener = (message: TabMessage) => void;

const CHANNEL_NAME = 'visual-editor';

let channel: BroadcastChannel | null | undefined;

function tabChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL_NAME) : null;
  return channel;
}

function isTabMessage(value: unknown): value is TabMessage {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false;
  if (value.kind === 'saved-blocks-changed') return true;
  const isProjectMessage = value.kind === 'project-saved' || value.kind === 'project-deleted';
  return isProjectMessage && 'projectId' in value && typeof value.projectId === 'string';
}

export function postTabMessage(message: TabMessage): void {
  tabChannel()?.postMessage(message);
}

export function subscribeTabMessages(listener: TabMessageListener): () => void {
  const openChannel = tabChannel();
  if (openChannel === null) return () => {};
  function handleMessage(event: MessageEvent<unknown>): void {
    if (isTabMessage(event.data)) {
      listener(event.data);
      return;
    }
    console.warn('Ignored a message from another tab with an unknown shape', event.data);
  }
  openChannel.addEventListener('message', handleMessage);
  return () => openChannel.removeEventListener('message', handleMessage);
}
