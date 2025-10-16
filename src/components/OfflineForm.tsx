import { useEffect, useState } from 'react';
import { addEntry, getAllEntries, clearEntries } from '../lib/indexeddb';
import type { Entry } from '../lib/indexeddb';
import { initFirebase, getFcmToken } from '../firebase';

export default function OfflineForm() {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

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

     
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(swRegistration => {
          
          const anyReg = swRegistration as any;
          if (anyReg && anyReg.sync && typeof anyReg.sync.register === 'function') {
            return anyReg.sync.register('sync-entries');
          }
          return Promise.reject(new Error('Sync not available on ServiceWorkerRegistration'));
        }).then(() => {
          console.log('Sincronización de entradas registrada');
        }).catch(err => {
          console.error('No se pudo registrar la sincronización', err);
        });
      }

    } catch (err) {
      console.error('Error saving entry', err);
    }
  }

  async function handleClear() {
    try { await clearEntries(); setEntries([]); } catch(e){console.error(e)}
  }

  async function handleSubscribePush() {
    try {
      initFirebase(); // initFirebase is now synchronous
      const token = await getFcmToken(); // No longer needs vapidKey
      if (!token) {
        alert('No se pudo obtener token FCM. Asegúrate de haber concedido permisos para recibir notificaciones.');
        return;
      }
      setFcmToken(token);
      
      console.log('Enviando token FCM al backend...');
      await fetch('/api/subscribe-fcm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      alert('Suscrito a notificaciones push correctamente.');
      console.log('Token FCM enviado al servidor.');

    } catch (err) {
      console.error('Error al suscribirse a las notificaciones push', err);
      alert('Ocurrió un error durante la suscripción a notificaciones.');
    }
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
      <div style={{ marginTop: 12 }}>
        <button className="btn-primary" onClick={handleSubscribePush}>Permitir notificaciones (Firebase)</button>
        {fcmToken && <div className="small muted">Token FCM: {fcmToken.slice(0, 12)}…</div>}
      </div>
    </div>
  );
}
