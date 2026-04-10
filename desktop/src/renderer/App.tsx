// src/renderer/App.tsx
/// <reference path="./dtt-bridge.d.ts" />
import React, { useEffect, useState } from 'react';
import type { AppInfo, PingResult } from '../shared/types';

export function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.dtt
      .getAppInfo()
      .then(setInfo)
      .catch((e: unknown) => setError(String(e)));
    window.dtt
      .listDbTables()
      .then(setTables)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  const onPing = async () => {
    try {
      const r = await window.dtt.ping('hello from renderer');
      setPingResult(r);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <main>
      <h1>Marketeq Time Tracker</h1>
      <p>Hello from Marketeq Time Tracker.</p>
      {info ? (
        <dl>
          <dt>App version</dt>
          <dd>{info.version}</dd>
          <dt>Platform</dt>
          <dd>{info.platform}</dd>
          <dt>Schema version</dt>
          <dd>{info.schemaVersion}</dd>
        </dl>
      ) : (
        <p>Loading app info…</p>
      )}
      <section>
        <h2>IPC round-trip test</h2>
        <button type="button" onClick={onPing}>
          Ping main process
        </button>
        {pingResult && (
          <pre>{JSON.stringify(pingResult, null, 2)}</pre>
        )}
      </section>
      <section>
        <h2>Local DB tables ({tables.length})</h2>
        <ul>
          {tables.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      {error && (
        <p style={{ color: 'tomato' }}>
          <strong>Error:</strong> {error}
        </p>
      )}
    </main>
  );
}
