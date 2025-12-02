import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DocumentUpload from './DocumentUpload'; // Import the new component
import DocumentList from './DocumentList';     // Import the new component
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api/documents';
const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || 'http://localhost:5005/api/auth';
const ASSIGN_API_URL = process.env.REACT_APP_ASSIGN_API_URL || 'http://localhost:5005/api/assignments';

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

  // Report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportConfig, setReportConfig] = useState({ userId: '', startDate: '', endDate: '' });

  // Assignment / task states
  const [assignments, setAssignments] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', dueAt: '' });
  const [selectedAssignmentUserIds, setSelectedAssignmentUserIds] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentUsers, setAssignmentUsers] = useState([]);
  const [showAssignmentDetailModal, setShowAssignmentDetailModal] = useState(false);
  const [showAssignmentSubmitModal, setShowAssignmentSubmitModal] = useState(false);
  const [activeAssignmentForUpload, setActiveAssignmentForUpload] = useState(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

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
      getAssignments();
    } else {
      getMyAssignments();
    }
  }, [user.role]);

  useEffect(() => {
    let filtered = documents.filter(doc => {
      const searchTermMatch = searchTerm.toLowerCase() 
        ? doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      const sessionMatch = filterSession ? doc.session === filterSession : true;
      const semesterMatch = filterSemester ? String(doc.semester) === filterSemester : true;
      const userMatch = filterUser ? String(doc.user_id) === filterUser : true;
      return searchTermMatch && sessionMatch && semesterMatch && userMatch;
    });
    setFilteredDocuments(filtered);
  }, [searchTerm, filterSession, filterSemester, filterUser, documents]);

  const getUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${AUTH_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Users data from API:', response.data);
      console.table(response.data.map(u => ({ 
        id: u.id, 
        username: u.username, 
        role: u.role, 
        is_blocked: u.is_blocked,
        is_blocked_type: typeof u.is_blocked 
      })));
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(ASSIGN_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const getMyAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${ASSIGN_API_URL}/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyAssignments(response.data);
    } catch (error) {
      console.error('Error fetching my assignments:', error);
    }
  };

  const toggleAssignmentUser = (userId) => {
    setSelectedAssignmentUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!newAssignment.title || selectedAssignmentUserIds.length === 0) {
      setMessage('Please provide a title and select at least one user.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const dueAtPayload = newAssignment.dueAt
        ? new Date(newAssignment.dueAt).toISOString().slice(0, 19).replace('T', ' ')
        : null;

      await axios.post(ASSIGN_API_URL, {
        title: newAssignment.title,
        description: newAssignment.description,
        dueAt: dueAtPayload,
        userIds: selectedAssignmentUserIds,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage('Assignment created successfully.');
      setNewAssignment({ title: '', description: '', dueAt: '' });
      setSelectedAssignmentUserIds([]);
      setShowAssignmentModal(false);
      getAssignments();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error creating assignment.');
    }
  };

  const openAssignmentDetail = async (assignment) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${ASSIGN_API_URL}/${assignment.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedAssignment(response.data.assignment);
      setAssignmentUsers(response.data.users || []);
      setShowAssignmentDetailModal(true);
    } catch (error) {
      console.error('Error fetching assignment detail:', error);
    }
  };

  const openAssignmentSubmit = (assignment) => {
    setActiveAssignmentForUpload(assignment);
    setShowAssignmentSubmitModal(true);
  };

  const handleAssignmentUploadComplete = () => {
    setShowAssignmentSubmitModal(false);
    setActiveAssignmentForUpload(null);
    getDocuments();
    getMyAssignments();
    setMessage('Assignment document submitted successfully.');
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

  const handleBlockUser = async (userId) => {
    if (window.confirm('Are you sure you want to block this user?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`${AUTH_API_URL}/users/${userId}/block`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage('User blocked successfully!');
        getUsers();
      } catch (error) {
        setMessage(error.response?.data?.message || 'Error blocking user.');
      }
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${AUTH_API_URL}/users/${userId}/unblock`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Unblock response:', response.data);
      setMessage('User unblocked successfully!');
      await getUsers(); // Wait for users to be fetched
      console.log('Users refreshed after unblock');
    } catch (error) {
      console.error('Error unblocking user:', error);
      setMessage(error.response?.data?.message || 'Error unblocking user.');
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

  const handleDownloadReport = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('Requesting report with config:', reportConfig);
      console.log('API URL:', `${API_URL}/report`);
      
      const response = await axios.post(
        `${API_URL}/report`,
        reportConfig,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          responseType: 'blob',
        }
      );
      
      console.log('Report response received:', response);
      console.log('Response data type:', response.data.type);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Check if response is an error (JSON) instead of a blob
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        setMessage(errorData.message || 'Error downloading report.');
        setIsLoading(false);
        return;
      }
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      console.log('Blob created, size:', blob.size);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `document_report_${Date.now()}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      
      console.log('Triggering download for:', filename);
      link.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 100);
      
      setShowReportModal(false);
      setReportConfig({ userId: '', startDate: '', endDate: '' });
      setMessage('Report downloaded successfully.');
    } catch (error) {
      console.error('Error downloading report - Full error:', error);
      console.error('Error response:', error.response);
      
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        
        // Try to parse error message from blob
        if (error.response.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorData = JSON.parse(reader.result);
              console.error('Parsed error:', errorData);
              setMessage(errorData.message || 'Error downloading report.');
            } catch (e) {
              console.error('Could not parse error as JSON:', e);
              setMessage('Error downloading report. Please check console for details.');
            }
          };
          reader.readAsText(error.response.data);
        } else {
          setMessage(error.response.data?.message || 'Error downloading report.');
        }
      } else {
        setMessage(error.message || 'Network error. Please check if the server is running.');
      }
    } finally {
      setIsLoading(false);
    }
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
          {user.role === 'Admin' && (
            <button onClick={() => setShowUserModal(true)} className="add-user-btn">+ Add User</button>
          )}
          <button onClick={handleMergeExcel} className="header-action-btn">Merge Excel</button>
          <button onClick={handleMergePdf} className="header-action-btn">Merge PDF</button>
          {user.role === 'Admin' && (
            <>
              <button onClick={() => setShowUserList(!showUserList)} className="header-action-btn">
                {showUserList ? 'Hide Users' : 'Show Users'}
              </button>
              <button onClick={() => setShowReportModal(true)} className="header-action-btn">Get Report</button>
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
              {user.role === 'Admin' && (
                <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
                  <option value="">All Users</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              )}
            </div>
          </section>
          {user.role === 'Admin' && (
            <section className="dashboard-card assignments-card">
              <div className="assignments-header">
                <h2>Tasks / Requests</h2>
                <button
                  type="button"
                  className="header-action-btn"
                  onClick={() => setShowAssignmentModal(true)}
                >
                  New Task
                </button>
              </div>
              {assignments.length === 0 ? (
                <p>No tasks created yet.</p>
              ) : (
                <div className="assignment-list">
                  {assignments.map(a => (
                    <div key={a.id} className="assignment-row">
                      <div className="assignment-main">
                        <div className="assignment-title">{a.title}</div>
                        {a.description && (
                          <div className="assignment-description">
                            {a.description}
                          </div>
                        )}
                        <div className="assignment-meta">
                          <span>
                            Due: {a.due_at ? formatDateTime(a.due_at) : 'No deadline'}
                          </span>
                          <span>Created at: {formatDateTime(a.created_at)}</span>
                        </div>
                      </div>
                      <div className="assignment-actions">
                        <div className="assignment-counts">
                          <span>Assigned: {a.assigned_count || 0}</span>
                          <span>Submitted: {a.submitted_count || 0}</span>
                          <span>Late: {a.late_count || 0}</span>
                        </div>
                        <button
                          type="button"
                          className="assignment-view-btn"
                          onClick={() => openAssignmentDetail(a)}
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {user.role !== 'Admin' && (
            <section className="dashboard-card my-assignments-card">
              <div className="assignments-header">
                <h2>My Tasks</h2>
              </div>
              {myAssignments.length === 0 ? (
                <p>No tasks assigned to you.</p>
              ) : (
                <div className="assignment-list">
                  {myAssignments.map(a => (
                    <div key={a.id} className="assignment-row">
                      <div className="assignment-main">
                        <div className="assignment-title">{a.title}</div>
                        {a.description && (
                          <div className="assignment-description">
                            {a.description}
                          </div>
                        )}
                        <div className="assignment-meta">
                          <span>
                            Due: {a.due_at ? formatDateTime(a.due_at) : 'No deadline'}
                          </span>
                          {a.submitted_at && (
                            <span>Submitted: {formatDateTime(a.submitted_at)}</span>
                          )}
                        </div>
                      </div>
                      <div className="assignment-actions">
                        <span
                          className={
                            'assignment-status-pill ' +
                            (a.status === 'submitted'
                              ? 'assignment-status-submitted'
                              : a.status === 'late'
                              ? 'assignment-status-late'
                              : 'assignment-status-pending')
                          }
                        >
                          {a.status || 'pending'}
                        </span>
                        <button
                          type="button"
                          className="assignment-submit-btn"
                          onClick={() => openAssignmentSubmit(a)}
                        >
                          {a.status === 'pending' ? 'Submit' : 'Submit more'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

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
              {users.map(userItem => {
                console.log('User item:', userItem.username, 'is_blocked:', userItem.is_blocked, 'type:', typeof userItem.is_blocked);
                const isBlocked = userItem.is_blocked === 1 || userItem.is_blocked === true;
                console.log('isBlocked calculated:', isBlocked);
                
                return (
                  <div key={userItem.id} className="user-card">
                    <div className="user-card-avatar" style={{backgroundColor: userItem.role === 'Admin' ? '#4A90E2' : '#27AE60'}}>
                      {userItem.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-card-info">
                      <p className="user-card-name">
                        {userItem.username}
                        {isBlocked && <span className="blocked-badge">Blocked</span>}
                      </p>
                      <p className="user-card-role-desc">{userItem.role}</p>
                    </div>
                    <div className="user-card-actions">
                      <span className={`user-role-tag ${userItem.role.toLowerCase().replace(' ', '-')}`}>{userItem.role}</span>
                      <button onClick={() => handleChangePassword(userItem.id)} className="user-edit-btn">Edit</button>
                      {user.id !== userItem.id && (
                        <>
                          {isBlocked ? (
                            <button onClick={() => handleUnblockUser(userItem.id)} className="user-unblock-btn">Unblock</button>
                          ) : (
                            <button onClick={() => handleBlockUser(userItem.id)} className="user-block-btn">Block</button>
                          )}
                          <button onClick={() => handleDeleteUser(userItem.id)} className="user-delete-btn">Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
      
      {/* Report Modal */}
      {showReportModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal report-modal">
            <div className="dashboard-modal-header">
              <h3>Generate Report</h3>
              <button onClick={() => setShowReportModal(false)} className="dashboard-modal-close">&times;</button>
            </div>
            <div className="dashboard-modal-body">
              <div className="form-group">
                <label>Select User</label>
                <select
                  value={reportConfig.userId}
                  onChange={(e) => setReportConfig({ ...reportConfig, userId: e.target.value })}
                >
                  <option value="">All Users</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={reportConfig.startDate}
                  onChange={(e) => setReportConfig({ ...reportConfig, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={reportConfig.endDate}
                  onChange={(e) => setReportConfig({ ...reportConfig, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="dashboard-modal-footer">
              <button onClick={handleDownloadReport} className="btn-merge" disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Download Report'}
              </button>
              <button onClick={() => setShowReportModal(false)} className="btn-cancel" disabled={isLoading}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {user.role === 'Admin' && showAssignmentModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal assignment-modal">
            <div className="dashboard-modal-header">
              <h3>Create Task / Request</h3>
              <button onClick={() => setShowAssignmentModal(false)} className="dashboard-modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateAssignmentSubmit} className="dashboard-modal-body">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Due Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={newAssignment.dueAt}
                  onChange={(e) => setNewAssignment({ ...newAssignment, dueAt: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Select Users</label>
                <div className="assignment-user-groups">
                  <div className="assignment-user-group">
                    <div className="assignment-user-group-title">Faculty</div>
                    <div className="assignment-user-list">
                      {users
                        .filter(u => u.role === 'Faculty')
                        .map(u => (
                          <label key={u.id} className="assignment-user-item">
                            <input
                              type="checkbox"
                              checked={selectedAssignmentUserIds.includes(u.id)}
                              onChange={() => toggleAssignmentUser(u.id)}
                            />
                            <span>{u.username}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                  <div className="assignment-user-group">
                    <div className="assignment-user-group-title">Office</div>
                    <div className="assignment-user-list">
                      {users
                        .filter(u => u.role === 'Office User')
                        .map(u => (
                          <label key={u.id} className="assignment-user-item">
                            <input
                              type="checkbox"
                              checked={selectedAssignmentUserIds.includes(u.id)}
                              onChange={() => toggleAssignmentUser(u.id)}
                            />
                            <span>{u.username}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="dashboard-modal-footer">
                <button type="submit" className="btn-create-user">Create Task</button>
                <button type="button" onClick={() => setShowAssignmentModal(false)} className="btn-cancel">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {user.role === 'Admin' && showAssignmentDetailModal && selectedAssignment && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal assignment-detail-modal">
            <div className="dashboard-modal-header">
              <h3>Task Details</h3>
              <button onClick={() => setShowAssignmentDetailModal(false)} className="dashboard-modal-close">&times;</button>
            </div>
            <div className="dashboard-modal-body">
              <h4 className="assignment-title">{selectedAssignment.title}</h4>
              {selectedAssignment.description && (
                <p className="assignment-description">{selectedAssignment.description}</p>
              )}
              <div className="assignment-meta">
                <span>
                  Due: {selectedAssignment.due_at ? formatDateTime(selectedAssignment.due_at) : 'No deadline'}
                </span>
                <span>Created at: {formatDateTime(selectedAssignment.created_at)}</span>
              </div>
              <div className="assignment-user-table">
                {assignmentUsers.length === 0 ? (
                  <p>No users assigned.</p>
                ) : (
                  assignmentUsers.map(u => (
                    <div key={u.id} className="assignment-user-row">
                      <div className="assignment-user-main">
                        <span className="assignment-user-name">{u.username}</span>
                        <span className="assignment-user-role">{u.role}</span>
                      </div>
                      <div className="assignment-user-meta">
                        <span
                          className={
                            'assignment-status-pill ' +
                            (u.status === 'submitted'
                              ? 'assignment-status-submitted'
                              : u.status === 'late'
                              ? 'assignment-status-late'
                              : 'assignment-status-pending')
                          }
                        >
                          {u.status || 'pending'}
                        </span>
                        {u.submitted_at && (
                          <span className="assignment-user-submitted">Submitted: {formatDateTime(u.submitted_at)}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="dashboard-modal-footer">
              <button type="button" onClick={() => setShowAssignmentDetailModal(false)} className="btn-cancel">Close</button>
            </div>
          </div>
        </div>
      )}

      {showAssignmentSubmitModal && activeAssignmentForUpload && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal assignment-submit-modal">
            <div className="dashboard-modal-header">
              <h3>Submit Documents for Task</h3>
              <button onClick={() => setShowAssignmentSubmitModal(false)} className="dashboard-modal-close">&times;</button>
            </div>
            <div className="dashboard-modal-body">
              <h4 className="assignment-title">{activeAssignmentForUpload.title}</h4>
              {activeAssignmentForUpload.description && (
                <p className="assignment-description">{activeAssignmentForUpload.description}</p>
              )}
              <div className="assignment-meta">
                <span>
                  Due: {activeAssignmentForUpload.due_at ? formatDateTime(activeAssignmentForUpload.due_at) : 'No deadline'}
                </span>
              </div>
              <div className="assignment-upload-wrapper">
                <DocumentUpload
                  onUpload={handleAssignmentUploadComplete}
                  assignmentId={activeAssignmentForUpload.id}
                />
              </div>
            </div>
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

