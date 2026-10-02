# Offscript

Random topic picker for impromptu speaking — *think fast, speak clearly.*
Plain HTML/CSS/JS. No build step, no server, no database.

## Run it

- **Locally:** clone the repo and double-click `index.html`.
- **GitHub Pages:** repo → Settings → Pages → Source: *Deploy from a branch* → `main` / root.

## Hidden panel

**Double-click (or double-tap) "Begin research"** to open it.

| Action | How |
|---|---|
| Add topics | Type in the box and press Enter. Paste several at once, one per line. |
| Lock a topic | **Click the topic.** It turns copper and shows LOCKED. Every "New topic" click shuffles as usual, then lands on it. Click it again (or **Unlock**) to go back to random. |
| Edit a topic | Pencil icon → change the text → Enter (Esc cancels). Clearing the text deletes the topic. |
| Delete | Trash icon |
| Make edits permanent | **Export topics.js**, then replace `topics.js` in the project folder with the downloaded file. |
| Undo all panel edits | **Reset to file** (click twice) |

Panel edits are saved in your browser (localStorage) until you export them.
If your browser saves the download as `topics (1).js`, rename it to `topics.js`.

## Editing `topics.js` by hand

```js
window.TOPICS = [
  "Painted Door Test",
  "Kano Model",
];

window.LOCKED_TOPIC = "";   // "" = random, or an exact topic to always land on
```

If you set `LOCKED_TOPIC` and push the file to GitHub, every visitor lands on that topic.

## Files

```
index.html   page + hidden panel markup
style.css    design
app.js       shuffle, lock, panel logic
topics.js    topic list (edit this)
fonts/       Newsreader, Cormorant Garamond, Jost — SIL Open Font License 1.1
```
