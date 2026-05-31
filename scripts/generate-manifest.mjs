// Scans the lectures/ folder and (re)builds lectures.json.
//
// Folder structure (4 levels):
//   lectures/<Year>/<Category>/<Subject>/<file>.pdf
// where <Category> is "Lecture" or "Labs", and <Subject> is the lecture name
// you create yourself, e.g.
//   lectures/1 - First Year/Lecture/Dental Anatomy/01 - Tooth Morphology.pdf
//   lectures/1 - First Year/Labs/Wax Lab/01 - Wax Carving.pdf
// (PDFs placed directly in a Category, with no Subject folder, also work.)
//
// Run with:  node scripts/generate-manifest.mjs
// Course title/subtitle in the existing lectures.json are preserved.

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lecturesDir = join(root, "lectures");
const manifestPath = join(root, "lectures.json");

// --- load existing manifest (to keep course title/subtitle) ---
let manifest = {
  courseTitle: "Dental Course — Lectures",
  courseSubtitle: "Course materials & lecture slides",
  stages: []
};
if (existsSync(manifestPath)) {
  try {
    const prev = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.courseTitle = prev.courseTitle ?? manifest.courseTitle;
    manifest.courseSubtitle = prev.courseSubtitle ?? manifest.courseSubtitle;
  } catch {}
}

// --- derive a sort number + clean title from a folder/file name ---
function parseName(name) {
  const base = name.replace(/\.pdf$/i, "");
  const numMatch = base.match(/\d{1,3}/);
  const number = numMatch ? parseInt(numMatch[0], 10) : null;
  // strip a leading "01 - " / "01. " / "1) " prefix for the title
  const m = base.match(/^\s*\d{1,3}\s*[-.)]\s*(.+)$/);
  let title = (m ? m[1] : base).replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return { number, title: title || base };
}

const dirsIn = (p) =>
  existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name) : [];
const pdfsIn = (p) =>
  existsSync(p) ? readdirSync(p).filter(f => f.toLowerCase().endsWith(".pdf")) : [];

const byNumberThenTitle = (a, b) =>
  (a.number ?? 999) - (b.number ?? 999) || a.title.localeCompare(b.title);

// keep "Lecture" and "Labs" in a sensible order even without number prefixes
const CATEGORY_ORDER = { lecture: 1, labs: 2 };
const catRank = name => CATEGORY_ORDER[name.trim().toLowerCase()] ?? 50;

let stageCount = 0, catCount = 0, subjectCount = 0, pdfCount = 0;

// build the file list for a single folder, with a relative URL prefix
const filesIn = (dirPath, relPrefix) => pdfsIn(dirPath).map(file => {
  const fMeta = parseName(file);
  const st = statSync(join(dirPath, file));
  pdfCount++;
  return {
    file,
    path: `${relPrefix}/${file}`,
    number: fMeta.number,
    title: fMeta.title,
    size: st.size,
    date: st.mtime.toISOString().slice(0, 10)
  };
}).sort(byNumberThenTitle);

const stages = dirsIn(lecturesDir).map(stageName => {
  const stageMeta = parseName(stageName);
  const stagePath = join(lecturesDir, stageName);

  const categories = dirsIn(stagePath).map(catName => {
    const catMeta = parseName(catName);
    const catPath = join(stagePath, catName);

    // PDFs dropped straight into the category (no subject folder)
    const looseFiles = filesIn(catPath, `${stageName}/${catName}`);

    // subject folders (the lecture names) the user adds manually
    const subjects = dirsIn(catPath).map(subName => {
      const subMeta = parseName(subName);
      const files = filesIn(join(catPath, subName), `${stageName}/${catName}/${subName}`);
      subjectCount++;
      return { folder: subName, number: subMeta.number, title: subMeta.title, files };
    }).sort(byNumberThenTitle);

    catCount++;
    return { folder: catName, title: catMeta.title, files: looseFiles, subjects };
  }).sort((a, b) => catRank(a.folder) - catRank(b.folder) || a.title.localeCompare(b.title));

  stageCount++;
  return { folder: stageName, number: stageMeta.number, title: stageMeta.title, categories };
}).sort(byNumberThenTitle);

manifest.stages = stages;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${stageCount} year(s), ${catCount} categories, ${subjectCount} subject(s), ${pdfCount} PDF(s) to lectures.json`);
