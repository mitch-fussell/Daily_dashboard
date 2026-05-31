'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import type { EmailItem } from '@/lib/ms-graph';

function ConnectPrompt() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 leading-relaxed">
        Connect your Microsoft account to show recent inbox messages here. You&apos;ll sign in
        with your own credentials — clicking Connect tells us instantly whether your school
        tenant allows it (a normal consent screen means yes; a &ldquo;Need admin approval&rdquo;
        screen means it&apos;s blocked).
      </p>
      <a
        href="/api/ms-calendar/connect"
        className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
      >
        Connect Microsoft
      </a>
    </div>
  );
}

type Props = {
  connected: boolean;
  messages: EmailItem[];
  unread: number;
  total: number;
  error: string | null;
};

export function EmailWidget({ connected, messages, unread, total, error }: Props) {
  const [isRefreshing, startRefresh] = useTransition();
  const router = useRouter();

  if (!connected) {
    return <ConnectPrompt />;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-2 py-1">
          {error}
        </div>
        <a
          href="/api/ms-calendar/connect"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
        >
          Reconnect Microsoft
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Summary line */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="font-medium text-zinc-200">{unread}</span>
        <span>unread</span>
        <span className="text-zinc-600">·</span>
        <span>{total} in inbox</span>
      </div>

      {/* Message list */}
      <div
        className="divide-y divide-zinc-800 max-h-72 overflow-y-auto pr-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
      >
        {messages.length === 0 && (
          <p className="text-xs text-zinc-600 italic py-2">Inbox is empty</p>
        )}
        {messages.map((m) => (
          <a
            key={m.id}
            href={m.webLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 py-2 group"
            title={m.fromAddress ? `${m.from} <${m.fromAddress}>` : m.from}
          >
            <span
              className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                m.isRead ? 'bg-transparent' : 'bg-indigo-400'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`truncate text-xs ${
                    m.isRead ? 'text-zinc-400' : 'text-zinc-100 font-medium'
                  } group-hover:text-white transition-colors`}
                >
                  {m.from}
                </span>
                <span className="flex-shrink-0 text-xs text-zinc-600">
                  {formatDistanceToNowStrict(m.receivedMs, { addSuffix: false })}
                </span>
              </div>
              <p
                className={`truncate text-xs ${
                  m.isRead ? 'text-zinc-500' : 'text-zinc-300'
                }`}
              >
                {m.subject}
              </p>
              {m.preview && (
                <p className="truncate text-xs text-zinc-600">{m.preview}</p>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="flex gap-3 border-t border-zinc-800 pt-2">
        <button
          type="button"
          onClick={() => startRefresh(() => { router.refresh(); })}
          disabled={isRefreshing}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
        >
          {isRefreshing ? '↻ Refreshing…' : '↻ Refresh'}
        </button>
        <a
          href="https://outlook.office.com/mail/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
        >
          Open Outlook ↗
        </a>
      </div>
    </div>
  );
}
