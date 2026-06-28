'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import PhoneShell from '../components/PhoneShell';
import Link from 'next/link';

const CATS = ['promo', 'newsletter', 'follow-up'];

export const dynamic = 'force-dynamic';

export default function TemplatesPage() {
  const supabase = createClient();
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState('semua');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', body_html: '', category: 'promo' });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('templates').select('*').order('updated_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('templates').insert({ ...form, user_id: user.id });
    setForm({ name: '', subject: '', body_html: '', category: 'promo' });
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Hapus template ini?')) return;
    await supabase.from('templates').delete().eq('id', id);
    load();
  }

  const filtered = filter === 'semua' ? templates : templates.filter((t) => t.category === filter);

  return (
    <PhoneShell>
      <div className="screen active" id="screen-templates">
        <div className="phdr">
          <div className="phdr-top">
            <Link href="/profile" className="back-btn"><i className="ti ti-arrow-left" aria-hidden="true"></i></Link>
            <div className="ptitle">Templates</div>
          </div>
        </div>
        <div className="chips">
          <div className={`chip ${filter === 'semua' ? 'on' : ''}`} onClick={() => setFilter('semua')}>Semua</div>
          {CATS.map((c) => (
            <div key={c} className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>{c}</div>
          ))}
        </div>

        <div className="pscroll2" style={{ paddingTop: 0 }}>
          {showForm && (
            <form onSubmit={handleSave} className="gm-list" style={{ margin: '0 14px 10px', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama template"
                style={{ border: '1px solid var(--bdr-s)', borderRadius: 8, padding: 8, fontSize: 12.5 }} />
              <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject"
                style={{ border: '1px solid var(--bdr-s)', borderRadius: 8, padding: 8, fontSize: 12.5 }} />
              <textarea required value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })} placeholder="Isi email"
                rows={4} style={{ border: '1px solid var(--bdr-s)', borderRadius: 8, padding: 8, fontSize: 12.5 }} />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ border: '1px solid var(--bdr-s)', borderRadius: 8, padding: 8, fontSize: 12.5 }}>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="submit" className="cta-btn" style={{ fontSize: 12.5, padding: 9, border: 'none' }}>Simpan template</button>
            </form>
          )}

          <div className="gm-list" style={{ margin: '0 14px' }}>
            {loading && <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt-m)', fontSize: 12 }}>Memuat…</div>}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--txt-m)', fontSize: 12 }}>Belum ada template.</div>
            )}
            {filtered.map((t) => (
              <div key={t.id} className="tpl-row">
                <div className="tpl-ic" style={{ background: 'var(--purple-lt)', color: 'var(--purple)' }}><i className="ti ti-template" aria-hidden="true"></i></div>
                <div className="tpl-info">
                  <div className="tpl-name">{t.name}</div>
                  <div className="tpl-meta">{t.category} · dipakai {t.used_count}x</div>
                </div>
                <i className="ti ti-x" style={{ color: 'var(--red)', fontSize: 13 }} onClick={() => handleDelete(t.id)} aria-hidden="true"></i>
              </div>
            ))}
            <div className="add-row" onClick={() => setShowForm((v) => !v)}>
              <div className="add-ic"><i className="ti ti-plus" aria-hidden="true"></i></div>
              <div className="add-txt">Buat template baru</div>
            </div>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
