import fs from 'fs';
import path from 'path';

export const WorkflowStatus = {
  IDLE: 'idle',
  PENDING: 'pending',   // New emails fetched, waiting for classification
  DRAFTED: 'drafted',   // Classified, waiting for notification/review
  AWAITING: 'awaiting', // Posted to Discord, waiting for approval
};

export class WorkflowState {
  constructor(config) {
    this.dataDir = config.paths.dataDir;
    this.pendingFile = path.join(this.dataDir, 'pending-emails.json');
    this.draftsFile = path.join(this.dataDir, 'drafts.json');
    this.postedFile = path.join(this.dataDir, '.drafts-posted');
    
    // Create data dir if not exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getCurrentStatus() {
    if (fs.existsSync(this.postedFile)) return WorkflowStatus.AWAITING;
    if (fs.existsSync(this.draftsFile)) return WorkflowStatus.DRAFTED;
    if (fs.existsSync(this.pendingFile)) return WorkflowStatus.PENDING;
    return WorkflowStatus.IDLE;
  }

  // --- Pending ---
  
  savePending(emails) {
    fs.writeFileSync(this.pendingFile, JSON.stringify(emails, null, 2));
  }

  loadPending() {
    if (!fs.existsSync(this.pendingFile)) return [];
    return JSON.parse(fs.readFileSync(this.pendingFile, 'utf8'));
  }

  clearPending() {
    if (fs.existsSync(this.pendingFile)) fs.unlinkSync(this.pendingFile);
  }

  // --- Drafts ---

  saveDrafts(drafts) {
    fs.writeFileSync(this.draftsFile, JSON.stringify({ drafts }, null, 2));
  }

  loadDrafts() {
    if (!fs.existsSync(this.draftsFile)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(this.draftsFile, 'utf8'));
      return data.drafts || [];
    } catch {
      return [];
    }
  }

  clearDrafts() {
    if (fs.existsSync(this.draftsFile)) fs.unlinkSync(this.draftsFile);
  }

  // --- Posted Marker ---

  markPosted() {
    fs.writeFileSync(this.postedFile, new Date().toISOString());
  }

  clearPosted() {
    if (fs.existsSync(this.postedFile)) fs.unlinkSync(this.postedFile);
  }

  isPosted() {
    return fs.existsSync(this.postedFile);
  }
}
