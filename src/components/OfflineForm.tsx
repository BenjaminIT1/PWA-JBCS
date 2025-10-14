import { useEffect, useState } from 'react';
import { addEntry, getAllEntries, clearEntries } from '../lib/indexeddb';
import type { Entry } from '../lib/indexeddb';

export default function OfflineForm() {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    load();
    function onLine() { setOnline(true); }
    function offLine() { setOnline(false); }
    window.addEventListener('online', onLine);
    window.addEventListener('offline', offLine);
    return () => {
      window.removeEventListener('online', onLine);
      window.removeEventListener('offline', offLine);
    };
  }, []);

  async function load() {
    try {
      const list = await getAllEntries();
      setEntries(list.sort((a,b)=>b.created - a.created));
    } catch (e) {
      console.error('Could not load entries', e);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await addEntry({ title: title.trim(), notes: notes.trim() });
      setTitle(''); setNotes('');
      await load();
    } catch (err) {
      console.error('Error saving entry', err);
    }
  }

  async function handleClear() {
    try { await clearEntries(); setEntries([]); } catch(e){console.error(e)}
  }

  return (
    <div className="offline-form card">
      <div className="offline-header">
        <h3>Registro offline</h3>
        <div className={`status ${online ? 'online' : 'offline'}`}>{online ? 'Online' : 'Offline'}</div>
      </div>
      <form onSubmit={handleSubmit} className="form">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título" />
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas (opcional)" />
        <div className="form-actions">
          <button type="submit" className="btn-primary">Guardar</button>
          <button type="button" className="btn-ghost" onClick={handleClear}>Limpiar</button>
        </div>
      </form>

      <ul className="entries">
        {entries.length === 0 && <li className="muted">No hay registros</li>}
        {entries.map(en=> (
          <li key={en.id}><strong>{en.title}</strong><div className="small muted">{new Date(en.created).toLocaleString()}</div><div>{en.notes}</div></li>
        ))}
      </ul>
    </div>
  );
}
