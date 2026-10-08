import { lazy } from 'react';

export const NewProjectDialog = lazy(async () => ({
  default: (await import('../features/home/NewProjectDialog')).NewProjectDialog,
}));

export const LicensesDialog = lazy(async () => ({
  default: (await import('../features/licenses/LicensesDialog')).LicensesDialog,
}));

export const DesignSystemSheet = lazy(async () => ({
  default: (await import('../features/design-system/DesignSystemSheet')).DesignSystemSheet,
}));

export const ConvertToHtmlDialog = lazy(async () => ({
  default: (await import('../features/properties/ConvertToHtmlDialog')).ConvertToHtmlDialog,
}));

export const LoadPackDialog = lazy(async () => ({
  default: (await import('../features/block-packs/LoadPackDialog')).LoadPackDialog,
}));

export const ManagePacksDialog = lazy(async () => ({
  default: (await import('../features/block-packs/ManagePacksDialog')).ManagePacksDialog,
}));

export const CommandPalette = lazy(async () => ({
  default: (await import('../features/command-palette/CommandPalette')).CommandPalette,
}));

export const ExportDialog = lazy(async () => ({
  default: (await import('../features/export/ExportDialog')).ExportDialog,
}));

export const FindReplaceDialog = lazy(async () => ({
  default: (await import('../features/find-replace/FindReplaceDialog')).FindReplaceDialog,
}));

export const HelpDialog = lazy(async () => ({
  default: (await import('../features/help/HelpDialog')).HelpDialog,
}));

export const ProjectSettingsPanel = lazy(async () => ({
  default: (await import('../features/project/ProjectSettingsPanel')).ProjectSettingsPanel,
}));

export const SaveBlockDialog = lazy(async () => ({
  default: (await import('../features/saved-blocks/SaveBlockDialog')).SaveBlockDialog,
}));

export const SnapshotsDialog = lazy(async () => ({
  default: (await import('../features/snapshots/SnapshotsDialog')).SnapshotsDialog,
}));
