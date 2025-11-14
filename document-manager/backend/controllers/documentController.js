const path = require('path');
const fs = require('fs');
const Doc = require('../models/Document');
const { mergeExcelFiles, mergePdfFiles } = require('../services/mergeService');

exports.upload = async (req, res) => {
  const { title, description, session, semester } = req.body;
  const filePath = req.file.path;
  const userId = req.user.id; // From authMiddleware

  if (!title || !filePath) {
    return res.status(400).json({ message: 'Title and file are required.' });
  }

  try {
    const doc = await Doc.create({ title, description, filePath, userId, session, semester });
    res.status(201).json({ message: 'Document uploaded successfully.', document: doc });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.list = async (req, res) => {
  try {
    const docs = await Doc.findAll(req.user);
    res.json(docs);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.download = async (req, res) => {
  try {
    console.log('Download request for document ID:', req.params.id);
    const doc = await Doc.findById(req.params.id, req.user);
    if (!doc) {
      console.log('Document not found or not authorized');
      return res.status(404).json({ message: 'Document not found or not authorized.' });
    }
    
    console.log('Found document in DB:', {
      id: doc.id,
      title: doc.title,
      file_path: doc.file_path,
      full_path: path.join(process.cwd(), doc.file_path)
    });
    
    const filePath = path.join(process.cwd(), doc.file_path);
    console.log('Checking if file exists at:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      console.log('Current working directory:', process.cwd());
      console.log('Directory contents:', fs.readdirSync(path.dirname(filePath)));
      return res.status(404).json({ 
        message: 'File not found on server.',
        details: {
          expectedPath: filePath,
          cwd: process.cwd(),
          relativePath: doc.file_path,
          dirExists: fs.existsSync(path.dirname(filePath)),
          directoryContents: fs.existsSync(path.dirname(filePath)) ? fs.readdirSync(path.dirname(filePath)) : []
        }
      });
    }

    const fileName = path.basename(filePath);
    
    // Set the correct content type based on file extension
    if (fileName.endsWith('.xlsx')) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else if (fileName.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (fileName.endsWith('.docx')) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file' });
      }
    });
    
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.mergeExcel = async (req, res) => {
  try {
    const { documentIds } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
      return res.status(400).json({ message: 'Please select at least 2 Excel files to merge' });
    }

    // Get file paths for selected documents
    const selectedDocs = await Promise.all(
      documentIds.map(id => Doc.findById(id, req.user))
    );

    const validDocs = selectedDocs.filter(doc => 
      doc && doc.file_path && 
      (doc.file_path.toLowerCase().endsWith('.xlsx') || doc.file_path.toLowerCase().endsWith('.xls'))
    );

    if (validDocs.length < 2) {
      return res.status(400).json({ message: 'Please select at least 2 valid Excel files to merge' });
    }

    const filePaths = validDocs.map(doc => doc.file_path);
    const existingPaths = filePaths.filter(p => fs.existsSync(p));
    
    if (existingPaths.length < 2) {
      return res.status(400).json({ message: 'Some selected files are not found on server' });
    }

    const outPath = mergeExcelFiles(existingPaths, path.join(process.cwd(), 'uploads'));
    const mergedId = await Doc.insertMergedExcel(outPath, req.user.id);

    res.json({ message: 'Excel files merged successfully', mergedFile: outPath, id: mergedId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Merge failed' });
  }
};

exports.mergePdf = async (req, res) => {
  try {
    const { documentIds } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length < 2) {
      return res.status(400).json({ message: 'Please select at least 2 PDF files to merge' });
    }

    // Get file paths for selected documents
    const selectedDocs = await Promise.all(
      documentIds.map(id => Doc.findById(id, req.user))
    );

    const validDocs = selectedDocs.filter(doc => 
      doc && doc.file_path && doc.file_path.toLowerCase().endsWith('.pdf')
    );

    if (validDocs.length < 2) {
      return res.status(400).json({ message: 'Please select at least 2 valid PDF files to merge' });
    }

    const filePaths = validDocs.map(doc => doc.file_path);
    const existingPaths = filePaths.filter(p => fs.existsSync(p));
    
    if (existingPaths.length < 2) {
      return res.status(400).json({ message: 'Some selected files are not found on server' });
    }
    
    const outPath = await mergePdfFiles(existingPaths, path.join(process.cwd(), 'uploads'));
    const mergedId = await Doc.insertMergedPdf(outPath, req.user.id);
    
    res.json({ message: 'PDFs merged successfully', mergedFile: outPath, id: mergedId });
  } catch (error) {
    console.error('Error merging PDFs:', error);
    res.status(500).json({ message: error.message || 'Error merging PDF files' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Doc.findById(req.params.id, req.user);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found or not authorized.' });
    }

    const filePath = path.join(process.cwd(), doc.file_path);
    
    // Delete the file from the filesystem
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the record from the database
    await Doc.deleteById(req.params.id, req.user);
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Error deleting document' });
  }
};

exports.generateReport = async (req, res) => {
  try {
    // Only admin can generate reports
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { userId, startDate, endDate } = req.body;

    console.log('Report request received:', { userId, startDate, endDate });

    // Get documents based on filters
    const documents = await Doc.findByFilters({ userId, startDate, endDate });

    console.log('Documents found:', documents.length);

    if (!documents || documents.length === 0) {
      return res.status(404).json({ message: 'No documents found for the selected criteria.' });
    }

    // Generate Excel report
    const XLSX = require('xlsx');
    
    // Prepare data for Excel
    const reportData = documents.map(doc => ({
      'Document ID': doc.id,
      'Title': doc.title,
      'Description': doc.description || 'N/A',
      'Session': doc.session || 'N/A',
      'Semester': doc.semester || 'N/A',
      'Uploaded By': doc.username || 'Unknown',
      'Upload Date': new Date(doc.created_at).toLocaleDateString('en-US'),
      'File Type': path.extname(doc.file_path).toUpperCase().replace('.', '')
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Document ID
      { wch: 30 }, // Title
      { wch: 40 }, // Description
      { wch: 15 }, // Session
      { wch: 15 }, // Semester
      { wch: 20 }, // Uploaded By
      { wch: 15 }, // Upload Date
      { wch: 12 }  // File Type
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Document Report');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    const filename = `document_report_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    console.log('Sending report file:', filename, 'Size:', buffer.length);
    
    res.send(buffer);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report: ' + error.message });
  }
};