'use client';

import { useState, useEffect, useRef } from 'react';
import { saveNote } from '@/app/actions';

type NoteSlot = { slot: number; content: string };

const TAB_LABELS = ['Quick Notes', 'Ideas', 'Scratch'];

export function NotesWidget({ notes }: { notes: NoteSlot[] }) {
  const [activeSlot, setActiveSlot] = useState(0);
  const [contents, setContents] = useState<Record<number, string>>({
    0: notes.find((n) => n.slot === 0)?.content ?? '',
    1: notes.find((n) => n.slot === 1)?.content ?? '',
    2: notes.find((n) => n.slot === 2)?.content ?? '',
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setContents((prev) => ({ ...prev, [activeSlot]: value }));
    setSaveStatus('saving');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await saveNote(activeSlot, value);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1500);
  }

  useEffect(() => {
    function flushOnUnload() {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        // Fire-and-forget — browser may cancel inflight requests on unload,
        // but sendBeacon-backed server actions will complete in most browsers.
        saveNote(activeSlot, contents[activeSlot]);
      }
    }
    window.addEventListener('beforeunload', flushOnUnload);
    return () => {
      window.removeEventListener('beforeunload', flushOnUnload);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeSlot, contents]);

  return (
    <div className="flex flex-col gap-2">
      {/* Tabs */}
      <div className="flex gap-1">
        {TAB_LABELS.map((label, slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => setActiveSlot(slot)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              activeSlot === slot
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
        <span className={`ml-auto text-xs self-center transition-opacity ${
          saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'
        } ${saveStatus === 'saved' ? 'text-emerald-500' : 'text-zinc-500'}`}>
          {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        key={activeSlot}
        value={contents[activeSlot]}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start typing..."
        rows={6}
        className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-zinc-600 resize-none leading-relaxed"
      />
    </div>
  );
}
