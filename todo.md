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
