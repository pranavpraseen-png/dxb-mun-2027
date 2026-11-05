# DXB MUN 2027

This folder holds the DXB MUN 2027 website (hosted by Indian High School, Dubai), the conference-day dashboards and every design option made for them.

## Open everything on any computer
1. Install **Node.js 22 LTS or newer** from https://nodejs.org. You only need to do this once per computer.
2. Get this folder:
   - Download it from GitHub with **Code → Download ZIP** and unzip it, or
   - clone it: `git clone https://github.com/pranavpraseen-png/dxb-mun-2027.git`
3. Open a terminal in the folder and type:

```bash
npm start
```

The first run installs the packages, which takes a few minutes. After that, your browser opens the **design picker**. Its left-hand list has every design:
- the approved build and the alternatives;
- the reference, motion and colour boards;
- the redesigns and restyles;
- the dashboards and the earlier concepts.

Press **Ctrl+C** in the terminal to stop.

There are also shortcuts you can double-click: `START-WINDOWS.bat` on Windows and `start-mac.command` on Mac. On a Mac, the first time, right-click it and choose Open.

## Dashboards
The dashboards run in demo mode with sample data. Sign in with any email and the code **123456**:
- an email containing "chair" opens the chair view;
- an email containing "admin" opens the secretariat view.

## Where things are
- `site/`: the app (React, Vite, Tailwind).
  - `site/picker/`: the design picker.
  - `site/concepts/<name>/`: one folder per homepage design.
  - `site/portal`, `site/chair` and `site/admin`: the three dashboards.
- `site/BLUEPRINT.md`: the approved homepage structure (Night Lab colours, Mona Sans fonts), taken from the owner's chosen reference sites.
- `site/concepts/refs/dissect/`: the measured breakdown of every reference site, liked and not liked.
- The live site is https://dxbmun-2027.vercel.app. Deploy steps are in `site/scripts/deploy.mjs`.
