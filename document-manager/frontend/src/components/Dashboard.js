import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5005/api/documents';

const Dashboard = ({ user, setUser }) => {
  const [documents, setDocuments] = useState([]);
  const [message, setMessage] = useState('');

  const getDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setMessage('Error fetching documents.');
    }
  };

  useEffect(() => {
    getDocuments();
  }, []);

  const handleUpload = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setMessage(response.data.message);
      getDocuments(); // Refresh the list
    } catch (error) {
      console.error('Error uploading document:', error);
      setMessage(error.response?.data?.message || 'Error uploading document.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const handleMergeExcel = async () => {
    setMessage('Merging Excel files...');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/merge/excel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(response.data.message);
      getDocuments(); // Refresh list
    } catch (error) {
      console.error('Error merging Excel files:', error);
      setMessage(error.response?.data?.message || 'Error merging Excel files.');
    }
  };

  const handleMergePdf = async () => {
    setMessage('Merging PDF files...');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/merge/pdf`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(response.data.message);
      getDocuments(); // Refresh list
    } catch (error) {
      console.error('Error merging PDF files:', error);
      setMessage(error.response?.data?.message || 'Error merging PDF files.');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      console.log('Sending delete request to:', `${API_URL}/${docId}`);
      const response = await axios.delete(`${API_URL}/${docId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Delete response:', response);
      
      // Refresh the document list
      await getDocuments();
      setMessage('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      setMessage(error.response?.data?.message || `Error deleting document: ${error.message}`);
    }
  };

  const handleDownload = async (docId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      // Get the content type from the response
      const contentType = response.headers['content-type'];
      
      // Determine the correct file extension based on content type
      let fileExtension = '';
      if (contentType.includes('spreadsheetml')) {
        fileExtension = '.xlsx';
      } else if (contentType.includes('pdf')) {
        fileExtension = '.pdf';
      } else if (contentType.includes('wordprocessingml')) {
        fileExtension = '.docx';
      }

      // Get the filename from content-disposition or use a default name
      let fileName = `document${fileExtension}`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch && fileNameMatch[1]) {
          // Remove any quotes and ensure the correct extension
          let originalName = fileNameMatch[1].replace(/['"]/g, '');
          // If the original name already has an extension, use it, otherwise add our determined extension
          if (!originalName.includes('.')) {
            fileName = originalName + fileExtension;
          } else {
            fileName = originalName;
          }
        }
      }

      // Create a blob URL and trigger the download
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.parentNode.removeChild(link);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error.response || error.message || error);
      const errorMessage = error.response?.data?.message || 'Error downloading document.';
      setMessage(errorMessage);
    }
  };

  return (
    <div>
      <header className="App-header">
        <h1>Document Manager</h1>
        <p>Welcome, {user.username} ({user.role})</p>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <main>
        <div className="upload-section">
          <h2>Upload Document</h2>
          <form onSubmit={handleUpload}>
            <input type="text" name="title" placeholder="Title" required />
            <textarea name="description" placeholder="Description"></textarea>
            <input type="file" name="file" required />
            <button type="submit">Upload</button>
          </form>
          {message && <p className="message">{message}</p>}
        </div>
        <div className="actions-section">
          <h2>Actions</h2>
          <button onClick={handleMergeExcel}>Merge All Excel</button>
          <button onClick={handleMergePdf}>Merge All PDF</button>
        </div>
        <div className="document-list-section">
          <h2>Your Documents</h2>
          <div className="document-list">
            {documents.map((doc) => (
              <div key={doc.id} className="document-item">
                <div className="document-header">
                  <h3>{doc.title}</h3>
                  <div className="document-actions">
                    <button onClick={() => handleDownload(doc.id)}>Download</button>
                    <button 
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p>{doc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

// Add some styles for the document items and delete button
const styles = `
  .document-item {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 15px;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .document-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .document-actions {
    display: flex;
    gap: 10px;
  }
  
  .delete-btn {
    background-color: #ff4444;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .delete-btn:hover {
    background-color: #cc0000;
  }
  
  button {
    padding: 5px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f8f9fa;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  button:hover {
    background: #e9ecef;
  }
`;

// Add the styles to the document head
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);

export default Dashboard;
