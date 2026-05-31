# 🦷 Dental Course — Lectures page

A web page that organises your lecture PDFs for students in three levels:
**Stage → Lecture → PDF files**. To add material you just drop a PDF into the
right folder — the list rebuilds and the website updates automatically.

## Folder structure

```
lectures/
  1 - First Year/
    Lecture/                      <- the "Lecture" tab
      Dental Anatomy/             <- a subject (you create this; the lecture name)
        01 - Tooth Morphology.pdf
        02 - Eruption.pdf
      Oral Histology/
        01 - Enamel.pdf
    Labs/                         <- the "Labs" tab
      Wax Lab/
        01 - Wax Carving.pdf
  2 - Second Year/
    Lecture/
    Labs/
  3 - Third Year/
  4 - Fourth Year/
  5 - Fifth Year/
```

- **First Year – Fifth Year** = the study levels (already created).
  The `1 - `, `2 - ` … prefix just keeps them in order; the page shows only
  "First Year", "Second Year", etc.
- Each year has two categories: **`Lecture`** and **`Labs`** (already created).
- Inside `Lecture` or `Labs`, **you create a folder per subject** (the lecture
  name), e.g. `Dental Anatomy`. Then put the **PDFs** inside that subject folder.
- On the website: click a year → pop-up with **Lecture** / **Labs** tabs → each
  tab lists the subject folders → click a subject to expand its PDFs.
- (PDFs dropped straight into `Lecture`/`Labs` with no subject folder also show up.)

## Files

| File | What it is |
|------|------------|
| `index.html` | The page students see (search + expandable Stage → Lecture → PDF list). |
| `lectures/Stage 1..5/` | **Your content goes here**, one lecture folder per subject. |
| `lectures.json` | Generated automatically — you don't edit it by hand. |
| `Update-Lectures.ps1` | Double-click to rebuild the list and publish (Windows). |
| `.github/workflows/build-lectures.yml` | Rebuilds + deploys the site on GitHub when you push. |

## Adding a lecture / PDF

1. Open the year you want (e.g. `lectures/1 - First Year`).
2. Open the **`Lecture`** folder (or **`Labs`**).
3. Make a folder named after the subject/lecture, e.g. `Dental Anatomy`
   (prefix with a number like `01 - …` to control order if you want).
4. Drop the PDF inside that subject folder. Name it so it sorts and reads nicely,
   e.g. `01 - Tooth Morphology.pdf` (the number and title come from the file name).
5. Run **`Update-Lectures.ps1`** (or `git add . && git commit -m "add lecture" && git push`).
6. Done — the page updates in about a minute.

> **Tip on ordering:** put a number at the start of a year or PDF name
> (`01 - …`) and items sort by that number. Without a number they sort alphabetically.

## Publishing it online (free, one-time setup)

So students can open it with a link:

1. Create a free account at https://github.com and a new **public** repository (e.g. `dental-lectures`).
2. Upload this whole folder to it (drag-and-drop on github.com works, or use `git`).
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Your page goes live at `https://<your-username>.github.io/<repo-name>/`.
   Share that link with your students.

After that, every time you push a new PDF the site rebuilds itself.

## Previewing on your computer

Opening `index.html` directly may block the lecture list (browser security).
To preview, run a tiny local server in this folder, then open the address it prints:

```powershell
python -m http.server 8000   # then visit http://localhost:8000
```

## Notes
- You need [Node.js](https://nodejs.org) installed for the local `Update-Lectures.ps1` script.
  (The online GitHub build does **not** need anything installed on your PC.)
- Want a custom description under a lecture? Add a `"description"` to its entry in
  `lectures.json` and set `"titleEdited": true` on that entry to keep your edits.
