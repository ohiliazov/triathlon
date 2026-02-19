const XLSX = require('xlsx');
const fs = require('fs');

const buffer = fs.readFileSync('data/Oleksandr_Hiliazov__Run__2025.xlsx');
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

const wynikiSheet = workbook.Sheets['Wyniki'];
const wynikiData = XLSX.utils.sheet_to_json(wynikiSheet, { header: 1 });

const tRow = wynikiData.find((row) => row && row[0] === 't');
console.log('tRow:', JSON.stringify(tRow));
if (tRow) {
  console.log('tRow[5] type:', typeof tRow[5]);
  console.log('tRow[5] value:', tRow[5]);
  console.log('tRow[6] type:', typeof tRow[6]);
  console.log('tRow[6] value:', tRow[6]);
}
