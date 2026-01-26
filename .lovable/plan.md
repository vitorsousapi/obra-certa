

## Plano: Corrigir Upload de Assinatura Pública

### Problema Identificado

O cliente que acessa o link de assinatura (`/assinar/:token`) não está autenticado. Atualmente, o código tenta fazer upload da imagem diretamente do navegador para o Storage, mas a política de segurança do bucket `assinaturas` exige autenticação:

```
INSERT: auth.role() = 'authenticated'
```

Isso causa o erro de upload quando o cliente tenta salvar sua assinatura.

### Solução Proposta

Criar uma **Edge Function** (`sign-etapa`) que processe a assinatura de forma segura:

1. Recebe o token e a imagem da assinatura do cliente
2. Valida o token contra a tabela `etapa_assinaturas`
3. Faz o upload da imagem usando a Service Role Key (que tem permissão total)
4. Atualiza o registro da assinatura no banco de dados
5. Retorna sucesso para o cliente

### Mudanças Necessárias

#### 1. Nova Edge Function: `sign-etapa`

```text
supabase/functions/sign-etapa/index.ts

Responsabilidades:
- Receber: token, signatureBase64, nome
- Validar que o token existe e não foi assinado
- Fazer upload da imagem para o bucket "assinaturas"
- Capturar IP do cliente (via headers)
- Atualizar etapa_assinaturas com os dados da assinatura
- Retornar sucesso ou erro apropriado
```

#### 2. Atualizar Hook `useSignEtapa`

```text
src/hooks/useSignEtapa.ts

Mudanças:
- Remover upload direto para Storage
- Chamar a Edge Function sign-etapa
- Passar signatureDataUrl convertido para base64
```

#### 3. Adicionar Configuração da Edge Function

```text
supabase/config.toml

Adicionar:
[functions.sign-etapa]
verify_jwt = false  # Permitir acesso público
```

### Fluxo Atualizado

```text
[Cliente não autenticado]
        |
        v
  Acessa /assinar/:token
        |
        v
  Desenha assinatura + nome
        |
        v
  useSignEtapa chama Edge Function
        |
        v
  [Edge Function sign-etapa]
        |
        ├─> Valida token (existe? já assinado?)
        |
        ├─> Upload imagem (usando Service Role)
        |
        ├─> Atualiza etapa_assinaturas
        |
        v
  Retorna sucesso para o cliente
```

### Segurança

- O token UUID é suficientemente único para prevenir adivinhação
- A Edge Function valida que `assinatura_data IS NULL` antes de processar
- A Service Role Key só é usada no servidor (Edge Function)
- O cliente nunca tem acesso direto ao Storage sem autenticação

---

### Detalhes Técnicos

**Edge Function - Estrutura:**
- Validação do token via query no banco
- Conversão de base64 para blob
- Upload para bucket `assinaturas` com nome único
- Captura do IP via `request.headers.get("x-forwarded-for")`
- Atualização atômica do registro

**Tratamento de Erros:**
- Token inválido ou não encontrado: 404
- Já assinado: 400
- Erro de upload: 500
- Erro de atualização: 500

