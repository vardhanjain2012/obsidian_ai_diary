# Obsidian Local AI Agent & Diary System

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136.0-green.svg)](https://fastapi.tiangolo.com/)
[![LangChain](https://img.shields.io/badge/LangChain-1.2.15-orange.svg)](https://www.langchain.com/)

A fully local, privacy-first AI agent integrated directly into an Obsidian vault. This project uses a custom Map-Reduce architecture powered by LangChain and local LLMs to intelligently search, summarize, and track daily habits without ever sending personal data to the cloud.

## ✨ Features

* **Interactive Daily Logging (`Cmd + J`):** A custom JavaScript UI that pops up inside Obsidian to log daily habits. It reads from a configuration file and can intelligently suggest defaults based on the previous day's data.
* **AI Vault Search (`Cmd + Shift + A`):** A sleek, Spotlight-style search bar that queries the diary vault using natural language.
* **Map-Reduce Architecture:** The Python backend uses LangChain to extract exact dates, filter files natively in Python (bypassing LLM context limits), map over relevant daily entries, and reduce them into a synthesized answer.
* **Dynamic Dashboard:** A built-in DataviewJS heatmap calendar that visually tracks journaling consistency and automatically generates missing daily note files.
* **100% Air-Gapped Data Privacy:** Designed with OS-level symlinks and `.env` variables so the actual personal diary notes are physically separated from the tracked Git repository.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Obsidian UI   │    │   FastAPI        │    │   Local LLM     │
│                 │    │   Backend        │    │   (llama.cpp)   │
│ • ask_ai.js     │◄──►│ • main.py        │◄──►│ • OpenAI API    │
│ • update_prompts│    │ • query_engine.py│    │   Compatible    │
│   .js           │    │ • Map-Reduce     │    │ • GGUF Models   │
│ • Dashboard.md  │    │   Logic          │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Diary Vault   │
                    │ • daily_notes/  │
                    │ • system/       │
                    │   Symlinked     │
                    │ • Templates/    │
                    │ • .obsidian/    │
                    └─────────────────┘
```

## 📁 Repository Structure

This repository contains the application logic and templates. It is designed to be symlinked into a secure Obsidian vault.

```
diary/ (Git Repo)
├── .obsidian/              # (Tracked) Version-controlled settings
├── .gitignore
├── requirements.txt
├── README.md
├── system/
│   └── Prompt_Config_Example.md
├── AI_backend/
│   ├── .env.example
│   ├── main.py
│   ├── query_engine.py
│   ├── models/              # (Untracked) .gguf model files
│   └── llama.cpp/           # (Untracked) Local LLM server engine
└── Templates/
    ├── ask_ai.js
    ├── update_prompts.js
    ├── Daily-Dynamic-Template.md
    └── Dashboard.md
```

## 📋 Prerequisites

Before setting up, ensure you have:

- **Python 3.8+** installed on your system
- **Obsidian** installed with the following plugins:
  - [Dataview](https://github.com/blacksmithgu/obsidian-dataview)
  - [QuickAdd](https://github.com/chhoumann/quickadd)
- **Git** for cloning repositories
- **A GGUF model file** (e.g., Llama 3.1 8B Instruct) - download from [Hugging Face](https://huggingface.co/)

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd diary
```

### 2. Set Up llama.cpp

Clone llama.cpp into the AI_backend directory and build it:

```bash
cd AI_backend
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp
# Follow build instructions: https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md
make
```

Download a GGUF model file (e.g., from Hugging Face) and place it in `AI_backend/models/`.

### 3. Set Up the Python Backend

Create a virtual environment and install dependencies:

```bash
cd ../  # Back to AI_backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r ../requirements.txt
```

Copy the example environment file and configure it:

```bash
cp .env.example .env
# Edit .env to set: VAULT_DAILY_NOTES_PATH=/absolute/path/to/your/secure/daily_notes
```

### 4. Set Up the Obsidian Vault

Create a separate folder for your Obsidian vault (this should live outside the Git repository).

Inside your vault, create a `daily_notes/` directory for your journal entries.

Use OS-level symlinks to link the Templates and .obsidian directories from the Git repo into your vault:

```bash
# macOS/Linux
ln -s /path/to/repo/Templates /path/to/vault/Templates
ln -s /path/to/repo/.obsidian /path/to/vault/.obsidian

# Windows (PowerShell as Administrator)
New-Item -ItemType SymbolicLink -Path "C:\path\to\vault\Templates" -Target "C:\path\to\repo\Templates"
New-Item -ItemType SymbolicLink -Path "C:\path\to\vault\.obsidian" -Target "C:\path\to\repo\.obsidian"
```

Copy `system/Prompt_Config_Example.md` from the repo to your vault's `system/` folder and rename it to `Prompt_Config.md`. Customize it with your habit tracking questions.

Configure the Obsidian QuickAdd plugin:
- Create a macro for `ask_ai.js` and assign it to `Cmd + Shift + A`
- Create a macro for `update_prompts.js` and assign it to `Cmd + J`

Ensure the Dataview plugin is enabled for the Dashboard heatmap.

## 🏃‍♂️ Running the System

You must start the AI model server first, followed by the Python API.

### Terminal 1: Start the LLM Server

```bash
cd AI_backend/llama.cpp
./llama-server -m ../models/your-model.gguf --port 8080 -c 4096 -ngl 99
```

### Terminal 2: Start the Python Backend

```bash
cd ../  # Back to AI_backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

Once both servers are running, open Obsidian and use your assigned hotkeys:
- `Cmd + Shift + A`: Open AI search interface
- `Cmd + J`: Open habit tracking interface

## 📖 Usage Examples

### Daily Habit Tracking
1. Open a daily note (e.g., `2024-01-15.md`)
2. Press `Cmd + J` to launch the habit tracker
3. Answer the prompts from your `Prompt_Config.md`
4. The system automatically suggests yesterday's answers as defaults

### AI-Powered Search
1. Press `Cmd + Shift + A` to open the search interface
2. Ask natural language questions like:
   - "How many times did I go gym this month?"
   - "What was my mood like last week?"
   - "Did I complete any deep work sessions in December?"

### Dashboard Visualization
- Open `Templates/Dashboard.md` to see your journaling heatmap
- Green: Complete entries with brain dumps and all habits tracked
- Yellow: Brain dump present but some habits skipped
- Red: Missing or incomplete entries

## 🔧 Troubleshooting

### Common Issues

**"Connection Failed: Server issue"**
- Ensure both the LLM server (port 8080) and FastAPI backend (port 8000) are running
- Check that your `.env` file has the correct `VAULT_DAILY_NOTES_PATH`

**"Prompt_Config.md not found"**
- Verify the file exists in `vault/system/Prompt_Config.md`
- Ensure the symlink to Templates is correctly created

**LLM Server won't start**
- Check that your GGUF model file is in `AI_backend/models/`
- Ensure you have sufficient RAM/VRAM for your chosen model
- Try reducing `-c 4096` to a lower context size

**Heatmap not rendering**
- Confirm Dataview plugin is installed and enabled
- Check that daily notes are in the `daily_notes/` folder

### Performance Tips

- Use GPU acceleration (`-ngl 99`) for faster inference
- Keep context size reasonable (4096 tokens) for daily queries
- Consider smaller models for faster startup times

## 🔮 Future Features

- **Fast-Path Analytics:** Implementing a state-aware caching layer that bypasses LLM inference for habit tracking if the data is already structured in the database, significantly reducing latency and compute costs.

- **Thematic Search & Summarization:** Integrating a local vector database to enable semantic search across your entire vault and adding specialized prompts to track specific weekly progress.