import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { EchonaModal, EchonaButton, EchonaLoader } from '../ui/EchonaUI';
import { QuillMap } from '../icons/QuillMap';

interface BulkImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
  importType: 'questions' | 'participants';
  targetId: string; // roundId for questions, quizId for participants
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, onImportComplete, importType, targetId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (importType === 'participants') {
          await importParticipants(data);
        } else {
          await importQuestions(data);
        }
      } catch (err: any) {
        setError(err.message || 'The manifest could not be read. Please check the format and try again.');
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to decipher the file. It may be corrupted.');
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const importParticipants = async (data: any[]) => {
    const participants = data.map(row => ({
      username: row.username || row.Username || row.ID,
      password: row.password || row.Password,
      name: row.name || row.Name,
      college: row.college || row.College || '',
    }));

    if (participants.some(p => !p.username)) {
      throw new Error("Missing required field: username (Login ID) must be provided for all crew members.");
    }

    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/quizzes/${targetId}/participants/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ participants })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error || 'The server rejected the manifest. Check for duplicate usernames.');
    }
    
    setLoading(false);
    onImportComplete();
  };

  const importQuestions = async (data: any[]) => {
    const questions = data.map(row => {
      const options = [];
      const correctIdx = parseInt(row.correctOption || row.CorrectOption || '1');
      
      if (row.option1 || row.Option1) options.push({ text: row.option1 || row.Option1, isCorrect: correctIdx === 1 });
      if (row.option2 || row.Option2) options.push({ text: row.option2 || row.Option2, isCorrect: correctIdx === 2 });
      if (row.option3 || row.Option3) options.push({ text: row.option3 || row.Option3, isCorrect: correctIdx === 3 });
      if (row.option4 || row.Option4) options.push({ text: row.option4 || row.Option4, isCorrect: correctIdx === 4 });

      return {
        text: row.text || row.Question || row.text,
        type: row.type || row.Type || 'MCQ',
        marks: parseFloat(row.marks || row.Marks || '1'),
        negativeMarks: parseFloat(row.negativeMarks || row.NegativeMarks || '0'),
        explanation: row.explanation || row.Explanation || '',
        options
      };
    });

    if (questions.some(q => !q.text)) {
      throw new Error("Missing required field: Question text is missing for one or more entries.");
    }

    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/quizzes/rounds/${targetId}/questions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ questions })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error || 'The server rejected the questions manifest.');
    }
    
    setLoading(false);
    onImportComplete();
  };

  const handleDownloadSample = () => {
    const fileName = importType === 'participants' ? 'sample_participants.xlsx' : 'sample_questions.xlsx';

    try {
      if (importType === 'participants') {
        const data = [
          { username: 'crew_jack', password: 'voyage2026', name: 'Jack Sparrow', college: 'Black Pearl Academy' },
          { username: 'crew_will', password: 'voyage2026', name: 'Will Turner', college: 'Port Royal Institute' },
          { username: 'crew_elizabeth', password: 'voyage2026', name: 'Elizabeth Swann', college: 'Governor High School' },
          { username: 'crew_hector', password: 'voyage2026', name: 'Hector Barbossa', college: 'Isla de Muerta College' },
          { username: 'crew_tia', password: 'voyage2026', name: 'Tia Dalma', college: 'Mystic Bayou University' }
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 24 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Participants');
        XLSX.writeFile(wb, fileName);
      } else {
        const data = [
          {
            text: 'What navigation instrument is historically used to measure the angle between the horizon and a celestial body?',
            type: 'MCQ',
            marks: 1,
            negativeMarks: 0,
            option1: 'Sextant',
            option2: 'Compass',
            option3: 'Barometer',
            option4: 'Astrolabe',
            correctOption: 1,
            explanation: 'A sextant is an optical instrument used to measure the angle between the horizon and a celestial body.'
          },
          {
            text: 'What does the term "starboard" refer to on a nautical vessel?',
            type: 'MCQ',
            marks: 1,
            negativeMarks: 0,
            option1: 'The left side of the vessel',
            option2: 'The right side of the vessel when facing forward',
            option3: 'The front or bow of the ship',
            option4: 'The stern or rear of the ship',
            correctOption: 2,
            explanation: 'Starboard is the right side of the ship facing forward.'
          },
          {
            text: 'What speed unit equals one nautical mile per hour?',
            type: 'MCQ',
            marks: 2,
            negativeMarks: 0.5,
            option1: 'Knot',
            option2: 'League',
            option3: 'Fathom',
            option4: 'Cable',
            correctOption: 1,
            explanation: 'One knot represents one nautical mile per hour.'
          },
          {
            text: 'Which wind system was historically used by sailing ships to cross the oceans?',
            type: 'MCQ',
            marks: 1,
            negativeMarks: 0,
            option1: 'Trade Winds',
            option2: 'Polar Easterlies',
            option3: 'Doldrums',
            option4: 'Roaring Forties',
            correctOption: 1,
            explanation: 'Trade winds blow steadily toward the equator and were vital for maritime trade routes.'
          },
          {
            text: 'What is the primary navigational purpose of a marine chronometer?',
            type: 'MCQ',
            marks: 2,
            negativeMarks: 0,
            option1: 'To calculate ship latitude',
            option2: 'To determine longitude by celestial navigation',
            option3: 'To measure ship wind speed',
            option4: 'To measure water depth',
            correctOption: 2,
            explanation: 'Marine chronometers maintain Greenwich Mean Time to calculate longitude.'
          }
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 45 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 45 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Questions');
        XLSX.writeFile(wb, fileName);
      }
    } catch {
      const link = document.createElement('a');
      link.href = `/${fileName}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const title = importType === 'participants' ? 'IMPORT CREW MANIFEST' : 'IMPORT QUESTIONS MANIFEST';

  return (
    <EchonaModal isOpen={true} onClose={onClose} title={title}>
      {loading ? (
        <EchonaLoader text="READING MANIFEST..." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[#E7D19A]/40 border border-[#8B5E34]/30 rounded-sm">
            <div>
              <p className="text-[#2B1710] font-bold text-xs uppercase tracking-wider">
                Need the official sample format?
              </p>
              <p className="text-[#8B5E34] text-[11px] font-medium mt-0.5">
                Download the sample Excel (.xlsx) file with pre-filled examples.
              </p>
            </div>
            <EchonaButton
              type="button"
              variant="secondary"
              onClick={handleDownloadSample}
              className="text-xs flex items-center gap-2 whitespace-nowrap !py-2 !px-4"
            >
              <svg className="w-4 h-4 text-[#C7A04A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              DOWNLOAD SAMPLE EXCEL
            </EchonaButton>
          </div>

          {error && (
            <div className="bg-[#741714] border border-[#5A1712] p-4 shadow-inner">
              <h4 className="text-[#F4E7C7] text-[10px] font-bold tracking-[0.2em] uppercase mb-1 flex items-center gap-2">
                <span className="text-xl">⚠</span> MANIFEST COULD NOT BE CHARTED
              </h4>
              <p className="text-[#E7D19A] text-sm">{error}</p>
            </div>
          )}

          <div 
            onClick={() => fileInput.current?.click()}
            className="border-2 border-dashed border-[#8B5E34] hover:border-[#C7A04A] bg-[#E7D19A]/50 hover:bg-[#E7D19A]/80 p-10 text-center transition-colors cursor-pointer group"
          >
            <QuillMap className="w-12 h-12 text-[#8B5E34] mx-auto mb-4 group-hover:text-[#C7A04A] transition-colors" />
            <span className="text-[#2B1710] font-bold uppercase tracking-widest text-xs">
              Click to select manifest file
            </span>
            <input 
              type="file" 
              ref={fileInput} 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
            />
          </div>

          <div className="bg-[#17100C]/10 p-4 border border-[#8B5E34]/20">
            <p className="text-[#8B5E34] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">Required Format Details</p>
            <p className="text-[#2B1710] text-xs font-semibold">
              {importType === 'participants' 
                ? 'Expected Columns: username, password, name, college'
                : 'Expected Columns: text, marks, negativeMarks, option1, option2, option3, option4, correctOption (1-4)'
              }
            </p>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[#8B5E34]/30">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="text-[#8B5E34] hover:text-[#2B1710] text-xs font-bold uppercase tracking-wider underline flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Sample {importType === 'participants' ? 'Crew' : 'Questions'} (.xlsx)
            </button>
            <EchonaButton variant="ghost" onClick={onClose} className="!text-[#8B5E34] hover:!text-[#2B1710]">
              CANCEL
            </EchonaButton>
          </div>
        </div>
      )}
    </EchonaModal>
  );
};
