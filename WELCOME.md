# Welcome to Jarvis 👋

This guide gets you from zero to talking with Jarvis, assuming **nothing**. If you
can download a file, you can run Jarvis.

Jarvis is a free AI assistant that runs on **your own computer**. You can **type**
to it or **talk** to it, and it answers back — in text and out loud. Best of all,
it **speaks your language**: write or say something in English, Italian, Spanish,
French, Portuguese or Hindi, and Jarvis replies in that same language.

---

## What you need

- A **Windows 10 or 11** PC (64-bit).
- **8 GB of RAM** or more (16 GB is comfortable). Jarvis runs the AI on your own
  machine, so memory matters.
- About **4 GB of free disk space** in total: the app itself (~0.5 GB), the AI
  model you download once (~2 GB), and the speech models downloaded on first
  voice use (~0.5 GB).
- An internet connection **for setup only** — once it's set up, the chat and voice
  run offline.

A graphics card (GPU) with **WebGPU** support makes things faster, but Jarvis works
without one too, just slower.

> Not sure about your PC? Press the **Windows key**, type **"About your PC"**, and
> open it — it shows your Windows version, processor, and installed RAM.

---

## Estructura Técnica
JARVIS utiliza módulos ES6 para manejar la lógica de forma limpia:
- `assets/jarvis.js`: Handler de API.
- `assets/voice-manager.js`: Control de voz.
- `assets/styles.css`: Estilos de la interfaz.

Jarvis thinks using a free local AI engine called **Ollama**. You install it once.

1. Go to **https://ollama.com** and click **Download**.
2. Run the installer and follow the prompts. Ollama now runs quietly in the
   background.
3. Open a terminal (press the **Windows key**, type **`cmd`**, press **Enter**) and
   paste this line, then press **Enter**:

   ```
   ollama pull qwen2.5:3b
   ```

   This downloads the AI model Jarvis uses (about 2 GB). Wait for it to finish —
   you only ever do this once.

> **How do I know Ollama is running?** After installing, look for the Ollama icon
> near the clock in your taskbar. If you don't see it, open the Start menu and
> launch **Ollama**.

---

## Step 2 — Download Jarvis

1. Go to the [**Releases**](../../releases/latest) page.
2. Under the latest release, download the file named
   **`JARVIS-Voice-Agent-Setup-<version>.exe`**.

---

## Step 3 — Install & run Jarvis

1. Open the file you just downloaded (usually in your **Downloads** folder).

   **The first time**, Windows may show a blue box that says *"Windows protected
   your PC"*. This happens with all free apps that aren't paid-signed. Just click:

   - **More info**
   - then **Run anyway**

2. The installer opens. It installs **just for you** and needs **no administrator
   password**. Click through **Next → Install → Finish**. (You can tick "Create a
   desktop icon" if you'd like one.)
3. Launch **JARVIS Voice Agent** — from the **Start menu**, the **desktop icon**, or
   by leaving "Launch JARVIS Voice Agent" ticked on the last installer screen.

Jarvis opens. If Ollama is running, the top of the window says **ALL SYSTEMS ONLINE
(LOCAL)**.

> **To uninstall later:** open Windows **Settings → Apps**, find *JARVIS Voice
> Agent*, and click **Uninstall**.

---

## Step 4 — Your first chat (in any language)

At the bottom of the window there's a box that says **"Message JARVIS…"**.

- Click it, type something — in English (*"Hi Jarvis, what can you do?"*) or in your
  own language (*"Ciao Jarvis, come stai?"*) — and press **Enter**.
- Jarvis replies in the panel, word by word, **in the language you wrote in**. If
  the speaker is on, he also reads it aloud in a matching native voice. Click
  **LISTEN** under any reply to hear it again.

---

## Step 5 — Talk to Jarvis (voice mode)

1. Click the **microphone** button (bottom-left of the message box), or the **Voice
   mode** control, to open the full-screen glowing sphere.
2. **Hold the Space bar** while you speak, then let go — or tap the mic on screen.
   Speak in whatever language you like.
3. Jarvis transcribes what you said, thinks, and **speaks the answer back** in that
   language.
4. Prefer a different English voice? Use the voice control in the header (top-right)
   to pick from **five voices**. (Other languages use their own native voice.)
5. Click **✕ EXIT** (top-right) to return to the chat.

> **First voice use** downloads the speech models once (a few hundred MB). After
> that, the voice works fully offline.

---

## Tips & troubleshooting

- **Jarvis says systems are offline / chat doesn't answer.** Ollama isn't running,
  or the model isn't pulled. Make sure Ollama is open, and that you ran
  `ollama pull qwen2.5:3b` (Step 1).
- **The voice picked the wrong microphone.** Use the **MIC** button in the header
  to choose a different input.
- **The first launch feels slow.** Jarvis warms up its voice engine on start and
  downloads the speech models on first voice use. Later launches are faster.
- **A smaller model may sometimes reply in the wrong language on very short
  messages.** Give it a full sentence and it mirrors your language reliably.
- **Nothing is sent to the cloud.** Your conversations and voice stay on your
  machine. The only network use is the one-time downloads and your prompts going to
  Ollama on your own PC.

---

Enjoy Jarvis — and if you like this free taste, it's a small slice of the full
**Jarvis** desktop assistant.
