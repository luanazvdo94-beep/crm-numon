import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

type ProductCategory = 'clt' | 'fgts' | 'inss' | 'geral';

type WhatsAppButton = {
  id: string;
  text: string;
};

type WhatsAppTemplateRow = {
  id: string;
  key: string;
  name: string;
  category: string;
  product_category: ProductCategory | string | null;
  message_text: string;
  buttons: WhatsAppButton[] | null;
  is_active: boolean;
  description: string | null;
  flow_order: number | null;
  channel: string | null;
  created_at: string;
  updated_at: string;
};

type TemplateEditState = {
  name: string;
  key: string;
  category: string;
  product_category: ProductCategory;
  description: string;
  flow_order: string;
  channel: string;
  is_active: boolean;
  message_text: string;
  buttons: WhatsAppButton[];
};

const PRODUCT_FILTERS: Array<{
  key: ProductCategory;
  label: string;
  description: string;
  accent: string;
  background: string;
  border: string;
}> = [
  {
    key: 'clt',
    label: 'CLT',
    description: 'Crédito do Trabalhador',
    accent: '#123C73',
    background: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    key: 'fgts',
    label: 'FGTS',
    description: 'Antecipação FGTS',
    accent: '#166534',
    background: '#F0FDF4',
    border: '#BBF7D0',
  },
  {
    key: 'inss',
    label: 'INSS',
    description: 'Consignado INSS',
    accent: '#7C2D12',
    background: '#FFF7ED',
    border: '#FED7AA',
  },
  {
    key: 'geral',
    label: 'Geral',
    description: 'Atendimento e mensagens globais',
    accent: '#334155',
    background: '#F8FAFC',
    border: '#E2E8F0',
  },
];

const PRODUCT_LABELS: Record<ProductCategory, string> = {
  clt: 'CLT',
  fgts: 'FGTS',
  inss: 'INSS',
  geral: 'Geral',
};

const EMPTY_EDIT_STATE: TemplateEditState = {
  name: '',
  key: '',
  category: 'fluxo',
  product_category: 'clt',
  description: '',
  flow_order: '',
  channel: 'whatsapp',
  is_active: true,
  message_text: '',
  buttons: [],
};

function normalizeProductCategory(value?: string | null): ProductCategory {
  if (value === 'fgts' || value === 'inss' || value === 'geral' || value === 'clt') {
    return value;
  }

  return 'clt';
}

function getProductFilterConfig(product: ProductCategory) {
  return PRODUCT_FILTERS.find((item) => item.key === product) || PRODUCT_FILTERS[0];
}

