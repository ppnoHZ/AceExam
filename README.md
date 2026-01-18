<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AceExam Monorepo

This project is structured as a monorepo containing both the frontend and backend.

## Project Structure

- `frontend/`: React-based frontend application (Vite).
- `backend/`: Node.js based backend.

## Run Locally

**Prerequisites:** Node.js

1.  **Install dependencies (from the root):**
    ```bash
    npm install
    ```

2.  **Set Environment Variables:**
    Set the `GEMINI_API_KEY` in `frontend/.env.local` to your Gemini API key.

3.  **Run the applications:**
    - To run both frontend and backend:
      ```bash
      npm run dev
      ```
    - To run only frontend:
      ```bash
      npm run frontend:dev
      ```
    - To run only backend:
      ```bash
      npm run backend:dev
      ```

## Build

To build both projects:
```bash
npm run build
```
