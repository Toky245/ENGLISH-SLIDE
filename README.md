# ENGLISH-SLIDE

Hand-drawn, rage-comic styled web slide deck presented by **Group 3 — M1 OCC**
at the **École Nationale d'Informatique (ENI), Université de Fianarantsoa**.

🔗 **Live:** https://english-slide.vercel.app/

---

## Features

- 12 fully responsive slides, hand-drawn paper aesthetic with rage-face memes.
- Keyboard navigation (`←` / `→` / `Space` / `Home` / `End` / `F` for fullscreen).
- Touch swipe and mouse-wheel navigation.
- **Phone remote control** via QR code (powered by PeerJS / WebRTC) —
  scan, connect, navigate the slides from your phone.

## Stack

- Pure HTML / CSS / vanilla JS — no framework, no build step.
- Google Fonts: *Permanent Marker*, *Patrick Hand*, *Caveat*, *JetBrains Mono*.
- [PeerJS](https://peerjs.com/) for the peer-to-peer phone remote feature.
- Deployed on [Vercel](https://vercel.com/).

## Run locally

```bash
git clone https://github.com/Toky245/ENGLISH-SLIDE.git
cd ENGLISH-SLIDE
# any static server works — for example:
python3 -m http.server 8000
# then open http://localhost:8000
```

> The QR remote feature needs both devices to be reachable on the same URL.
> When running on `localhost`, your phone won't be able to reach the host —
> use the deployed Vercel URL instead.

## Context

Academic project — **Master 1 OCC**, ENI, Université de Fianarantsoa, 2026.
Presented in English. **Group 3.**