export default function TemplatesWhatsAppPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [activeProduct, setActiveProduct] = useState<ProductCategory>('clt');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editState, setEditState] = useState<TemplateEditState>(EMPTY_EDIT_STATE);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadTemplates(preferredTemplateId?: string | null) {
    setLoading(true);
    setFeedback(null);

    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .order('flow_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      setFeedback(`Erro ao carregar templates: ${error.message}`);
      setLoading(false);
      return;
    }

    const rows = ((data ?? []) as WhatsAppTemplateRow[]).map((item) => ({
      ...item,
      product_category: normalizeProductCategory(item.product_category),
      buttons: Array.isArray(item.buttons) ? item.buttons : null,
    }));

    setTemplates(rows);

    const rowsFromActiveProduct = rows.filter(
      (item) => normalizeProductCategory(item.product_category) === activeProduct
    );

    if (rows.length > 0) {
      const currentSelected =
        rows.find((item) => item.id === preferredTemplateId) ||
        rowsFromActiveProduct.find((item) => item.id === selectedTemplateId) ||
        rowsFromActiveProduct[0] ||
        rows[0];

      applyTemplateToEditor(currentSelected);
      setActiveProduct(normalizeProductCategory(currentSelected.product_category));
    } else {
      setSelectedTemplateId(null);
      setEditState({
        ...EMPTY_EDIT_STATE,
        product_category: activeProduct,
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyTemplateToEditor(template: WhatsAppTemplateRow) {
    const product = normalizeProductCategory(template.product_category);

    setSelectedTemplateId(template.id);
    setActiveProduct(product);
    setEditState({
      name: template.name || '',
      key: template.key || '',
      category: template.category || '',
      product_category: product,
      description: template.description || '',
      flow_order:
        template.flow_order != null ? String(template.flow_order) : '',
      channel: template.channel || 'whatsapp',
      is_active: Boolean(template.is_active),
      message_text: template.message_text || '',
      buttons: Array.isArray(template.buttons)
        ? template.buttons.map((button) => ({
            id: String(button.id ?? ''),
            text: String(button.text ?? ''),
          }))
        : [],
    });
  }

  function handleProductFilterChange(product: ProductCategory) {
    setActiveProduct(product);

    const firstTemplateFromProduct = templates.find(
      (item) => normalizeProductCategory(item.product_category) === product
    );

    if (firstTemplateFromProduct) {
      applyTemplateToEditor(firstTemplateFromProduct);
      return;
    }

    setSelectedTemplateId(null);
    setEditState({
      ...EMPTY_EDIT_STATE,
      product_category: product,
      flow_order:
        templates.length > 0
          ? String(
              Math.max(
                ...templates.map((item) => item.flow_order ?? 0)
              ) + 1
            )
          : '1',
    });
    setFeedback(`Nenhum template cadastrado para ${PRODUCT_LABELS[product]}. Você pode criar o primeiro modelo deste produto.`);
  }

  const productCounts = useMemo(() => {
    return PRODUCT_FILTERS.reduce<Record<ProductCategory, number>>(
      (acc, product) => {
        acc[product.key] = templates.filter(
          (item) => normalizeProductCategory(item.product_category) === product.key
        ).length;

        return acc;
      },
      {
        clt: 0,
        fgts: 0,
        inss: 0,
        geral: 0,
      }
    );
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();

    return templates.filter((item) => {
      const product = normalizeProductCategory(item.product_category);

      if (product !== activeProduct) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        item.name,
        item.key,
        item.category,
        item.product_category || '',
        item.description || '',
        item.channel || '',
        item.message_text,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [templates, search, activeProduct]);

  const selectedTemplate =
    templates.find((item) => item.id === selectedTemplateId) || null;

  function formatDate(value: string | null) {
    if (!value) return '-';
    return new Date(value).toLocaleString('pt-BR');
  }

  function countButtons(buttons: WhatsAppTemplateRow['buttons']) {
    return Array.isArray(buttons) ? buttons.length : 0;
  }

  function handleEditChange(
    field: keyof Omit<TemplateEditState, 'buttons'>,
    value: string | boolean
  ) {
    setEditState((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === 'product_category' && typeof value === 'string') {
      setActiveProduct(normalizeProductCategory(value));
    }
  }

  function handleButtonChange(
    index: number,
    field: keyof WhatsAppButton,
    value: string
  ) {
    setEditState((prev) => ({
      ...prev,
      buttons: prev.buttons.map((button, i) =>
        i === index ? { ...button, [field]: value } : button
      ),
    }));
  }

  function handleAddButton() {
    setEditState((prev) => ({
      ...prev,
      buttons: [
        ...prev.buttons,
        {
          id: '',
          text: '',
        },
      ],
    }));
  }

  function handleRemoveButton(index: number) {
    setEditState((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index),
    }));
  }

  function validateButtons(buttons: WhatsAppButton[]) {
    for (let i = 0; i < buttons.length; i += 1) {
      const button = buttons[i];

      if (!button.id.trim()) {
        throw new Error(`O botão ${i + 1} está sem ID.`);
      }

      if (!button.text.trim()) {
        throw new Error(`O botão ${i + 1} está sem texto.`);
      }
    }

    const ids = buttons.map((button) => button.id.trim());
    const uniqueIds = new Set(ids);

    if (ids.length !== uniqueIds.size) {
      throw new Error('Os IDs dos botões não podem se repetir.');
    }
  }

  function validateForm() {
    if (!editState.name.trim()) {
      setFeedback('O nome do template é obrigatório.');
      return false;
    }

    if (!editState.key.trim()) {
      setFeedback('A chave do template é obrigatória.');
      return false;
    }

    if (!editState.category.trim()) {
      setFeedback('A categoria técnica do template é obrigatória.');
      return false;
    }

    if (!editState.product_category.trim()) {
      setFeedback('O produto do template é obrigatório.');
      return false;
    }

    if (!editState.message_text.trim()) {
      setFeedback('O texto da mensagem é obrigatório.');
      return false;
    }

    const flowOrder =
      editState.flow_order.trim() === ''
        ? null
        : Number(editState.flow_order.trim());

    if (
      editState.flow_order.trim() !== '' &&
      (!Number.isInteger(flowOrder) || Number(flowOrder) < 0)
    ) {
      setFeedback('A ordem do fluxo deve ser um número inteiro positivo.');
      return false;
    }

    try {
      validateButtons(editState.buttons);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Botões inválidos.';
      setFeedback(message);
      return false;
    }

    return true;
  }

  function buildPayload() {
    const flowOrder =
      editState.flow_order.trim() === ''
        ? null
        : Number(editState.flow_order.trim());

    const normalizedButtons =
      editState.buttons.length > 0
        ? editState.buttons.map((button) => ({
            id: button.id.trim(),
            text: button.text.trim(),
          }))
        : null;

    return {
      name: editState.name.trim(),
      key: editState.key.trim(),
      category: editState.category.trim(),
      product_category: normalizeProductCategory(editState.product_category),
      description: editState.description.trim() || null,
      flow_order: flowOrder,
      channel: editState.channel.trim() || 'whatsapp',
      is_active: editState.is_active,
      message_text: editState.message_text,
      buttons: normalizedButtons,
    };
  }

  async function handleSave() {
    if (!selectedTemplateId) {
      setFeedback('Selecione um template para editar.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    const payload = buildPayload();

    setSaving(true);
    setFeedback(null);

    const { error } = await supabase
      .from('whatsapp_templates')
      .update(payload)
      .eq('id', selectedTemplateId);

    if (error) {
      console.error(error);
      setFeedback(`Erro ao salvar template: ${error.message}`);
      setSaving(false);
      return;
    }

    await loadTemplates(selectedTemplateId);
    setFeedback('Template atualizado com sucesso.');
    setSaving(false);
  }

  async function handleCreateNewTemplate() {
    if (!validateForm()) {
      return;
    }

    const payload = buildPayload();

    setCreating(true);
    setFeedback(null);

    const { data, error } = await supabase
      .from('whatsapp_templates')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error(error);
      setFeedback(`Erro ao criar template: ${error.message}`);
      setCreating(false);
      return;
    }

    await loadTemplates(data?.id ?? null);
    setFeedback('Novo template criado com sucesso.');
    setCreating(false);
  }

  async function handleToggleActive(template: WhatsAppTemplateRow) {
    const { error } = await supabase
      .from('whatsapp_templates')
      .update({
        is_active: !template.is_active,
      })
      .eq('id', template.id);

    if (error) {
      console.error(error);
      setFeedback(`Erro ao alterar status: ${error.message}`);
      return;
    }

    await loadTemplates(template.id);
    setFeedback(
      !template.is_active
        ? 'Template ativado com sucesso.'
        : 'Template desativado com sucesso.'
    );
  }

  function handlePrepareNewTemplate() {
    setSelectedTemplateId(null);
    setEditState({
      ...EMPTY_EDIT_STATE,
      product_category: activeProduct,
      flow_order:
        templates.length > 0
          ? String(
              Math.max(
                ...templates.map((item) => item.flow_order ?? 0)
              ) + 1
            )
          : '1',
    });
    setFeedback(`Preencha os dados do novo template de ${PRODUCT_LABELS[activeProduct]} e clique em "Criar novo template".`);
  }

  return (
    <div style={{ padding: 24, background: '#F7FAFC', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#123C73' }}>Templates WhatsApp</h1>
        <p style={{ color: '#64748B', marginTop: 8 }}>
          Gestão centralizada dos textos, botões e status do funil de WhatsApp.
        </p>
      </div>

      {feedback ? (
        <div
          style={{
            marginBottom: 16,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: '14px 16px',
            color: '#123C73',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          }}
        >
          {feedback}
        </div>
      ) : null}

      <div
        style={{
          marginBottom: 18,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 24,
          padding: 16,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: '#123C73', fontSize: 18 }}>
              Separação por produto
            </h2>
            <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 13 }}>
              Escolha uma categoria operacional para visualizar e criar templates sem misturar CLT, FGTS e INSS.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {PRODUCT_FILTERS.map((product) => {
              const isActive = activeProduct === product.key;

              return (
                <button
                  key={product.key}
                  type="button"
                  onClick={() => handleProductFilterChange(product.key)}
                  style={{
                    border: `1px solid ${isActive ? product.accent : product.border}`,
                    background: isActive ? product.accent : product.background,
                    color: isActive ? '#FFFFFF' : product.accent,
                    borderRadius: 999,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    boxShadow: isActive ? '0 10px 24px rgba(15, 23, 42, 0.14)' : 'none',
                  }}
                >
                  {product.label} ({productCounts[product.key]})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 420px) minmax(420px, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 24,
            padding: 20,
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2 style={{ margin: 0, color: '#123C73', fontSize: 20 }}>
                Lista de templates
              </h2>
              <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 14 }}>
                Exibindo apenas: {PRODUCT_LABELS[activeProduct]}.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handlePrepareNewTemplate}
                style={{
                  background: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 14px',
                  cursor: 'pointer',
                }}
              >
                Novo template
              </button>

              <button
                type="button"
                onClick={() => void loadTemplates()}
                disabled={loading}
                style={{
                  background: loading ? '#94A3B8' : '#123C73',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar templates de ${PRODUCT_LABELS[activeProduct]} por nome, key, categoria...`}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid #CBD5E1',
              marginBottom: 16,
              color: '#0F172A',
              background: '#FFFFFF',
            }}
          />

          <div style={{ display: 'grid', gap: 12 }}>
            {loading ? (
              <div style={{ color: '#0F172A' }}>Carregando templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div style={{ color: '#64748B' }}>
                Nenhum template encontrado em {PRODUCT_LABELS[activeProduct]}.
              </div>
            ) : (
              filteredTemplates.map((template) => {
                const isSelected = template.id === selectedTemplateId;
                const product = normalizeProductCategory(template.product_category);
                const productConfig = getProductFilterConfig(product);

                return (
                  <div
                    key={template.id}
                    onClick={() => applyTemplateToEditor(template)}
                    style={{
                      border: isSelected
                        ? '1px solid #123C73'
                        : '1px solid #E2E8F0',
                      borderRadius: 18,
                      padding: 16,
                      cursor: 'pointer',
                      background: isSelected ? '#F8FBFF' : '#FFFFFF',
                      boxShadow: isSelected
                        ? '0 10px 30px rgba(18, 60, 115, 0.10)'
                        : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#123C73',
                            marginBottom: 4,
                          }}
                        >
                          {template.name}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: '#64748B',
                            wordBreak: 'break-word',
                          }}
                        >
                          {template.key}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          padding: '6px 10px',
                          borderRadius: 999,
                          background: template.is_active
                            ? '#DCFCE7'
                            : '#F1F5F9',
                          color: template.is_active ? '#166534' : '#475569',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {template.is_active ? 'Ativo' : 'Inativo'}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: productConfig.accent,
                          background: productConfig.background,
                          border: `1px solid ${productConfig.border}`,
                          borderRadius: 999,
                          padding: '5px 10px',
                          fontWeight: 800,
                        }}
                      >
                        Produto: {PRODUCT_LABELS[product]}
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          color: '#123C73',
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          borderRadius: 999,
                          padding: '5px 10px',
                        }}
                      >
                        Categoria: {template.category}
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          color: '#7C2D12',
                          background: '#FFF7ED',
                          border: '1px solid #FED7AA',
                          borderRadius: 999,
                          padding: '5px 10px',
                        }}
                      >
                        Ordem: {template.flow_order ?? '-'}
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          color: '#334155',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: 999,
                          padding: '5px 10px',
                        }}
                      >
                        Botões: {countButtons(template.buttons)}
                      </span>
                    </div>

                    {template.description ? (
                      <div
                        style={{
                          marginTop: 12,
                          fontSize: 13,
                          color: '#475569',
                          lineHeight: 1.5,
                        }}
                      >
                        {template.description}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 24,
            padding: 20,
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
              marginBottom: 20,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2 style={{ margin: 0, color: '#123C73', fontSize: 20 }}>
                {selectedTemplate ? 'Editar template' : 'Novo template'}
              </h2>
              <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 14 }}>
                {selectedTemplate
                  ? 'Ajuste texto, botões e status sem mexer no código.'
                  : `Preencha os campos para criar um novo template de ${PRODUCT_LABELS[activeProduct]}.`}
              </p>
            </div>

            {selectedTemplate ? (
              <button
                type="button"
                onClick={() => void handleToggleActive(selectedTemplate)}
                style={{
                  background: selectedTemplate.is_active ? '#F59E0B' : '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 14px',
                  cursor: 'pointer',
                }}
              >
                {selectedTemplate.is_active ? 'Desativar' : 'Ativar'}
              </button>
            ) : null}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#123C73',
                  fontWeight: 600,
                }}
              >
                Nome
              </label>
              <input
                type="text"
                value={editState.name}
                onChange={(e) => handleEditChange('name', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#123C73',
                  fontWeight: 600,
                }}
              >
                Key
              </label>
              <input
                type="text"
                value={editState.key}
                onChange={(e) => handleEditChange('key', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#123C73',
                  fontWeight: 600,
                }}
              >
                Produto
              </label>
              <select
                value={editState.product_category}
                onChange={(e) =>
                  handleEditChange(
                    'product_category',
                    normalizeProductCategory(e.target.value)
                  )
                }
                style={inputStyle}
              >
                {PRODUCT_FILTERS.map((product) => (
                  <option key={product.key} value={product.key}>
                    {product.label} — {product.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#123C73',
                  fontWeight: 600,
                }}
              >
                Categoria técnica
              </label>
              <input
                type="text"
                value={editState.category}
                onChange={(e) => handleEditChange('category', e.target.value)}
                style={inputStyle}
              />
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: '#64748B',
                }}
              >
                Mantém a categoria operacional já usada pelo backend, como disparo ou fluxo.
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#123C73',
                  fontWeight: 600,
                }}
              >
                Canal
              </label>
              <input
                type="text"
                value={editState.channel}
                onChange={(e) => handleEditChange('channel', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#123C73',
                  fontWeight: 600,
                }}
              >
                Ordem do fluxo
              </label>
              <input
                type="number"
                value={editState.flow_order}
                onChange={(e) => handleEditChange('flow_order', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#123C73',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={editState.is_active}
                  onChange={(e) =>
                    handleEditChange('is_active', e.target.checked)
                  }
                />
                Template ativo
              </label>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#123C73',
                  fontWeight: 600,
                }}
              >
                Descrição
              </label>
              <input
                type="text"
                value={editState.description}
                onChange={(e) =>
                  handleEditChange('description', e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#123C73',
                  fontWeight: 600,
                }}
              >
                Texto da mensagem
              </label>
              <textarea
                value={editState.message_text}
                onChange={(e) =>
                  handleEditChange('message_text', e.target.value)
                }
                rows={10}
                style={textareaStyle}
              />
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: '#64748B',
                }}
              >
                Você pode usar placeholders como {'{{nome}}'} e {'{{empresa}}'}.
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 10,
                  flexWrap: 'wrap',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    color: '#123C73',
                    fontWeight: 600,
                  }}
                >
                  Botões
                </label>

                <button
                  type="button"
                  onClick={handleAddButton}
                  style={{
                    background: '#123C73',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  Adicionar botão
                </button>
              </div>

              {editState.buttons.length === 0 ? (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: '1px dashed #CBD5E1',
                    background: '#F8FAFC',
                    color: '#64748B',
                    fontSize: 14,
                  }}
                >
                  Este template está sem botões. Adicione apenas se a mensagem
                  precisar ser enviada como lista clicável.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {editState.buttons.map((button, index) => (
                    <div
                      key={`${button.id}-${index}`}
                      style={{
                        border: '1px solid #E2E8F0',
                        borderRadius: 14,
                        padding: 14,
                        background: '#F8FAFC',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '160px 1fr auto',
                          gap: 12,
                          alignItems: 'end',
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: 'block',
                              marginBottom: 6,
                              color: '#123C73',
                              fontWeight: 600,
                            }}
                          >
                            ID do botão
                          </label>
                          <input
                            type="text"
                            value={button.id}
                            onChange={(e) =>
                              handleButtonChange(index, 'id', e.target.value)
                            }
                            placeholder="Ex.: 1"
                            style={inputStyle}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: 'block',
                              marginBottom: 6,
                              color: '#123C73',
                              fontWeight: 600,
                            }}
                          >
                            Texto do botão
                          </label>
                          <input
                            type="text"
                            value={button.text}
                            onChange={(e) =>
                              handleButtonChange(index, 'text', e.target.value)
                            }
                            placeholder="Ex.: Sim, quero"
                            style={inputStyle}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveButton(index)}
                          style={{
                            background: '#DC2626',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 10,
                            padding: '10px 12px',
                            cursor: 'pointer',
                            height: 42,
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: '#64748B',
                  lineHeight: 1.5,
                }}
              >
                Os botões continuam sendo salvos no formato JSON compatível com
                o backend e com a Z-API.
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              gap: 12,
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 13, color: '#64748B' }}>
              {selectedTemplate
                ? `Criado em ${formatDate(selectedTemplate.created_at)} • Atualizado em ${formatDate(selectedTemplate.updated_at)}`
                : 'Novo template ainda não salvo'}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {!selectedTemplate ? (
                <button
                  type="button"
                  onClick={() => void handleCreateNewTemplate()}
                  disabled={creating}
                  style={{
                    background: creating ? '#94A3B8' : '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px 18px',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {creating ? 'Criando...' : 'Criar novo template'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  style={{
                    background: saving ? '#94A3B8' : '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px 18px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#0F172A',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#0F172A',
  resize: 'vertical',
  fontFamily: 'inherit',
  lineHeight: 1.5,
};
