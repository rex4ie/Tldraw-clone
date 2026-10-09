import React, { useState } from 'react';
import { useCanvas } from '../../context/CanvasContext';
import { Plus, Copy, Trash2, Edit2, Check, ChevronDown, Layers } from 'lucide-react';

export const PagesPanel: React.FC = () => {
  const {
    pages,
    activePageId,
    changePage,
    addPage,
    duplicatePage,
    deletePage,
    renamePage,
    theme,
  } = useCanvas();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  const isDark = theme === 'dark' || theme === 'midnight';
  const activePage = pages.find((p) => p.id === activePageId) || pages[0];

  const handleStartRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setTempName(currentName);
  };

  const handleSaveRename = (id: string, e?: React.FormEvent) => {
    e?.preventDefault();
    if (tempName.trim()) {
      renamePage(id, tempName);
    }
    setEditingId(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
          isDark
            ? 'bg-zinc-900/90 border-zinc-700/60 hover:bg-zinc-800 text-zinc-200'
            : 'bg-white/90 border-slate-200/80 hover:bg-slate-100 text-slate-700'
        }`}
      >
        <Layers size={14} className="text-blue-500" />
        <span className="max-w-[100px] truncate">{activePage?.name || 'Page 1'}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-1.5 w-56 rounded-xl shadow-xl border backdrop-blur-md z-50 p-1.5 select-none animate-in fade-in duration-100 ${
            isDark
              ? 'bg-zinc-900/95 border-zinc-700/80 text-zinc-200'
              : 'bg-white/95 border-slate-200/80 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Pages ({pages.length})
            </span>
            <button
              onClick={() => {
                addPage();
              }}
              className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md transition-colors"
              title="Add New Page"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
            {pages.map((p) => {
              const isActive = p.id === activePageId;
              const isEditing = editingId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (!isEditing) {
                      changePage(p.id);
                      setIsOpen(false);
                    }
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer group transition-colors ${
                    isActive
                      ? isDark
                        ? 'bg-zinc-800 text-white font-medium'
                        : 'bg-blue-50 text-blue-700 font-medium'
                      : isDark
                      ? 'hover:bg-zinc-800/60 text-zinc-300'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleSaveRename(p.id, e)}
                      className="flex items-center gap-1 w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={() => handleSaveRename(p.id)}
                        className={`w-full px-1.5 py-0.5 text-xs rounded border outline-none ${
                          isDark ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white border-blue-400 text-slate-900'
                        }`}
                      />
                      <button type="submit" className="text-emerald-500 p-0.5">
                        <Check size={12} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="truncate flex-1">{p.name}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-2 transition-opacity">
                        <button
                          onClick={(e) => handleStartRename(p.id, p.name, e)}
                          className="p-1 hover:text-blue-500 rounded"
                          title="Rename"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicatePage(p.id);
                          }}
                          className="p-1 hover:text-blue-500 rounded"
                          title="Duplicate Page"
                        >
                          <Copy size={11} />
                        </button>
                        {pages.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePage(p.id);
                            }}
                            className="p-1 hover:text-red-500 rounded"
                            title="Delete Page"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
