# Study Partner

SS1 study app: chemistry, maths, physics, biology and English, taught only from his own textbooks and class notes.

- `content/ss1/` topic text in each teacher's scheme order (built by the study-app scripts). Copyrighted book text: keep this repo private, personal use only.
- `lib/model.js` the only file that calls the AI (Gemini). Model set by `GEMINI_MODEL`, default `gemini-3.8-flash`.
- `app/api/ai/route.js` prompts and subject lock.
- `app/App.jsx` the whole phone UI (design C). Progress lives in the browser.

Environment variables on Vercel: `GEMINI_API_KEY` (required), `APP_CODE` (recommended), `GEMINI_MODEL` (optional).
