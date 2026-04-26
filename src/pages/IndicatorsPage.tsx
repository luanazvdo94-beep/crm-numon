import { useEffect, useState } from 'react';
import IndicatorForm from '../components/indicators/IndicatorForm';
import IndicatorsTable from '../components/indicators/IndicatorsTable';
import { supabase } from '../supabase';
import type { Indicator } from '../types/indicator';

type IndicatorInsert = Omit<Indicator, 'id' | 'created_at' | 'updated_at'>;

export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadIndicators() {
    setLoading(true);

    const { data, error } = await supabase
      .from('indicators')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      alert(`Erro ao carregar indicadores: ${error.message}`);
    } else {
      setIndicators((data as Indicator[]) || []);
    }

    setLoading(false);
  }

  async function handleCreate(values: IndicatorInsert) {
    setLoading(true);

    const { error } = await supabase.from('indicators').insert(values);

    if (error) {
      console.error(error);
      alert(`Erro ao salvar indicador: ${error.message}`);
    } else {
      alert('Indicador cadastrado com sucesso.');
      await loadIndicators();
    }

    setLoading(false);
  }

  useEffect(() => {
    loadIndicators();
  }, []);

  return (
    <div style={{ padding: 24, background: '#F7FAFC', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#123C73' }}>Indicadores</h1>
        <p style={{ color: '#64748B' }}>
          Cadastre parceiros, gere links e acompanhe a origem das indicações.
        </p>
      </div>

      <IndicatorForm onSubmit={handleCreate} loading={loading} />
      <IndicatorsTable indicators={indicators} loading={loading} />
    </div>
  );
}