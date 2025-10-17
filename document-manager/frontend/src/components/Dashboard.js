import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DocumentUpload from './DocumentUpload'; // Import the new component
import DocumentList from './DocumentList';     // Import the new component
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api/documents';
const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || 'http://localhost:5005/api/auth';

const Dashboard = ({ user, setUser }) => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeType, setMergeType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // User management states
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Office User' });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [mergedFileName, setMergedFileName] = useState('');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  const getDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(response.data);
    } catch (error) {
      setMessage('Error fetching documents.');
    }
  };

  useEffect(() => {
    getDocuments();
    if (user.role === 'Admin') {
      getUsers();
    }
  }, [user.role]);

  useEffect(() => {
    let filtered = documents.filter(doc => {
      const searchTermMatch = searchTerm.toLowerCase() 
        ? doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      const sessionMatch = filterSession ? doc.session === filterSession : true;
      const semesterMatch = filterSemester ? String(doc.semester) === filterSemester : true;
      return searchTermMatch && sessionMatch && semesterMatch;
    });
    setFilteredDocuments(filtered);
  }, [searchTerm, filterSession, filterSemester, documents]);

  const getUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${AUTH_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${AUTH_API_URL}/users`, newUser, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage('User created successfully!');
      setNewUser({ username: '', password: '', role: 'Office User' });
      setShowUserModal(false);
      getUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error creating user.');
    }
  };

  const handleChangePassword = (userId) => {
    setSelectedUserId(userId);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${AUTH_API_URL}/users/${selectedUserId}/password`, 
        { newPassword }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Password updated successfully!');
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUserId(null);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error updating password.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${AUTH_API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage('User deleted successfully!');
        getUsers();
      } catch (error) {
        setMessage(error.response?.data?.message || 'Error deleting user.');
      }
    }
  };


  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const handleMergeExcel = () => {
    setMergeType('excel');
    setShowMergeModal(true);
  };

  const handleMergePdf = () => {
    setMergeType('pdf');
    setShowMergeModal(true);
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      getDocuments();
      setMessage('Document deleted successfully');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error deleting document.');
    }
  };

  const handleDownload = async (docId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'];
      let fileExtension = '';
      if (contentType.includes('spreadsheetml')) fileExtension = '.xlsx';
      else if (contentType.includes('pdf')) fileExtension = '.pdf';
      else if (contentType.includes('wordprocessingml')) fileExtension = '.docx';
      let fileName = `document${fileExtension}`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch && fileNameMatch[1]) {
          let originalName = fileNameMatch[1].replace(/['"]/g, '');
          if (!originalName.includes('.')) fileName = originalName + fileExtension;
          else fileName = originalName;
        }
      }
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.parentNode.removeChild(link);
      }, 100);
    } catch (error) {
      setMessage('Error downloading document.');
    }
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const filterDocumentsByType = (type) => {
    // For admin users, we need to flatten the grouped documents
    let allDocuments = documents;
    if (user.role === 'Admin') {
      // Flatten the grouped documents into a single array
      allDocuments = Object.values(groupDocumentsByUser(documents)).flat();
    }
    
    console.log('All documents before filtering:', allDocuments);
    console.log('Looking for type:', type);
    
    const filteredDocs = allDocuments.filter(doc => {
      const hasFilePath = doc.file_path;
      const fileExtension = doc.file_path ? doc.file_path.split('.').pop().toLowerCase() : '';
      
      // Handle different type formats
      let matchesType = false;
      if (type.toLowerCase() === 'excel') {
        matchesType = fileExtension === 'xlsx' || fileExtension === 'xls';
      } else if (type.toLowerCase() === 'pdf') {
        matchesType = fileExtension === 'pdf';
      } else {
        matchesType = fileExtension === type.toLowerCase();
      }
      
      console.log(`Document ${doc.title}:`, {
        file_path: doc.file_path,
        hasFilePath,
        fileExtension,
        matchesType,
        type: type.toLowerCase()
      });
      
      return hasFilePath && matchesType;
    });
    
    console.log(`Filtering ${type} files:`, {
      totalDocs: allDocuments.length,
      filteredDocs: filteredDocs.length,
      documents: filteredDocs
    });
    
    return filteredDocs;
  };

  const groupDocumentsByUser = (docs) => {
    return docs.reduce((groups, doc) => {
      const displayName = doc.display_name || doc.username || 'Unknown User';
      if (!groups[displayName]) {
        groups[displayName] = [];
      }
      groups[displayName].push(doc);
      return groups;
    }, {});
  };

  const handleMergeSubmit = async () => {
    if (selectedDocs.length < 2) {
      setMessage('Please select at least 2 files to merge.');
      return;
    }
    if (!mergedFileName) {
      setMessage('Please enter a name for the merged file.');
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/merge/${mergeType}`,
        { documentIds: selectedDocs, mergedFileName },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data.id) {
        handleDownload(response.data.id);
      }
      setMessage(`Successfully merged ${selectedDocs.length} ${mergeType.toUpperCase()} files!`);
      setShowMergeModal(false);
      setSelectedDocs([]);
      setMergedFileName('');
      getDocuments();
    } catch (error) {
      setMessage(error.response?.data?.message || `Error merging ${mergeType} files.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-bg">
      <header className="dashboard-header">
        <div className="header-title">
          <h1>Document Management System</h1>
          <p>{user.role} Dashboard</p>
        </div>
        <div className="header-actions">
          <button onClick={handleMergeExcel} className="header-action-btn">Merge Excel</button>
          <button onClick={handleMergePdf} className="header-action-btn">Merge PDF</button>
          {user.role === 'Admin' && (
            <>
              <button onClick={() => setShowUserModal(true)} className="add-user-btn">+ Add User</button>
              <button onClick={() => setShowUserList(!showUserList)} className="header-action-btn">
                {showUserList ? 'Hide Users' : 'Show Users'}
              </button>
            </>
          )}
          <div className="user-info">
            <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
            <span>Welcome, {user.username} ({user.role})</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>
      <main className="dashboard-main">
        <div className="dashboard-sidebar">
          <section className="dashboard-card upload-card">
            <DocumentUpload onUpload={getDocuments} />
            {message && <div className={`dashboard-alert ${message.toLowerCase().includes('error') ? 'dashboard-alert-error' : 'dashboard-alert-success'}`}>{message}</div>}
          </section>
        </div>

        <div className="dashboard-content">
          <section className="dashboard-card">
            <div className="filter-controls">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)}>
                <option value="">All Sessions</option>
                {[...new Set(documents.map(d => d.session))].map(s => s && <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}>
                <option value="">All Semesters</option>
                {[...new Set(documents.map(d => d.semester))].map(s => s && <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </section>

          <DocumentList documents={filteredDocuments} user={user} groupDocumentsByUser={groupDocumentsByUser} handleDownload={handleDownload} handleDelete={handleDelete} />
          
      {/* User List Modal */}
      {showUserList && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal user-list-modal">
            <div className="dashboard-modal-header">
              <h3>Manage Users</h3>
              <button onClick={() => setShowUserList(false)} className="dashboard-modal-close">&times;</button>
            </div>
            <div className="dashboard-modal-body">
              {users.map(userItem => (
                <div key={userItem.id} className="user-card">
                  <div className="user-card-avatar" style={{backgroundColor: userItem.role === 'Admin' ? '#4A90E2' : '#27AE60'}}>
                    {userItem.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-card-info">
                    <p className="user-card-name">{userItem.username}</p>
                    <p className="user-card-role-desc">{userItem.role}</p>
                  </div>
                  <div className="user-card-actions">
                    <span className={`user-role-tag ${userItem.role.toLowerCase().replace(' ', '-')}`}>{userItem.role}</span>
                    <button onClick={() => handleChangePassword(userItem.id)} className="user-edit-btn">Edit</button>
                    {user.id !== userItem.id && (
                      <button onClick={() => handleDeleteUser(userItem.id)} className="user-delete-btn">Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="dashboard-modal-footer">
              <button onClick={() => setShowUserList(false)} className="close-btn">Close</button>
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
      
      {/* Add User Modal */}
      {showUserModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal add-user-modal">
            <div className="dashboard-modal-header">
              <h3>Add New User</h3>
              <button onClick={() => setShowUserModal(false)} className="dashboard-modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateUser} className="dashboard-modal-body">
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter password"
                  required
                />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="Office User">Office User</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              {message && <p className="modal-message">{message}</p>}
              <div className="dashboard-modal-footer">
                <button type="submit" className="btn-create-user">Create User</button>
                <button type="button" onClick={() => setShowUserModal(false)} className="btn-cancel">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal change-password-modal">
            <div className="dashboard-modal-header">
              <h3>Change Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="dashboard-modal-close">&times;</button>
            </div>
            <form onSubmit={handleUpdatePassword} className="dashboard-modal-body">
              <div className="form-group">
                <label>New Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
              {message && <p className="modal-message">{message}</p>}
              <div className="dashboard-modal-footer">
                <button type="submit" className="btn-update-password">Update Password</button>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="btn-cancel">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showMergeModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal merge-modal">
            <div className="dashboard-modal-header">
              <h3>Merge Files</h3>
              <button onClick={() => { setShowMergeModal(false); setSelectedDocs([]); setMergedFileName(''); }} className="dashboard-modal-close">&times;</button>
            </div>
            <div className="dashboard-modal-body">
              <label className="merge-label">Select files to merge:</label>
              <div className="merge-file-list">
                {filterDocumentsByType(mergeType).map((doc) => (
                  <label key={doc.id} className="merge-file-item">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => toggleDocSelection(doc.id)}
                    />
                    <div className="merge-file-info">
                      <p className="merge-file-title">{doc.title}</p>
                      <p className="merge-file-meta">
                        {doc.file_path.split('.').pop().toUpperCase()} • {doc.session} • Semester {doc.semester}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <label className="merge-label">Merged File Name</label>
              <input
                type="text"
                value={mergedFileName}
                onChange={(e) => setMergedFileName(e.target.value)}
                placeholder="Enter name for merged file"
                className="merge-filename-input"
              />
            </div>
            <div className="dashboard-modal-footer">
              <button onClick={handleMergeSubmit} className="btn-merge" disabled={selectedDocs.length < 2 || !mergedFileName || isLoading}>
                {isLoading ? 'Merging...' : 'Merge Files'}
              </button>
              <button onClick={() => { setShowMergeModal(false); setSelectedDocs([]); setMergedFileName(''); }} className="btn-cancel" disabled={isLoading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

