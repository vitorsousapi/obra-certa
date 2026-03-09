

## Plano: Criar página "Calendário" no menu lateral

### O que será feito

1. **Adicionar item "Calendário" no menu lateral** (`src/components/layout/AdminSidebar.tsx`)
   - Novo item no array `menuItems` com ícone `CalendarDays` e URL `/calendario`

2. **Criar página `src/pages/admin/Calendario.tsx`**
   - Usa `AdminLayout` com título "Calendário"
   - Busca todas as obras com status `em_andamento`, `aguardando_aprovacao` e `nao_iniciada` (via `useObras` ou query direta)
   - Renderiza um calendário mensal usando o componente `Calendar` (react-day-picker) já existente, mas em modo customizado para mostrar dias com obras
   - Cada dia que tem obra (baseado em `data_inicio` e `data_prevista`) recebe um indicador visual (dot/badge)
   - Ao clicar num dia, exibe uma lista/painel lateral com as obras ativas naquele período, mostrando:
     - Nome da obra, cliente, status
     - Etapas com status e responsáveis
     - Link para ir aos detalhes da obra (`/obras/:id`)

3. **Adicionar rota** (`src/App.tsx`)
   - Nova rota `/calendario` protegida com `requiredRole="admin"`

### Detalhes técnicos

- A query buscará obras com suas etapas e responsáveis (similar ao `useObra` mas para múltiplas obras)
- Um dia será considerado "ativo" se estiver entre `data_inicio` e `data_prevista` de alguma obra
- O calendário usará o `DayPicker` existente com `modifiers` customizados para destacar dias com obras
- O painel de detalhes ao clicar no dia será um card abaixo do calendário com scroll, listando obras e suas etapas

### Arquivos afetados
- `src/components/layout/AdminSidebar.tsx` — adicionar item de menu
- `src/pages/admin/Calendario.tsx` — nova página (criar)
- `src/App.tsx` — nova rota

