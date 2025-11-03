# Project TODO

- [x] Estrutura HTML básica do chat com header contendo logo e título
- [x] Sistema de entrada com nickname (sem autenticação)
- [x] Interface de seleção de salas de conversa
- [x] Área de mensagens com scroll automático
- [x] Campo de entrada de mensagens com suporte a texto formatado
- [x] Seletor de emoticons
- [x] Funcionalidade de upload de arquivos
- [x] CSS com efeitos 3D e sombras modernas
- [x] Três salas padrão: "IDs de produtos", "Geral", "Manutenções"
- [x] Painel administrativo para criar novas salas
- [x] Funcionalidade de exportar conversas (backup JSON)
- [x] Funcionalidade de importar conversas (restaurar backup)
- [x] Armazenamento local das mensagens (localStorage)
- [x] Responsividade mobile
- [x] Criar arquivo ZIP final para download
- [x] Usar cores do logo (azul e cinza) no tema
- [x] Atribuir cores pastéis únicas para cada usuário

## Bugs Reportados
- [x] Corrigir erros de variáveis de ambiente não definidas
- [x] Implementar sincronização em tempo real entre múltiplos clientes
- [x] Alterar senha do admin para senha criptografada
- [x] Remover exibição da senha padrão na interface

## Novo Bug Reportado
- [x] Corrigir comando NODE_ENV para funcionar no Windows (cross-env)

## Novas Melhorias Solicitadas
- [x] Corrigir logo para usar o da GetScale
- [x] Chat com altura fixa ocupando toda a janela
- [x] Scroll interno apenas na área de mensagens
- [x] Scroll automático ao receber novas mensagens

## Bug Reportado
- [x] Remover scroll da página inteira, manter apenas scroll interno das mensagens
- [x] Melhorar scroll automático para novas mensagens
- [x] WebSocket conecta automaticamente (já implementado)
- [x] Adicionar badge com contador de mensagens não lidas por sala

## Novas Funcionalidades Solicitadas
- [x] Adicionar data completa nas mensagens (além da hora)
- [x] Adicionar campo de busca para filtrar mensagens por texto
- [x] Atualizar script dev no package.json para usar tsx watch
- [x] Verificar se cross-env está sendo usado corretamente no script dev
- [ ] Corrigir package.json - cross-env não está sendo incluído no script dev do ZIP
- [ ] Criar arquivo .env.example com variáveis necessárias para o projeto funcionar
- [x] Adicionar senha de usuário comum (Gs19372828*) criptografada
- [x] Bloquear acesso para senhas não autorizadas
- [x] Manter duas senhas: admin e usuário comum
- [x] Remover botão "Acesso Admin" - identificação automática pela senha de login

## Bug Reportado
- [x] Botão "Entrar no Chat" não funciona ao clicar (só funciona com Enter)
- [x] Implementar quebra de linha nas mensagens (Shift+Enter para quebra, Enter para enviar)
- [x] Adicionar preview automático de imagens nas mensagens
- [x] Ajustar cores dos usuários para tons mais distintos (mantendo pastéis)
- [x] Remover efeitos 3D para melhorar performance (manter sombras)

## Nova Funcionalidade: Controle de Produção
- [x] Criar aba de Controle de Produção
- [x] Campos: Nome, Data do Pedido, Situação, Itens e Quantidades
- [x] Sistema de workflow sequencial: Montagem → Teste → Gravação → Embalagem → Enviado
- [x] Botões liga/desliga para cada etapa (só habilita se anterior estiver completo)
- [x] Opção de editar pedido
- [x] Opção de adicionar itens ao pedido
- [x] Lista de pedidos com colunas de situação (check ou X)
- [x] Organização automática: não completos primeiro, depois completos
- [x] Arquivamento automático após 2 meses
- [x] Sincronização em tempo real via WebSocket

## Melhorias no Controle de Produção
- [x] Adicionar autocomplete de itens baseado em itens já utilizados
- [x] Melhorar visualização dos itens - usar linha completa com quantidade destacada no final

## Melhorias de Layout do Controle de Produção
- [x] Itens devem preencher toda a largura disponível (responsivo)
- [x] Adicionar botão expandir/recolher em cada pedido
- [x] Vista compacta: Nome do cliente e botões de status sempre visíveis
- [x] Vista expandida: Data e itens aparecem ao clicar na setinha

## Bugs Reportados
- [x] Adicionar botão de editar pedido visível
- [x] Corrigir bug do campo de quantidade (quando apaga tudo, aparece 1 e não permite digitar corretamente)

## Nova Funcionalidade
- [x] Permitir editar quantidades dos itens existentes no formulário de edição

## Novas Funcionalidades Solicitadas
- [x] Desmar cação em cascata - ao desmarcar uma etapa, desmarcar todas as posteriores- [x] Criar lista pré-definida de 17 produtos
- [x] Adicionar campo de protocolo com 5 opções padrão + possibilidade de adicionar novos

## Melhoria Solicitada
- [x] Pressionar Enter no campo de quantidade deve adicionar o item automaticamente

## Nova Funcionalidade
- [x] Adicionar botão de excluir pedido (disponível para todos os usuários)
- [x] Manter listas de produtos e protocolos após excluir pedido
- [x] Adicionar botão de exportar pedidos para PDF

## Bugs Reportados
- [x] Pedidos não aparecem após criação (adicionado logs de debug)
- [x] Login é perdido ao recarregar página (Ctrl+F5) - persistido no localStorage
