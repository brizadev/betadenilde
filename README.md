# Beta Masas Edenilde - Sistema de Padaria

Sistema completo de gerenciamento para padaria desenvolvido em Electron.js com interface moderna e funcionalidades avançadas.

## 🚀 Funcionalidades

### Área de Vendas
- **Registro de Vendas**: Interface intuitiva para registrar vendas com data/hora automática
- **Busca de Clientes**: Sistema de busca instantânea com sugestões
- **Busca de Produtos**: Busca automática de produtos com preços
- **Múltiplas Unidades**: Suporte a vendas por unidade ou kg
- **Métodos de Pagamento**: Dinheiro ou fiado

### Área Administrativa
- **Extrato Geral**: Visualização completa de todas as transações
- **Gestão de Clientes**: Cadastro e gerenciamento de clientes
- **Gestão de Produtos**: Cadastro e gerenciamento de produtos
- **Perfil do Cliente**: Extrato individual com controle de dívidas
- **Sistema de Pagamentos**: Registro de pagamentos com cálculo automático
- **Configurações**: Alteração de senha e exportação de dados

### Recursos Técnicos
- **Banco SQLite Local**: Dados armazenados localmente
- **Interface Responsiva**: Design moderno e responsivo
- **Performance Otimizada**: Sistema leve e rápido
- **Exportação de Dados**: Backup em formato JSON
- **Instalador Automático**: Instalação fácil no Windows

## 📦 Instalação

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn

### Instalação das Dependências
```bash
npm install
```

### Executar em Desenvolvimento
```bash
npm start
```

### Build para Produção
```bash
npm run build
```

### Gerar Instalador
```bash
npm run dist
```

## 🎯 Como Usar

### Primeiro Acesso
1. Execute o aplicativo
2. Acesse a área administrativa com a senha padrão: `admin123`
3. Configure sua senha personalizada nas configurações

### Registrando uma Venda
1. Preencha a data/hora (preenchida automaticamente)
2. Digite o nome do cliente (busca automática)
3. Digite o nome do produto (busca automática)
4. Informe a quantidade e valor
5. Selecione o método de pagamento
6. Clique em "Registrar Venda"

### Gerenciando Clientes e Produtos
1. Acesse a área administrativa
2. Use os botões "Gerenciar Clientes" ou "Gerenciar Produtos"
3. Adicione novos itens conforme necessário

### Controlando Pagamentos
1. Na área administrativa, use "Buscar Perfil"
2. Digite o nome do cliente
3. Visualize o extrato individual
4. Use "Registrar Pagamento" para quitar dívidas

## 🔧 Configuração

### Banco de Dados
O sistema usa SQLite local, criando automaticamente as tabelas necessárias:
- `clients`: Dados dos clientes
- `products`: Catálogo de produtos
- `sales`: Registro de vendas
- `payments`: Registro de pagamentos
- `admin_settings`: Configurações do sistema

### Estrutura de Arquivos
```
beta-masas-edenilde/
├── main.js              # Processo principal do Electron
├── index.html           # Interface principal
├── script.js            # Lógica do frontend
├── styles.css           # Estilos da interface
├── package.json         # Configurações do projeto
├── build.js            # Script de build
└── assets/             # Recursos (ícones, etc.)
```

## 🛡️ Segurança

- Área administrativa protegida por senha
- Confirmação dupla para exclusões
- Validação de dados em todas as operações
- Backup automático via exportação

## 📊 Exportação de Dados

O sistema permite exportar todos os dados em formato JSON:
1. Acesse a área administrativa
2. Clique em "Exportar Dados"
3. Um arquivo JSON será baixado com todos os registros

## 🔄 Atualizações

Para atualizar o sistema:
1. Faça backup dos dados (exportação)
2. Instale a nova versão
3. Os dados serão preservados automaticamente

## 🐛 Solução de Problemas

### Problemas Comuns
- **Erro de banco de dados**: Verifique as permissões da pasta
- **Interface não carrega**: Verifique se todas as dependências estão instaladas
- **Dados não salvam**: Verifique o espaço em disco

### Logs
Os logs de erro são exibidos no console do desenvolvedor (F12).

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Verifique a documentação
- Consulte os logs de erro
- Entre em contato com o desenvolvedor

## 📄 Licença

Este software é fornecido "como está" para uso comercial e pessoal.

---

**Beta Masas Edenilde** - Sistema de Gerenciamento de Padaria
Desenvolvido com ❤️ para facilitar o dia a dia da sua padaria.
