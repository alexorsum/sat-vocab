import { useRef, useState } from 'react';
import { useApp } from '../state/app';
import { useTitle } from '../lib/hooks';
import { canSpeak, speak } from '../lib/speech';
import { dayKey } from '../lib/dates';
import type { ThemeSetting } from '../types';

export default function SettingsPage() {
  useTitle('Settings');
  const { user, actions } = useApp();
  const s = user.settings;
  const [message, setMessage] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = async () => {
    const backup = await actions.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sat-vocab-backup-${dayKey(Date.now())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage({ kind: 'good', text: `Backup saved: ${backup.cards.length} words, ${backup.reviews.length} reviews.` });
  };

  const importData = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!window.confirm('Importing replaces all progress on this device with the backup. Continue?')) return;
      await actions.importBackup(parsed);
      setMessage({ kind: 'good', text: 'Backup restored.' });
    } catch (e) {
      setMessage({ kind: 'bad', text: e instanceof SyntaxError ? 'That file is not valid JSON.' : e instanceof Error ? e.message : 'Import failed.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reset = async () => {
    if (!window.confirm('Erase all progress on this device? This cannot be undone. Export a backup first if you might want it back.')) return;
    await actions.resetAll();
    setMessage({ kind: 'good', text: 'All progress erased.' });
  };

  const toggleTier = (tier: 1 | 2 | 3) => {
    const has = s.tiers.includes(tier);
    const next = has ? s.tiers.filter((t) => t !== tier) : [...s.tiers, tier].sort();
    if (next.length > 0) void actions.updateSettings({ tiers: next as (1 | 2 | 3)[] });
  };

  return (
    <>
      <h1>Settings</h1>
      {message && (
        <p className={`notice ${message.kind}`} role="status" data-testid="settings-message">
          {message.text}
        </p>
      )}

      <section className="card stack" aria-labelledby="set-study">
        <h2 id="set-study">Study</h2>
        <div>
          <label className="field" htmlFor="new-per-day">
            New words per day
          </label>
          <input
            id="new-per-day"
            type="number"
            min={0}
            max={100}
            value={s.newPerDay}
            onChange={(e) => void actions.updateSettings({ newPerDay: Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))) })}
          />
          <p className="muted small">10 a day covers the whole list in about 15 weeks. Each new word adds a few reviews over the next weeks.</p>
        </div>
        <div>
          <label className="field" htmlFor="batch">
            Words per learning batch
          </label>
          <input
            id="batch"
            type="number"
            min={1}
            max={30}
            value={s.learnBatch}
            onChange={(e) => void actions.updateSettings({ learnBatch: Math.min(30, Math.max(1, Math.round(Number(e.target.value) || 1))) })}
          />
        </div>
        <div>
          <label className="field" htmlFor="retention">
            Target retention
          </label>
          <select id="retention" value={String(s.desiredRetention)} onChange={(e) => void actions.updateSettings({ desiredRetention: Number(e.target.value) })}>
            <option value="0.85">85% (fewer reviews)</option>
            <option value="0.9">90% (recommended)</option>
            <option value="0.93">93% (more reviews)</option>
          </select>
          <p className="muted small">The chance you still remember a word when it comes up for review. Higher means more reviews per day.</p>
        </div>
        <fieldset>
          <legend>Tiers to learn from</legend>
          <div className="options">
            {([1, 2, 3] as const).map((t) => (
              <label key={t} className="option">
                <input type="checkbox" checked={s.tiers.includes(t)} onChange={() => toggleTier(t)} />
                <span>
                  Tier {t} {t === 1 ? '(most common)' : t === 3 ? '(rarest)' : ''}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card stack" aria-labelledby="set-look">
        <h2 id="set-look">Look and sound</h2>
        <fieldset>
          <legend>Theme</legend>
          <div className="options">
            {(['system', 'light', 'dark'] as ThemeSetting[]).map((t) => (
              <label key={t} className="option">
                <input type="radio" name="theme" checked={s.theme === t} onChange={() => void actions.updateSettings({ theme: t })} />
                <span>{t === 'system' ? 'Match my device' : t === 'light' ? 'Light' : 'Dark'}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="row" style={{ minHeight: 46 }}>
            <input
              type="checkbox"
              checked={s.audio}
              disabled={!canSpeak()}
              onChange={(e) => {
                void actions.updateSettings({ audio: e.target.checked });
                if (e.target.checked) speak('Audio is on');
              }}
              style={{ width: 20, height: 20 }}
            />
            Say each word aloud automatically
          </label>
          <p className="muted small">
            {canSpeak()
              ? 'Uses the voice built into your browser. You can always tap the speaker button next to a word.'
              : 'This browser does not offer speech, so audio is unavailable.'}
          </p>
        </div>
      </section>

      <section className="card stack" aria-labelledby="set-backup">
        <h2 id="set-backup">Backup</h2>
        <p>
          Your progress lives only in this browser on this device. There is no account. Export a backup file now and then, and import it to
          move to another device or to recover after clearing your browser.
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => void exportData()} data-testid="export">
            Export backup
          </button>
          <label className="btn" htmlFor="import-file">
            Import backup
          </label>
          <input
            id="import-file"
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importData(f);
            }}
            data-testid="import"
          />
        </div>
        <div>
          <button className="btn" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }} onClick={() => void reset()} data-testid="reset">
            Erase all progress
          </button>
        </div>
      </section>
    </>
  );
}
