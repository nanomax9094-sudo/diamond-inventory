// Generates a sample bulk-upload Excel file: sample-diamonds.xlsx
import xlsx from 'xlsx';

const rows = [
  { SKU: 'SH-1001', 'Certificate Type': 'IGI', 'Certificate Number': 'IGI123456', Shape: 'Round', Carat: 1.05, Color: 'D', Clarity: 'VS1', Cut: 'Excellent', Polish: 'Excellent', Symmetry: 'Excellent', Measurements: '6.5x6.5x4.0', Origin: 'lab-grown', Price: 4200, Cost: 3000 },
  { SKU: 'SH-1002', 'Certificate Type': 'GIA', 'Certificate Number': 'GIA987654', Shape: 'Oval', Carat: 1.50, Color: 'E', Clarity: 'VVS2', Cut: 'Excellent', Polish: 'Very Good', Symmetry: 'Excellent', Measurements: '8.0x6.0x4.0', Origin: 'lab-grown', Price: 6800, Cost: 5000 },
  { SKU: 'SH-1003', 'Certificate Type': 'IGI', 'Certificate Number': 'IGI222333', Shape: 'Princess', Carat: 0.90, Color: 'F', Clarity: 'SI1', Cut: 'Very Good', Polish: 'Excellent', Symmetry: 'Very Good', Measurements: '5.5x5.5x4.0', Origin: 'lab-grown', Price: 3100, Cost: 2200 },
  { SKU: 'SH-1004', 'Certificate Type': 'GIA', 'Certificate Number': 'GIA445566', Shape: 'Emerald', Carat: 2.01, Color: 'G', Clarity: 'VS2', Cut: 'Excellent', Polish: 'Excellent', Symmetry: 'Excellent', Measurements: '8.5x6.0x4.2', Origin: 'natural', Price: 12000, Cost: 9000 },
  { SKU: 'SH-1005', 'Certificate Type': 'IGI', 'Certificate Number': 'IGI778899', Shape: 'Cushion', Carat: 1.20, Color: 'D', Clarity: 'VVS1', Cut: 'Excellent', Polish: 'Excellent', Symmetry: 'Very Good', Measurements: '6.8x6.5x4.3', Origin: 'lab-grown', Price: 5200, Cost: 3800 },
];

const ws = xlsx.utils.json_to_sheet(rows);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Diamonds');
xlsx.writeFile(wb, 'sample-diamonds.xlsx');
console.log('✓ Wrote sample-diamonds.xlsx');
