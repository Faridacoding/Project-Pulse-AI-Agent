# AI-Powered Meeting Insights & Newsletter Generator

An intelligent workflow automation tool that transforms unstructured meeting notes into structured project insights and professional stakeholder newsletters using the Claude Agent SDK.

## Demo
https://youtu.be/x3K7bJX9zRo 

## 🚀 Overview

This application demonstrates a full-stack AI integration designed to automate the bridge between raw meeting data and professional communication. It leverages Claude to perform cognitive tasks that typically take project managers significant time.

### Key Features
- **Intelligent Analysis**: Extracts project status, progress percentages, and high-priority items from messy text.
- **Structured Output**: Converts unstructured notes into a clean, actionable dashboard and PPT slide decks, Stakholder newsletter and Calendar management for meeting cadence.
- **Automated Communication**: Generates a draft stakeholder newsletter based on the analyzed data.
- **Modern Tech Stack**: Built with React, TypeScript, Express, and Tailwind CSS.

## 🛠️ Tech Stack
- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express.
- **AI Engine**: Claude (via the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk), which runs through Claude Code CLI).
- **Language**: TypeScript (End-to-End).

## 📋 Prerequisites
- Node.js (v18 or higher)
- [Claude Code CLI](https://claude.ai/code) with an active Claude Pro plan — the Claude Agent SDK uses it as a subprocess, so no separate Anthropic API key is needed

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd <project-directory>
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
No Anthropic API key is required — the app uses Claude via the Claude Code CLI.

Optionally, configure Google Drive/Calendar and email integrations:

1. Locate the `.env.example` file in the root directory.
2. Create a new file named `.env` (this file is ignored by Git for security).
3. Copy the contents of `.env.example` into `.env` and fill in your values.

**Google Drive & Calendar** (optional):
```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

**Email invitations** (optional):
```env
SMTP_USER=your_smtp_email_here
SMTP_PASS=your_smtp_app_password_here
```

### 4. Run the application
```bash
# Start the backend and frontend in development mode
npm run dev
```
The app will be available at `http://localhost:3000`.

### 5. Demo
[Project Pulse demo.mp4](https://github.com/Faridacoding/Program-Management-docs-samples/blob/main/Project-Pulse/Demo.mp4)

## 🔒 Security Note
- The `.env` file is listed in `.gitignore` to prevent it from being pushed to public repositories.
- The backend acts as a proxy, ensuring credentials are never exposed to the client-side browser.
- **Never** commit real credentials to `.env.example` or any other tracked file.

## 📝 License
MIT

---
*Created as an example of AI Workflow Automation.*
