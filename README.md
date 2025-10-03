# 🏢 ThermoInventory

ThermoInventory é uma aplicação web full-stack desenvolvida para a gestão simples e eficiente de inventário por localização. A ferramenta permite a geração de etiquetas inteligentes com QR Codes, a contagem de itens através de leitor USB ou da câmera do celular, e a emissão de relatórios consolidados, tudo isso com uma interface moderna, responsiva e com tema claro/escuro.

## ✨ Funcionalidades Principais

* **Gerador de Etiquetas Inteligentes:**
    * **4 Tipos de Geração:** Organizados em abas para Lote Sequencial, Contagem Manual, Lote por Quantidade e Endereço.
    * **QR Code e Data Matrix:** Suporte para simbologias 2D modernas e confiáveis.
    * **Saída em PDF:** Geração de etiquetas em PDF com layouts personalizados para cada tipo.

* **Sistema de Inventário por Localização:**
    * **Contagem por Endereço:** Associa os produtos contados a uma localização física específica.
    * **Múltiplos Modos de Leitura:** Suporte total para leitores USB profissionais e para a câmera de qualquer celular moderno.
    * **Inventário Inteligente:** O sistema reconhece automaticamente o tipo de QR Code lido (Endereço, Produto ERP, Lote, Manual) e executa a ação correta.
    * **Trava de Segurança:** Após um número configurável de leituras, o sistema pausa e exige a revalidação do endereço para garantir a precisão.

* **Relatórios Profissionais:**
    * **Relatório Consolidado:** Um único botão gera um PDF completo com duas seções:
        1.  Relatório Detalhado por Endereço.
        2.  Relatório Geral com a soma total de cada produto.
    * **Backend Robusto:** A geração dos relatórios é feita no backend com C# e a biblioteca QuestPDF, garantindo performance e formatação profissional.

* **Experiência do Usuário (UX):**
    * **Design Responsivo:** A interface se adapta perfeitamente a desktops, tablets e celulares.
    * **Tema Claro/Escuro:** Com interruptor e persistência da escolha do usuário no cache do navegador.
    * **Persistência de Dados:** A contagem do inventário é salva localmente, protegendo o usuário contra fechamentos acidentais da página.
    * **Feedback em Tempo Real:** Mensagens de status e sinais sonoros (beep/buzz) para sucesso e erro.

## 💻 Tecnologias Utilizadas

* **Backend:**
    * C# / .NET
    * ASP.NET Core Web API
    * QuestPDF (para geração de relatórios em PDF)

* **Frontend:**
    * HTML5
    * CSS3 
    * JavaScript 
    * **Bibliotecas:**
        * EasyQRCodeJS (para geração de QR Codes)
        * jsPDF (para geração de etiquetas em PDF no cliente)
        * html5-qrcode (para leitura de QR Codes/códigos de barras pela câmera)

* **Ferramentas e Infraestrutura:**
    * Git & GitHub (Versionamento de Código)

## 🚀 Como Executar o Projeto (Ambiente de Desenvolvimento)

1.  **Pré-requisitos:**
    * Git
    * .NET SDK (versão usada no projeto)

2.  **Passos:**
    * Clone o repositório: `git clone [URL_DO_SEU_REPO_NO_GITHUB]`
    * Navegue até a pasta da solução.
    * Abra a solução (`.sln`).
    * Confie no certificado de desenvolvimento HTTPS do .NET executando no terminal (como administrador): `dotnet dev-certs https --trust`
    * Inicie o projeto com o botão de "Run" (▶️) ou "Debug" (🐞).
    * A aplicação estará acessível em `https://localhost:7100` (ou a porta configurada).

## 📖 Guia de Uso Básico

1.  **Gerar Etiquetas:**
    * Acesse a página do **Gerador**.
    * Selecione a aba correspondente ao tipo de etiqueta que deseja criar (Contagem Manual, Lote, Endereço, etc.).
    * Preencha os campos e clique em "Gerar". O download do PDF da etiqueta iniciará.

2.  **Realizar um Inventário:**
    * Acesse a página de **Inventário**.
    * Escolha um modo de início (Leitor USB ou Câmera).
    * **Passo 1:** Escaneie uma etiqueta de **Endereço**. O status confirmará o local.
    * **Passo 2:** Escaneie as etiquetas dos **Produtos** naquele local. A tabela será preenchida.
    * **Passo 3:** Se mudar de local, escaneie a nova etiqueta de **Endereço**. A contagem continuará, agora associada ao novo local.
    * **Passo 4:** Ao finalizar, clique em **"Gerar Relatório Final"**. O PDF consolidado será baixado.
    * **Passo 5:** Para começar uma nova contagem, clique em **"Encerrar e Limpar Inventário"**.