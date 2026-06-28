'use client';

import { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import { createClient } from '../../lib/supabase/client';
import PhoneShell from '../components/PhoneShell';
import BottomNav from '../components/BottomNav';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ContactsPage() {
  const supabase = createClient();
  const fileInput = useRef(null);

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [importMsg, setImportMsg] = useState('');

  async function loadContacts() {
    setLoading(true);
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    setContacts(data || []);
    setLoading(false);
  }

  useEffect(() => { loadContacts(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newEmail) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('contacts').insert({ user_id: user.id, name: newName, email: newEmail });
    if (!error) {
      setNewName(''); setNewEmail(''); setShowAdd(false);
      loadContacts();
    }
  }

  async function handleDelete(id) {
    await supabase.from('contacts').delete().eq('id', id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  function handleCsvFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const { data: { user } } = await supabase.auth.getUser();
        const rows = result.data
          .map((row) => {
            const email = row.email || row.Email || row.EMAIL;
            const name = row.name || row.Name || row.nama || row.Nama || '';
            return email ? { user_id: user.id, name, email: email.trim() } : null;
          })
          .filter(Boolean);

        if (rows.length === 0) {
          setImportMsg('Tidak ada baris valid. Pastikan ada kolom "email".');
          return;
        }
        const { error } = await supabase.from('contacts').insert(rows);
        setImportMsg(error ? `Gagal: ${error.message}` : `${rows.length} kontak berhasil diimpor.`);
        loadContacts();
      },
    });
  }

  const filtered = contacts.filter((c) =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PhoneShell>
      <div className="screen active" id="screen-contacts">
        <div className="phdr">
          <div className="phdr-top">
            <Link href="/dashboard" className="back-btn"><i className="ti ti-arrow-left" aria-hidden="true"></i></Link>
            <div className="ptitle">Contacts ({contacts.length})</div>
          </div>
          <div className="srchbar">
            <i className="ti ti-search" aria-hidden="true"></i>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kontak…"
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, width: '100%', color: 'var(--txt)' }}
            />
          </div>
        </div>

        <div className="pscroll2" style={{ paddingTop: 0 }}>
          <div style={{ display: 'flex', gap: 8, margin: '0 14px 10px' }}>
            <button onClick={() => fileInput.current.click()} className="cta-btn" style={{ flex: 1, fontSize: 12, padding: '9px', border: 'none' }}>
              <i className="ti ti-upload" aria-hidden="true"></i> Import CSV
            </button>
            <button onClick={() => setShowAdd((v) => !v)} className="qty-btn qty-plus" style={{ width: 38, height: 38, borderRadius: 10 }}>
              <i className="ti ti-plus" aria-hidden="true"></i>
            </button>
            <input ref={fileInput} type="file" accept=".csv" onChange={handleCsvFile} style={{ display: 'none' }} />
          </div>

          {importMsg && <div style={{ margin: '0 14px 10px', fontSize: 11.5, color: 'var(--txt-sub)' }}>{importMsg}</div>}

          {showAdd && (
            <form onSubmit={handleAdd} className="gm-list" style={{ margin: '0 14px 10px', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama (opsional)"
                style={{ border: '1px solid var(--bdr-s)', borderRadius: 8, padding: 8, fontSize: 12.5 }} />
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" required type="email"
                style={{ border: '1px solid var(--bdr-s)', borderRadius: 8, padding: 8, fontSize: 12.5 }} />
              <button type="submit" className="cta-btn" style={{ fontSize: 12.5, padding: 9, border: 'none' }}>Simpan kontak</button>
            </form>
          )}

          <div className="gm-list" style={{ margin: '0 14px' }}>
            {loading && <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt-m)', fontSize: 12 }}>Memuat…</div>}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt-m)', fontSize: 12 }}>Belum ada kontak.</div>
            )}
            {filtered.map((c) => (
              <div key={c.id} className="tpl-row">
                <div className="tpl-ic" style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }}>
                  {(c.name || c.email)[0]?.toUpperCase()}
                </div>
                <div className="tpl-info">
                  <div className="tpl-name">{c.name || '(tanpa nama)'}</div>
                  <div className="tpl-meta">{c.email}</div>
                </div>
                <i className="ti ti-x" style={{ color: 'var(--red)', fontSize: 13 }} onClick={() => handleDelete(c.id)} aria-hidden="true"></i>
              </div>
            ))}
          </div>
        </div>
        <BottomNav active="/contacts" />
      </div>
    </PhoneShell>
  );
}
