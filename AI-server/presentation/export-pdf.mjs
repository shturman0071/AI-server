import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'index.html');
const pdfPath = path.join(__dirname, 'presentation.pdf');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => {
  if (window.lucide) window.lucide.createIcons();
});
await new Promise((r) => setTimeout(r, 1500));

const slideCount = await page.evaluate(() => document.querySelectorAll('.slide').length);
const pdfPages = [];

for (let i = 0; i < slideCount; i++) {
  await page.evaluate((index) => {
    const slides = document.querySelectorAll('.slide');
    slides.forEach((s, j) => {
      s.style.display = j === index ? 'flex' : 'none';
    });
    window.scrollTo(0, 0);
  }, i);

  const buf = await page.pdf({
    width: '1920px',
    height: '1080px',
    printBackground: true,
    pageRanges: '1',
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  pdfPages.push(buf);
}

await browser.close();

// Merge PDF buffers using simple approach: write individual pages then use pdf-lib if needed
// Puppeteer can't merge easily - use pdf-lib
const merged = await PDFDocument.create();

for (const buf of pdfPages) {
  const doc = await PDFDocument.load(buf);
  const [page] = await merged.copyPages(doc, [0]);
  merged.addPage(page);
}

const mergedBytes = await merged.save();
fs.writeFileSync(pdfPath, mergedBytes);
console.log('PDF saved:', pdfPath);
