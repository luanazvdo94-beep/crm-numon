# NumOn CRM Clean

Versão reconstruída do zero, sem remendos, com foco em estabilidade de cadastro, autenticação via Supabase e fluxo limpo para GitHub/deploy.

## Escopo implementado

- Login e cadastro via Supabase Auth
- Layout dark premium responsivo
- Abas principais: Cadastro, Base e Funil
- Cadastro com criação e edição de leads
- Exclusão de leads com confirmação
- Atualização manual dos dados
- Exportação CSV da base filtrada
- Logout
- Persistência em Supabase com RLS por usuário
- Tratamento para problemas comuns de colagem e autocomplete

## Stack

- React 18
- TypeScript
- Vite
- Supabase JS
- PapaParse

## Estrutura

```txt
numon-crm-clean/
  src/
    components/
    App.tsx
    constants.ts
    main.tsx
    styles.css
    supabase.ts
    types.ts
    utils.ts
  supabase/
    schema.sql
  .env.example
  package.json
  README.md
```

## Como subir no GitHub e rodar

1. Crie um repositório novo.
2. Extraia os arquivos deste projeto.
3. No terminal:

```bash
npm install
cp .env.example .env
```

4. Preencha `.env` com as credenciais do seu projeto Supabase.
5. Rode o SQL de `supabase/schema.sql` no SQL Editor do Supabase.
6. Inicie localmente:

```bash
npm run dev
```

7. Para produção:

```bash
npm run build
```

## Decisões técnicas para eliminar os bugs anteriores

### 1. Formulário 100% controlado
Todos os campos usam estado React como fonte única de verdade. Isso reduz falhas clássicas de autocomplete, valores fantasmas e perda de sincronização entre DOM e estado.

### 2. Colagem tratada por campo
Os campos críticos interceptam `onPaste`, limpam o conteúdo e aplicam máscara/normalização antes de gravar em estado.

### 3. Normalização antes do banco
Telefone, CPF, moeda, e-mail e textos passam por limpeza antes do insert/update. Isso evita registros inconsistentes.

### 4. Um único fluxo de salvar
Sem patch sobre patch. O submit passa por um pipeline único:
- validar
- normalizar
- inserir ou atualizar
- recarregar base
- resetar estado

### 5. Segurança por usuário
RLS ativo no Supabase. Cada usuário só enxerga e altera os próprios leads.

## Próxima etapa recomendada

Depois de validar esta base limpa, o próximo passo correto é adicionar:
- importação CSV com parser seguro
- paginação real no Supabase
- campo de próxima ação/data de retorno
- funil com métricas por período
- auditoria simples de alterações

