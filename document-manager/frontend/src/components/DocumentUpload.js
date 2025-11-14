import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const DocumentUpload = ({ onUpload }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [session, setSession] = useState('');
  const [semester, setSemester] = useState('');
  const [message, setMessage] = useState('');
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [excelData, setExcelData] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    // Check if it's an Excel file
    if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = jsonData[0];
          setColumns(headers);
          setSelectedColumns(headers); // Select all by default
          setExcelData(jsonData);
          setShowColumnSelector(true);
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
        setMessage('Error reading Excel file');
      }
    } else {
      setShowColumnSelector(false);
      setColumns([]);
      setSelectedColumns([]);
      setExcelData(null);
    }
  };

  const generateSessions = () => {
    const sessions = [];
    for (let year = 2001; year <= 2048; year++) {
      sessions.push(`${year}-${year + 2}`);
    }
    return sessions;
  };

  const toggleColumn = (column) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns([...columns]);
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title || !session || !semester) {
      setMessage('Please fill in all required fields.');
      return;
    }

    let fileToUpload = file;

    // If it's an Excel file and columns are selected, filter the data
    if (showColumnSelector && excelData && selectedColumns.length > 0) {
      try {
        const headers = excelData[0];
        const columnIndices = selectedColumns.map(col => headers.indexOf(col)).filter(idx => idx !== -1);
        
        // Filter data to include only selected columns
        const filteredData = excelData.map(row => 
          columnIndices.map(idx => row[idx])
        );
        
        // Create new workbook with filtered data
        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.aoa_to_sheet(filteredData);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
        
        // Convert to blob
        const excelBuffer = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        fileToUpload = new File([blob], file.name, { type: file.type });
      } catch (error) {
        console.error('Error filtering Excel data:', error);
        setMessage('Error processing Excel file');
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('session', session);
    formData.append('semester', semester);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setMessage(res.data.message);
      if (onUpload) {
        onUpload(); // Callback to refresh the document list
      }
      // Clear form
      setTitle('');
      setDescription('');
      setFile(null);
      setSession('');
      setSemester('');
      setColumns([]);
      setSelectedColumns([]);
      setShowColumnSelector(false);
      setExcelData(null);
      e.target.reset();
    } catch (error) {
      setMessage('Error uploading document: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="upload-form">
      <div className="upload-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <h3>Upload Document</h3>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Exam Timetable" required />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes about the document"></textarea>
        </div>
        <div className="form-group">
          <label>Session *</label>
          <select value={session} onChange={(e) => setSession(e.target.value)} required>
            <option value="">Select Session</option>
            {generateSessions().map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Semester *</label>
          <select value={semester} onChange={(e) => setSemester(e.target.value)} required>
            <option value="">Select Semester</option>
            {[1, 2, 3, 4].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>File *</label>
          <input type="file" id="file-upload" onChange={handleFileChange} required />
        </div>
        {showColumnSelector && columns.length > 0 && (
          <div className="form-group column-selector">
            <label>Select Columns to Include</label>
            <div className="column-selector-actions">
              <button type="button" onClick={selectAllColumns} className="column-action-btn">Select All</button>
              <button type="button" onClick={deselectAllColumns} className="column-action-btn">Deselect All</button>
              <span className="selected-count">{selectedColumns.length} of {columns.length} selected</span>
            </div>
            <div className="column-list">
              {columns.map((column, index) => (
                <label key={index} className="column-item">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column)}
                    onChange={() => toggleColumn(column)}
                  />
                  <span>{column}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <button type="submit" className="upload-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload Document
        </button>
      </form>
      {message && <p className="upload-message">{message}</p>}
    </div>
  );
};

export default DocumentUpload;
