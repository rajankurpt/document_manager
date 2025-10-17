import React, { useState } from 'react';
import axios from 'axios';

const DocumentUpload = ({ onUpload }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [session, setSession] = useState('');
  const [semester, setSemester] = useState('');
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const generateSessions = () => {
    const sessions = [];
    for (let year = 2001; year <= 2048; year++) {
      sessions.push(`${year}-${year + 2}`);
    }
    return sessions;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title || !session || !semester) {
      setMessage('Please fill in all required fields.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
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
