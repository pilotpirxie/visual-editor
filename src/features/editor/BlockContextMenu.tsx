import type { JSX } from 'react';
import { blockLabel } from '../../components/registry';
import { useStore } from '../../app/store';
import { useBlockMenuItems } from './blockMenu';
import { PointMenu, type MenuPoint } from '../../../packages/ui/src';

type BlockContextMenuProps = { blockId: string; point: MenuPoint; onClose(): void };

export function BlockContextMenu({ blockId, point, onClose }: BlockContextMenuProps): JSX.Element {
  const items = useBlockMenuItems(blockId);
  const block = useStore((state) => state.project.blocks.entities[blockId]);
  const name = block === undefined ? 'Block' : blockLabel(block);
  return <PointMenu label={`${name} actions`} items={items} point={point} onClose={onClose} />;
}
