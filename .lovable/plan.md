

## Plano: Corrigir Visualização do Relatório da Etapa

### Problema Identificado

A página `/etapa/:token` está mostrando dados vazios porque:

1. A tabela `etapa_assinaturas` tem política RLS pública: `token IS NOT NULL`
2. As tabelas `etapas` e `obras` **NÃO** têm políticas públicas - só permitem acesso para usuários autenticados (admins/colaboradores)
3. Quando o cliente não autenticado acessa a página, o JOIN retorna a assinatura mas **não** retorna os dados das tabelas relacionadas

**Comprovação:**
```sql
-- Query direta (com permissão elevada) retorna dados corretamente:
SELECT ea.*, e.titulo, o.nome, o.cliente_nome
FROM etapa_assinaturas ea
JOIN etapas e ON ea.etapa_id = e.id
JOIN obras o ON e.obra_id = o.id
WHERE ea.token = '6f2d88fb-888b-46ad-a873-7cb04c092369'

-- Resultado: "Casa Alphavile", "Thaís Brito", "Etapa 3"
```

### Solução Proposta

Criar uma **Edge Function** (`get-etapa-by-token`) que busque os dados da etapa usando Service Role Key, permitindo acesso público sem expor dados sensíveis.

Esta é a mesma abordagem que usamos com sucesso para `sign-etapa`.

### Mudanças Necessárias

#### 1. Nova Edge Function: `get-etapa-by-token`

```text
supabase/functions/get-etapa-by-token/index.ts

Responsabilidades:
- Receber: token
- Validar que o token existe
- Buscar dados da etapa e obra usando Service Role
- Buscar anexos da etapa
- Retornar dados sanitizados (sem expor IDs sensíveis)
```

**Dados retornados:**
```typescript
{
  assinatura: {
    id: string,
    assinatura_data: string | null,
    assinatura_nome: string | null
  },
  etapa: {
    id: string,
    titulo: string,
    descricao: string | null,
    ordem: number
  },
  obra: {
    nome: string,
    cliente_nome: string
  },
  anexos: Array<{
    id: string,
    nome: string,
    url: string,
    tipo: string
  }>
}
```

#### 2. Atualizar Página `VisualizarEtapa.tsx`

```text
Mudanças:
- Substituir useEtapaAssinaturaByToken por chamada à Edge Function
- Remover query separada para anexos (virá junto na resposta)
- Manter toda a lógica de exibição
```

#### 3. Configuração da Edge Function

```text
supabase/config.toml

Adicionar:
[functions.get-etapa-by-token]
verify_jwt = false  # Permitir acesso público
```

### Fluxo Atualizado

```text
Cliente acessa /etapa/:token
        |
        v
VisualizarEtapa chama Edge Function
        |
        v
[Edge Function get-etapa-by-token]
        |
        ├─> Valida token
        |
        ├─> Busca etapa_assinaturas (Service Role)
        |
        ├─> Busca etapas + obras (Service Role)
        |
        ├─> Busca etapa_anexos (Service Role)
        |
        v
Retorna dados para o cliente
        |
        v
Página renderiza com informações corretas
```

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/get-etapa-by-token/index.ts` | Criar | Nova Edge Function para buscar dados |
| `src/pages/VisualizarEtapa.tsx` | Modificar | Usar Edge Function em vez de query direta |
| `supabase/config.toml` | Modificar | Adicionar configuração da nova função |

### Segurança

- O token UUID continua sendo a chave de acesso única
- A Edge Function não expõe IDs internos desnecessários
- Apenas dados públicos são retornados (nome obra, cliente, etapa, fotos)
- Emails e telefones não são expostos

---

### Detalhes Técnicos

**Edge Function - Estrutura:**
```typescript
// Buscar assinatura por token
const { data: assinatura } = await supabase
  .from("etapa_assinaturas")
  .select("*")
  .eq("token", token)
  .single();

// Buscar etapa com obra
const { data: etapa } = await supabase
  .from("etapas")
  .select("id, titulo, descricao, ordem, obra:obras(nome, cliente_nome)")
  .eq("id", assinatura.etapa_id)
  .single();

// Buscar anexos
const { data: anexos } = await supabase
  .from("etapa_anexos")
  .select("id, nome, url, tipo")
  .eq("etapa_id", assinatura.etapa_id);
```

**Hook atualizado (VisualizarEtapa):**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["etapa-public", token],
  queryFn: async () => {
    const { data, error } = await supabase.functions.invoke("get-etapa-by-token", {
      body: { token }
    });
    if (error) throw error;
    return data;
  },
  enabled: !!token,
});
```

