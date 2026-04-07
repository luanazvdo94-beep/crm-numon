import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppHeader } from './components/AppHeader';
import { AuthScreen } from './components/AuthScreen';
import { BaseTable } from './components/BaseTable';
import { FunnelView } from './components/FunnelView';
import { LeadForm } from './components/LeadForm';
import { TabsBar } from './components/TabsBar';
import { DEFAULT_FORM } from './constants';
import { supabase } from './supabase';
import type { LeadFormData, LeadRecord, TabKey } from './types';
import { downloadCsv, exportLeadsToCsv, hydrateForm, prepareLeadPayload, sanitizeText } from './utils';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('cadastro');
  const [form, setForm] = useState<LeadFormData>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    void loadLeads();
  }, [session?.user?.id]);

  async function loadLeads() {
    if (!session?.user) return;

    setLoading(true);
    setFeedback(null);

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      setFeedback(error.message);
      setLoading(false);
      return;
    }

    setLeads((data ?? []) as LeadRecord[]);
    setLoading(false);
  }

  async function handleSave() {
    if (!session?.user) return;

    const payload = prepareLeadPayload(form);

    if (!payload.nome) {
      setFeedback('Nome é obrigatório.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    const operation = editingId
      ? supabase.from('leads').update(payload).eq('id', editingId).eq('user_id', session.user.id)
      : supabase.from('leads').insert({ ...payload, user_id: session.user.id });

    const { error } = await operation;

    if (error) {
      setFeedback(error.message);
      setSaving(false);
      return;
    }

    setForm(DEFAULT_FORM);
    setEditingId(null);
    setFeedback(editingId ? 'Lead atualizado com sucesso.' : 'Lead salvo com sucesso.');
    setSaving(false);
    await loadLeads();
    setActiveTab('base');
  }

  function handleEdit(lead: LeadRecord) {
    setForm(hydrateForm(lead));
    setEditingId(lead.id);
    setActiveTab('cadastro');
    setFeedback(null);
  }

  async function handleDelete(lead: LeadRecord) {
    const confirmed = window.confirm(`Excluir o lead ${lead.nome}? Essa ação não pode ser desfeita.`);
    if (!confirmed || !session?.user) return;

    const { error } = await supabase.from('leads').delete().eq('id', lead.id).eq('user_id', session.user.id);
    if (error) {
      setFeedback(error.message);
      return;
    }

    if (editingId === lead.id) {
      setEditingId(null);
      setForm(DEFAULT_FORM);
    }

    setFeedback('Lead excluído com sucesso.');
    await loadLeads();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setLeads([]);
    setForm(DEFAULT_FORM);
    setEditingId(null);
  }

  function handleExport() {
    const csv = exportLeadsToCsv(filteredLeads);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `numon-crm-${stamp}.csv`);
  }

  const filteredLeads = useMemo(() => {
    const term = sanitizeText(search).toLowerCase();
    if (!term) return leads;

    return leads.filter((lead) => {
      const haystack = [
        lead.nome,
        lead.telefone,
        lead.cpf,
        lead.email,
        lead.empresa,
        lead.origem,
        lead.produto,
        lead.status,
        lead.etapa,
        lead.observacoes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [leads, search]);

  if (!session) {
    return <AuthScreen onAuthenticated={() => void 0} />;
  }

  return (
    <div className="app-shell">
      <div className="app-gradient" />
      <main className="app-container">
        <AppHeader
          userEmail={session.user.email ?? 'Usuário autenticado'}
          onRefresh={() => void loadLeads()}
          onExport={handleExport}
          onLogout={() => void handleLogout()}
          loading={loading}
        />

        <TabsBar activeTab={activeTab} onChange={setActiveTab} />

        {feedback ? <div className="feedback-banner glass-card">{feedback}</div> : null}

        {activeTab === 'cadastro' ? (
          <LeadForm
            form={form}
            editingId={editingId}
            saving={saving}
            onChange={setForm}
            onSubmit={() => void handleSave()}
            onReset={() => {
              setForm(DEFAULT_FORM);
              setEditingId(null);
            }}
          />
        ) : null}

        {activeTab === 'base' ? (
          <BaseTable
            leads={filteredLeads}
            search={search}
            onSearch={setSearch}
            onEdit={handleEdit}
            onDelete={(lead) => void handleDelete(lead)}
          />
        ) : null}

        {activeTab === 'funil' ? <FunnelView leads={filteredLeads} /> : null}
      </main>
    </div>
  );
}
