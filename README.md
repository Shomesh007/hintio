<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Hintio Landing Page Website

Welcome to the landing page repository for **Hintio**. This is the promotional and distribution website where users learn about Hintio's capabilities and download the desktop application.

Hintio is a real-time, invisible desktop copilot designed primarily for interviews, high-stakes meetings, and developer assistance. It "listens" to system audio (speaker output and microphone input) entirely locally, transcribes the conversation, and provides instant, context-aware suggestions (hints) and live coding assistance in a stealthy, configurable UI.

*For comprehensive details about the product architecture, target users, and capabilities, refer to the `PRD.md` file located in the root of this repository.*

## Tech Stack
- React 19
- Vite
- Tailwind CSS v4
- Framer Motion

## Run Locally

**Prerequisites:** Node.js v18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open the browser to see the site running at `http://localhost:3000`.

## Architecture Note
This repository contains the marketing **web frontend** only. The actual Hintio product is a separate cross-platform desktop application built using Tauri, React, and Rust.
