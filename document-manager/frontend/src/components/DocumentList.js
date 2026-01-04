import React from 'react';

const DocumentList = ({ documents, user, groupDocumentsByUser, handleDownload, handleDelete, handlePreview, forceUngrouped = false }) => {

  const renderDocMeta = (doc) => (
    <div className="doc-meta">
      <span>Session: {doc.session || '—'}</span>
      <span>Semester: {doc.semester || '—'}</span>
      <span>Type: {doc.file_path.split('.').pop().toUpperCase()}</span>
      <span>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
    </div>
  );

  const renderDocItem = (doc) => (
    <div key={doc.id} className="doc-item">
      <div className="doc-info">
        <p className="doc-title">{doc.title}</p>
        {renderDocMeta(doc)}
      </div>
      <div className="doc-actions">
        {handlePreview && (
          <button onClick={() => handlePreview(doc)} className="view-btn">View</button>
        )}
        <button onClick={() => handleDownload(doc.id)} className="download-btn">Download</button>
        <button onClick={() => handleDelete(doc.id)} className="delete-btn">Delete</button>
      </div>
    </div>
  );

  return (
    <div className="document-list-container">
      {documents.length === 0 ? (
        <div className="empty-list">No documents found.</div>
      ) : user.role === 'Admin' && !forceUngrouped ? (
        Object.entries(groupDocumentsByUser(documents)).map(([displayName, userDocs]) => (
          <div key={displayName} className="user-doc-group">
            <div className="user-group-header">
              <div className="user-avatar">{displayName.charAt(0).toUpperCase()}</div>
              <h3>{displayName}</h3>
              <span className="doc-count">{userDocs.length} documents</span>
            </div>
            <div className="doc-items-wrapper">
              {userDocs.map(renderDocItem)}
            </div>
          </div>
        ))
      ) : (
        <div className="user-doc-group">
          <div className="doc-items-wrapper">
            {documents.map(renderDocItem)}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
