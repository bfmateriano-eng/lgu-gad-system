import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  ArrowLeft, Printer, FileSpreadsheet, RefreshCw, Database, Search 
} from 'lucide-react';

export default function ApprovedTable({ onBack }) {
  const [approvedPPAs, setApprovedPPAs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchApprovedPPAs();
  }, []);

  const fetchApprovedPPAs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gad_proposals')
        .select(`*, ppa_indicators (*), ppa_budget_items (*)`)
        .eq('status', 'Approved') 
        .order('office_name', { ascending: true });

      if (error) throw error;
      setApprovedPPAs(data || []);
    } catch (err) {
      console.error('Error fetching approved PPAs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => { window.print(); };

  // --- HIGH-FIDELITY EXCELJS EXPORT ---
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GAD Plan 2027');

    // 1. Setup Columns
    worksheet.columns = [
      { header: 'Gender Issue (1)', key: 'issue', width: 35 },
      { header: 'Cause/Data (2)', key: 'data', width: 35 },
      { header: 'Result Statement (3)', key: 'objective', width: 35 },
      { header: 'Relevant Program (4)', key: 'program', width: 25 },
      { header: 'GAD Activity (5)', key: 'activity', width: 35 },
      { header: 'Indicators & Budget (6)', key: 'details', width: 50 },
      { header: 'GAD Budget (7)', key: 'budget', width: 20 },
      { header: 'Source (8)', key: 'source', width: 15 },
      { header: 'Responsible Office (9)', key: 'office', width: 20 },
    ];

    // 2. Add Official Headers
    const titleRow = worksheet.insertRow(1, ['ANNUAL GENDER AND DEVELOPMENT (GAD) PLAN AND BUDGET']);
    worksheet.mergeCells('A1:I1');
    titleRow.font = { name: 'Arial Black', size: 14, underline: true };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const yearRow = worksheet.insertRow(2, ['FY 2027']);
    worksheet.mergeCells('A2:I2');
    yearRow.font = { bold: true, size: 12 };
    yearRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([]); // Spacer

    const orgRow = worksheet.addRow(['Organization:', 'Municipal Government of Pililla, Rizal', '', 'Category:', 'Local Government Unit']);
    orgRow.font = { bold: true };
    
    const budgetTotalRow = worksheet.addRow(['Total GAD Budget:', grandTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })]);
    budgetTotalRow.font = { bold: true, color: { argb: 'FF1E1B4B' } };

    worksheet.addRow([]); // Spacer

    // 3. Define the Table Header Style
    const tableHeaderRow = worksheet.addRow([
      'GENDER ISSUE / GAD MANDATE (1)', 'CAUSE OF ISSUE / DATA (2)', 'GAD RESULT STATEMENT (3)', 
      'RELEVANT ORG PROGRAM (4)', 'GAD ACTIVITY (5)', 'INDICATORS & BUDGET (6)', 
      'GAD BUDGET (7)', 'SOURCE (8)', 'OFFICE (9)'
    ]);

    tableHeaderRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    // 4. Function to add Section Header (Part A/B)
    const addSectionDivider = (text) => {
      const row = worksheet.addRow([text]);
      worksheet.mergeCells(`A${row.number}:I${row.number}`);
      row.font = { bold: true, color: { argb: 'FFFFFFFF' }, italic: true };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate-700
    };

    const addPPARows = (items) => {
      items.forEach(ppa => {
        const s = parseGenderIssue(ppa.gender_issue);
        const indicators = ppa.ppa_indicators?.map(i => `• ${i.target_text} ${i.indicator_text}`).join('\n') || "";
        const budgetItems = ppa.ppa_budget_items?.map(b => `- ${b.item_description}: ₱${parseFloat(b.amount).toLocaleString()}`).join('\n') || "";

        const row = worksheet.addRow([
          s.issue,
          `${s.data}\nSource: ${s.source}`,
          ppa.gad_objective,
          ppa.relevant_program,
          ppa.gad_activity,
          `TARGETS:\n${indicators}\n\nBREAKDOWN:\n${budgetItems}`,
          ppa.total_mooe + ppa.total_ps + ppa.total_co,
          ppa.ppa_budget_items?.[0]?.fund_type || 'MOOE',
          ppa.office_name
        ]);

        row.eachCell((cell) => {
          cell.alignment = { vertical: 'top', wrapText: true };
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
        row.getCell(7).numFmt = '"₱"#,##0.00';
      });
    };

    // 5. Build Content
    addSectionDivider('A. CLIENT-FOCUSED (External)');
    addPPARows(clientFocused);

    addSectionDivider('B. AGENCY-FOCUSED (Internal)');
    addPPARows(agencyFocused);

    // 6. Footer Total
    const footerRow = worksheet.addRow(['', '', '', '', '', 'TOTAL CONSOLIDATED GAD BUDGET:', grandTotal]);
    footerRow.font = { bold: true };
    footerRow.getCell(7).numFmt = '"₱"#,##0.00';
    footerRow.getCell(6).alignment = { horizontal: 'right' };

    // 7. Write and Save
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Pililla_GAD_Plan_FY2027.xlsx`);
  };

  const parseGenderIssue = (str) => {
    if (!str) return { issue: 'N/A', data: 'N/A', source: 'N/A' };
    const parts = str.split('\n');
    return {
      issue: parts[0]?.replace('Issue: ', '') || 'N/A',
      data: parts[1]?.replace('Data: ', '') || 'N/A',
      source: parts[2]?.replace('Source: ', '') || 'N/A'
    };
  };

  const filteredPPAs = approvedPPAs.filter(ppa => 
    ppa.office_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ppa.gad_activity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grandTotal = filteredPPAs.reduce((sum, p) => sum + (p.total_mooe + p.total_ps + p.total_co), 0);
  const clientFocused = filteredPPAs.filter(p => p.ppa_category === 'Client-Focused');
  const agencyFocused = filteredPPAs.filter(p => p.ppa_category === 'Agency-Focused');

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* HEADER ACTIONS */}
      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase hover:text-indigo-600 transition-colors">
            <ArrowLeft size={16} /> Dashboard
          </button>
          <h1 className="text-3xl font-black text-indigo-950 tracking-tighter uppercase mt-2">Approved Registry</h1>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Filter Records..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold w-64 outline-none focus:border-indigo-500 shadow-sm" 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <button onClick={handleExportExcel} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2">
            <FileSpreadsheet size={14} /> Styled Excel Export
          </button>
          <button onClick={handlePrint} className="bg-slate-800 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg flex items-center gap-2">
            <Printer size={14} /> Print PDF
          </button>
        </div>
      </div>

      {/* TABLE UI (Remains the same as previous) */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-x-auto print:overflow-visible">
        <div className="p-8 print:p-0 min-w-[1600px] print:min-w-full">
          {/* ... Header and Table HTML from previous version ... */}
          <div className="border-2 border-black p-6 mb-0">
            <h1 className="text-center text-xl font-black uppercase underline decoration-2 underline-offset-4">
              ANNUAL GENDER AND DEVELOPMENT (GAD) PLAN AND BUDGET <br /> FY 2027
            </h1>
            {/* ... Metadata Grid ... */}
          </div>
          <table className="w-full text-[10px] border-collapse border-2 border-black">
             {/* ... Table THead & TBody ... */}
             <thead className="bg-slate-100 uppercase font-black text-center">
                <tr className="divide-x divide-black">
                  <th className="p-2 border-b border-black w-48">GENDER ISSUE / GAD MANDATE (1)</th>
                  <th className="p-2 border-b border-black w-48">CAUSE OF ISSUE / DATA (2)</th>
                  <th className="p-2 border-b border-black w-48">GAD RESULT STATEMENT (3)</th>
                  <th className="p-2 border-b border-black w-48">RELEVANT ORG PROGRAM (4)</th>
                  <th className="p-2 border-b border-black w-52">GAD ACTIVITY (5)</th>
                  <th className="p-2 border-b border-black w-64">INDICATORS & BUDGET (6)</th>
                  <th className="p-2 border-b border-black w-32">GAD BUDGET (7)</th>
                  <th className="p-2 border-b border-black w-24">SOURCE (8)</th>
                  <th className="p-2 border-b border-black w-40">OFFICE (9)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-800 text-white font-black text-xs">
                  <td colSpan="9" className="p-2 border border-black tracking-widest uppercase italic">A. Client-Focused</td>
                </tr>
                {clientFocused.map(ppa => <PPALineItem key={ppa.id} ppa={ppa} parse={parseGenderIssue} />)}
                <tr className="bg-slate-800 text-white font-black text-xs">
                  <td colSpan="9" className="p-2 border border-black tracking-widest uppercase italic">B. Agency-Focused</td>
                </tr>
                {agencyFocused.map(ppa => <PPALineItem key={ppa.id} ppa={ppa} parse={parseGenderIssue} />)}
              </tbody>
          </table>
          {/* ... Signature Section ... */}
        </div>
      </div>
    </div>
  );
}

function PPALineItem({ ppa, parse }) {
  const s = parse(ppa.gender_issue);
  return (
    <tr className="align-top border-b border-black print:break-inside-avoid divide-x divide-black">
      <td className="p-3 font-bold">{s.issue}</td>
      <td className="p-3">
        <p className="mb-2">{s.data}</p>
        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">Source: {s.source}</p>
      </td>
      <td className="p-3 italic">"{ppa.gad_objective}"</td>
      <td className="p-3 text-slate-500">{ppa.relevant_program}</td>
      <td className="p-3 font-black uppercase text-indigo-800">{ppa.gad_activity}</td>
      <td className="p-3">
        <div className="space-y-4">
          <div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Target</p>
            {ppa.ppa_indicators?.map((ind, i) => (<p key={i} className="leading-tight mb-1">• {ind.target_text} {ind.indicator_text}</p>))}
          </div>
          <div className="pt-2 border-t border-slate-200">
            {ppa.ppa_budget_items?.map((item, i) => (
              <div key={i} className="flex justify-between text-[8px] italic mb-0.5">
                <span>{item.item_description}</span>
                <span className="font-mono font-bold">₱{parseFloat(item.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </td>
      <td className="p-3 font-mono font-black text-right">
        ₱{(ppa.total_mooe + ppa.total_ps + ppa.total_co).toLocaleString()}
      </td>
      <td className="p-3 text-center font-bold">{ppa.ppa_budget_items?.[0]?.fund_type || 'MOOE'}</td>
      <td className="p-3 text-center uppercase font-bold text-[9px]">{ppa.office_name}</td>
    </tr>
  );
}