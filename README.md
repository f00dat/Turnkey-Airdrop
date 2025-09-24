📖 Guia de Instalação e Execução – Script Turnkey
1. 🔧 Instalar o Anaconda

Baixe o instalador do Anaconda:
👉 https://www.anaconda.com/download

Escolha a versão compatível com o seu sistema operacional (Windows/Linux/Mac).

Execute o instalador e siga as etapas:

Marque a opção “Add Anaconda to PATH” (no Windows).

Conclua a instalação.

Para testar, abra o terminal (ou Anaconda Prompt no Windows) e digite:

👉 Conda --version

Se aparecer a versão, está funcionando. ✅



2. 🏗️ Criar e Ativar Ambiente Virtual

No terminal, crie um ambiente chamado turnkey_env:

👉 conda create -n turnkey_env python=3.11 -y

Ative o ambiente:

Windows (Anaconda Prompt):

👉 conda activate turnkey_env

Linux/Mac:

👉 source activate turnkey_env



3. 📦 Instalar Node.js e NPM dentro do Ambiente

O script precisa do Node.js (que já vem com o NPM).

Instale via conda-forge:

👉 conda install -c conda-forge nodejs -y

Verifique a instalação:

👉 node -v
👉 npm -v


4. ▶️ Rodar o Script

Para executar diretamente:

👉 npm start

Caso queira rodar manualmente:

👉 node send.js
