

## Plano: Adicionar Link de Relatório na Mensagem de Assinatura

### Objetivo

Incluir na mensagem do WhatsApp que envia o link de assinatura também um link para visualizar o relatório da etapa (com fotos), permitindo que o cliente veja os detalhes antes de assinar.

### Abordagem

Vamos criar uma nova página pública para visualização do relatório da etapa (semelhante à página `/assinar/:token`) que mostra as informações da etapa junto com os anexos/fotos.

### Mudanças Necessárias

#### 1. Nova Página Pública: `VisualizarEtapa`

Criar `src/pages/VisualizarEtapa.tsx` com:
- Acesso público via token (reutilizando o mesmo token da assinatura)
- Exibição das informações da obra e etapa
- Galeria de fotos/anexos da etapa
- Link para a página de assinatura
- Design responsivo e amigável

Estrutura da página:
- Header com logo e título
- Card com informações da obra (nome, cliente)
- Card com informações da etapa (título, ordem, descrição)
- Galeria de imagens em grid com visualização ampliada
- Botão para ir à página de assinatura

#### 2. Nova Rota no App.tsx

Adicionar rota:
```
/etapa/:token → <VisualizarEtapa />
```

#### 3. Atualizar Edge Function `send-signature-link`

Modificar a mensagem para incluir dois links:
- Link de visualização do relatório
- Link de assinatura

Nova estrutura da mensagem:
```
Olá {cliente_nome}! 👋

A etapa "{etapa_titulo}" (etapa {ordem}) da obra "{obra_nome}" foi aprovada e concluída.

📸 Visualize o relatório com fotos:
{link_visualizacao}

✍️ Confirme o recebimento com sua assinatura:
{link_assinatura}

Atenciosamente,
Equipe Tavitrum
```

#### 4. Hook para Buscar Anexos por Token

Criar `useEtapaAnexosByToken` para buscar anexos da etapa de forma pública:
- Recebe o token como parâmetro
- Busca o `etapa_id` através do token
- Retorna os anexos daquela etapa

### Segurança

- O acesso é controlado pelo token único (UUID)
- Apenas dados públicos são expostos (obra nome, etapa título, fotos)
- Não expõe dados sensíveis como emails ou telefones
- RLS da tabela `etapa_anexos` permite leitura pública das URLs de imagens que já são públicas no Storage

### Fluxo Atualizado

```text
Admin aprova etapa
        |
        v
Clica em "Enviar Link de Assinatura"
        |
        v
Edge Function envia mensagem com 2 links:
        |
        ├─> /etapa/:token    → Ver relatório com fotos
        |
        └─> /assinar/:token  → Assinar digitalmente
```

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/VisualizarEtapa.tsx` | Criar | Nova página pública de visualização |
| `src/App.tsx` | Modificar | Adicionar rota `/etapa/:token` |
| `supabase/functions/send-signature-link/index.ts` | Modificar | Incluir link de visualização na mensagem |
| `src/hooks/useEtapaAssinaturas.ts` | Modificar | Adicionar busca de anexos por token |

---

### Detalhes Técnicos

**Página VisualizarEtapa.tsx:**
- Usa o hook `useEtapaAssinaturaByToken` existente para validar token e buscar dados
- Adiciona query para buscar anexos relacionados
- Galeria de imagens com Dialog para visualização ampliada
- Botão que redireciona para `/assinar/:token`

**Modificação da Mensagem (Edge Function):**
```javascript
const viewLink = `${baseUrl}/etapa/${token}`;
const signatureLink = `${baseUrl}/assinar/${token}`;

const message = `Olá ${obra.cliente_nome}! 👋

A etapa *"${etapa.titulo}"* (etapa ${etapa.ordem}) da obra *"${obra.nome}"* foi aprovada e concluída.

📸 Visualize o relatório com fotos:
${viewLink}

✍️ Confirme o recebimento com sua assinatura:
${signatureLink}

Atenciosamente,
Equipe Tavitrum`;
```

**Política RLS (se necessário):**
- As fotos já estão em bucket público (`etapa-anexos`)
- A consulta de anexos será feita com base no `etapa_id` obtido via token válido

