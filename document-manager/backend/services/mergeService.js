const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

function mergeExcelFiles(filePaths, outputDir) {
  let combined = [];
  for (const fp of filePaths) {
    const wb = XLSX.readFile(fp);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    combined = combined.concat(rows);
  }
  const outWb = XLSX.utils.book_new();
  const outWs = XLSX.utils.json_to_sheet(combined);
  XLSX.utils.book_append_sheet(outWb, outWs, 'Merged');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const fileName = `merged_${Date.now()}.xlsx`;
  const outPath = path.join(outputDir, fileName);
  XLSX.writeFile(outWb, outPath);
  
  // Return relative path for database storage
  return path.join('uploads', fileName);
}

async function mergePdfFiles(filePaths, outputDir) {
  const mergedPdf = await PDFDocument.create();

  for (const filePath of filePaths) {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `merged_${Date.now()}.pdf`;
  const outPath = path.join(outputDir, fileName);
  fs.writeFileSync(outPath, mergedPdfBytes);

  // Return relative path for database storage
  return path.join('uploads', fileName);
}

module.exports = { mergeExcelFiles, mergePdfFiles };
