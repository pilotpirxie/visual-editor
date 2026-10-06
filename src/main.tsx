import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/theme.css';
import { EditorShell } from './features/editor/EditorShell';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('index.html is missing the #root element');

createRoot(rootElement).render(
  <StrictMode>
    <EditorShell />
  </StrictMode>,
);
