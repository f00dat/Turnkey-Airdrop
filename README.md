# 🤖 Script para o Airdrop da Turnkey: Guia de Instalação e Execução 👇

Este repositório documenta os passos necessários para instalar, configurar e executar o **Script da Turnkey** em um ambiente isolado com **Anaconda** e **Node.js/NPM**.

---

## 📦 Pré-requisitos

- [Anaconda](https://www.anaconda.com/download) instalado no sistema.  
- Acesso ao terminal (**Anaconda Prompt** no Windows ou **bash/zsh** no Linux/Mac).  
- Conexão com a internet para instalar pacotes.  

---

## 1. 🔧 Instalar o Anaconda

1. Baixe o instalador do Anaconda:  
   👉 [https://www.anaconda.com/download](https://www.anaconda.com/download)  
2. Escolha a versão compatível com o seu sistema operacional (**Windows/Linux/Mac**).  
3. Execute o instalador e siga as etapas:  
   - No Windows, marque a opção **“Add Anaconda to PATH”**.  
   - Conclua a instalação.  
4. Para confirmar a instalação, abra o terminal e digite:  
   ```bash
   conda --version

---

## 2. 🏗️ Criar e Ativar o Ambiente Virtual

Crie um ambiente chamado **turnkey_env** com Python 3.11:

```bash
conda create -n turnkey_env python=3.11 -y

```

Ative o ambiente:

Windows (Anaconda Prompt):

```bash
conda activate turnkey_env
```

Linux/Mac:

```bash
source activate turnkey_env
```
---

3. 📦 Instalar Node.js e NPM no Ambiente

O script utiliza Node.js (que já inclui o NPM).

Instale via conda-forge:

```bash
conda install -c conda-forge nodejs -y
```

Verifique se está funcionando:

```bash
node -v
npm -v
```

---

3. ▶️ Executar o Script

Método 1 – Usar npm start:

```bash
npm start
```

Método 2 – Executar manualmente:

```bash
node send.js
```

---

5. ⏰ Execução Automática

🖥️ Windows – Agendador de Tarefas

Abra o Agendador de Tarefas.

Crie uma nova tarefa.

Configure o horário desejado (exemplo: todos os dias às 12h).

Na ação, coloque o seguinte comando:

```bash
C:\Users\SEU_USUARIO\anaconda3\Scripts\conda.exe run -n turnkey_env npm start
```

Recomendado (Caso queira agendar diretamente via Powershell):

```bash

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-Command `"& 'C:\Users\SEU_USUARIO\anaconda3\Scripts\conda.exe' run -n turnkey_env npm start`""
$Trigger = New-ScheduledTaskTrigger -Daily -At 12:00
Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName "TurnkeyScript" -Description "Executa o npm start no ambiente turnkey_env todos os dias ao meio-dia"
```

🐧 Linux/Mac – Cron

Abra o cron:

```bash
crontab -e
```

Adicione a linha para rodar todos os dias às 12h:

```bash
0 12 * * * /home/SEU_USUARIO/anaconda3/envs/turnkey_env/bin/npm start
```

---
