import React from 'react';
import { CanvasProvider, useCanvas } from './context/CanvasContext';
import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas';
import { TopHeader } from './components/Panels/TopHeader';
import { BottomToolbar } from './components/Toolbar/BottomToolbar';
import { StylePanel } from './components/Panels/StylePanel';
import { MiniMap } from './components/Panels/MiniMap';
import { HelpModal } from './components/Panels/HelpModal';
import { ExportModal } from './components/Panels/ExportModal';
import { CommandPalette } from './components/Panels/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const CanvasApp: React.FC = () => {
  useKeyboardShortcuts();
  const { theme } = useCanvas();

  React.useEffect(() => {
    if (theme === 'dark' || theme === 'midnight') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = theme === 'dark' ? '#18181b' : '#0f172a';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = theme === 'sepia' ? '#fcf9f2' : '#f9fafb';
    }
  }, [theme]);

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${theme === 'dark' || theme === 'midnight' ? 'dark' : ''}`}>
      {/* Top Header Navigation */}
      <TopHeader />

      {/* The Infinite Canvas */}
      <InfiniteCanvas />

      {/* Floating Style Panel (Contextual) */}
      <StylePanel />

      {/* Iconic Floating Bottom Dock */}
      <BottomToolbar />

      {/* Interactive Mini-map (Toggleable) */}
      <MiniMap />

      {/* Modals & Dialogs */}
      <HelpModal />
      <ExportModal />
      <CommandPalette />
    </div>
  );
};

export default function App() {
  return (
    <CanvasProvider>
      <CanvasApp />
    </CanvasProvider>
  );
}
