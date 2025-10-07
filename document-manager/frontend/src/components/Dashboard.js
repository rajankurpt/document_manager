import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api/documents';
const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || 'http://localhost:5005/api/auth';

const Dashboard = ({ user, setUser }) => {
  const [documents, setDocuments] = useState([]);
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
      getDocuments();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error uploading document.');
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
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/merge/${mergeType}`,
        { documentIds: selectedDocs },
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
      getDocuments();
    } catch (error) {
      setMessage(error.response?.data?.message || `Error merging ${mergeType} files.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-bg">
      <nav className="dashboard-navbar">
        <div className="dashboard-navbar-brand">Document Manager</div>
        <div className="dashboard-navbar-user">
          <span>Welcome, <b>{user.username}</b> ({user.role})</span>
          <button className="dashboard-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <main className="dashboard-main">
        <section className="dashboard-card dashboard-upload-card">
          <h2>Upload Document</h2>
          <form onSubmit={handleUpload} className="dashboard-form">
            <input type="text" name="title" placeholder="Title" required className="dashboard-input" />
            <textarea name="description" placeholder="Description" className="dashboard-input" />
            <input type="file" name="file" required className="dashboard-input" />
            <button type="submit" className="dashboard-btn dashboard-btn-primary">Upload</button>
          </form>
          {message && <div className={`dashboard-alert ${message.toLowerCase().includes('error') ? 'dashboard-alert-error' : 'dashboard-alert-success'}`}>{message}</div>}
        </section>
        <section className="dashboard-card dashboard-actions-card">
          <h2>Actions</h2>
          <button onClick={handleMergeExcel} className="dashboard-btn dashboard-btn-sky">Merge Excel Files</button>
          <button onClick={handleMergePdf} className="dashboard-btn dashboard-btn-navy">Merge PDF Files</button>
          {user.role === 'Admin' && (
            <>
              <button onClick={() => setShowUserModal(true)} className="dashboard-btn dashboard-btn-primary">Add User</button>
              <button onClick={() => setShowUserList(!showUserList)} className="dashboard-btn dashboard-btn-secondary">
                {showUserList ? 'Hide Users' : 'Show Users'}
              </button>
            </>
          )}
        </section>
        <section className="dashboard-card dashboard-documents-card">
          <h2>{user.role === 'Admin' ? 'All User Documents' : 'Your Documents'}</h2>
          <div className="dashboard-doc-list">
            {documents.length === 0 && <div className="dashboard-empty">No documents found. Upload your first document!</div>}
            {user.role === 'Admin' ? (
              // Admin view: Group documents by user
              <div className="dashboard-admin-view">
                {Object.entries(groupDocumentsByUser(documents)).map(([displayName, userDocs]) => (
                  <div key={displayName} className="dashboard-user-section">
                    <h3 className={`dashboard-user-title ${displayName === '(You)' ? 'you-section' : ''}`}>
                      📁 {displayName}
                    </h3>
                    <div className="dashboard-user-docs">
                      {userDocs.map((doc) => (
                        <div key={doc.id} className="dashboard-doc-item">
                          <div className="dashboard-doc-header">
                            <div className="dashboard-doc-title">{doc.title}</div>
                            <div className="dashboard-doc-actions">
                              <button onClick={() => handleDownload(doc.id)} className="dashboard-btn dashboard-btn-sky">Download</button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="dashboard-btn dashboard-btn-danger">Delete</button>
                            </div>
                          </div>
                          <div className="dashboard-doc-meta">
                            <span className="dashboard-doc-type">{doc.file_path ? doc.file_path.split('.').pop().toUpperCase() : ''}</span>
                            <span className="dashboard-doc-date">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</span>
                          </div>
                          {doc.description && <div className="dashboard-doc-desc">{doc.description}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Regular user view: Show all documents
              documents.map((doc) => (
                <div key={doc.id} className="dashboard-doc-item">
                  <div className="dashboard-doc-header">
                    <div className="dashboard-doc-title">{doc.title}</div>
                    <div className="dashboard-doc-actions">
                      <button onClick={() => handleDownload(doc.id)} className="dashboard-btn dashboard-btn-sky">Download</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="dashboard-btn dashboard-btn-danger">Delete</button>
                    </div>
                  </div>
                  <div className="dashboard-doc-meta">
                    <span className="dashboard-doc-type">{doc.file_path ? doc.file_path.split('.').pop().toUpperCase() : ''}</span>
                    <span className="dashboard-doc-date">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</span>
                  </div>
                  {doc.description && <div className="dashboard-doc-desc">{doc.description}</div>}
                </div>
              ))
            )}
          </div>
        </section>
        
        {/* User Management Section for Admin */}
        {user.role === 'Admin' && showUserList && (
          <section className="dashboard-card dashboard-users-card">
            <h2>User Management</h2>
            <div className="dashboard-user-list">
              {users.length === 0 ? (
                <div className="dashboard-empty">No users found.</div>
              ) : (
                users.map((userItem) => (
                  <div key={userItem.id} className="dashboard-user-item">
                    <div className="dashboard-user-info">
                      <div className="dashboard-user-name">{userItem.username}</div>
                      <div className="dashboard-user-role">{userItem.role}</div>
                      <div className="dashboard-user-date">
                        Created: {new Date(userItem.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="dashboard-user-actions">
                      <button 
                        onClick={() => handleChangePassword(userItem.id)} 
                        className="dashboard-btn dashboard-btn-sky"
                      >
                        Change Password
                      </button>
                      {userItem.id !== user.id && (
                        <button 
                          onClick={() => handleDeleteUser(userItem.id)} 
                          className="dashboard-btn dashboard-btn-danger"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>
      
      {/* Add User Modal */}
      {showUserModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal">
            <div className="dashboard-modal-header">
              <h3>Add New User</h3>
              <button onClick={() => setShowUserModal(false)} className="dashboard-modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateUser} className="dashboard-modal-body">
              <div className="dashboard-form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required
                  className="dashboard-input"
                />
              </div>
              <div className="dashboard-form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                  className="dashboard-input"
                />
              </div>
              <div className="dashboard-form-group">
                <label>Role:</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="dashboard-input"
                >
                  <option value="Office User">Office User</option>
                  <option value="Faculty">Faculty</option>
                </select>
              </div>
              <div className="dashboard-modal-footer">
                <button type="submit" className="dashboard-btn dashboard-btn-primary">Create User</button>
                <button type="button" onClick={() => setShowUserModal(false)} className="dashboard-btn dashboard-btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal">
            <div className="dashboard-modal-header">
              <h3>Change Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="dashboard-modal-close">&times;</button>
            </div>
            <form onSubmit={handleUpdatePassword} className="dashboard-modal-body">
              <div className="dashboard-form-group">
                <label>New Password:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="dashboard-input"
                  placeholder="Enter new password"
                />
              </div>
              <div className="dashboard-modal-footer">
                <button type="submit" className="dashboard-btn dashboard-btn-primary">Update Password</button>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="dashboard-btn dashboard-btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showMergeModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal">
            <div className="dashboard-modal-header">
              <h3>Merge {mergeType.toUpperCase()} Files</h3>
              <button onClick={() => { setShowMergeModal(false); setSelectedDocs([]); }} className="dashboard-modal-close">&times;</button>
            </div>
                        <div className="dashboard-modal-body">
              <p>Select the files you want to merge (at least 2):</p>
              <div className="dashboard-modal-selection">
                {filterDocumentsByType(mergeType).length === 0 ? (
                  <div className="dashboard-modal-empty">
                    No {mergeType.toUpperCase()} files found. Please upload some {mergeType} files first.
                  </div>
                ) : (
                  filterDocumentsByType(mergeType).map((doc) => (
                    <div key={doc.id} className="dashboard-modal-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedDocs.includes(doc.id)}
                          onChange={() => toggleDocSelection(doc.id)}
                        />
                        <span className="dashboard-modal-filename">{doc.title}.{doc.file_path.split('.').pop()}</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="dashboard-modal-footer">
              <button onClick={handleMergeSubmit} className="dashboard-btn dashboard-btn-primary" disabled={selectedDocs.length < 2 || isLoading}>
                {isLoading ? 'Merging...' : `Merge ${selectedDocs.length} Selected Files`}
              </button>
              <button onClick={() => { setShowMergeModal(false); setSelectedDocs([]); }} className="dashboard-btn dashboard-btn-secondary" disabled={isLoading}>
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

