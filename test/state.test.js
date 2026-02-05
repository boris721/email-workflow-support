import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { WorkflowState, WorkflowStatus } from '../src/state.js';

const TEST_DIR = path.join(process.cwd(), 'test-data');

describe('WorkflowState', () => {
  let state;

  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    state = new WorkflowState({ paths: { dataDir: TEST_DIR } });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should start IDLE', () => {
    expect(state.getCurrentStatus()).toBe(WorkflowStatus.IDLE);
  });

  it('should transition to PENDING when pending emails saved', () => {
    state.savePending([{ uid: 1 }]);
    expect(state.getCurrentStatus()).toBe(WorkflowStatus.PENDING);
    expect(state.loadPending()).toHaveLength(1);
  });

  it('should transition to DRAFTED when drafts saved', () => {
    state.saveDrafts([{ uid: 1 }]);
    expect(state.getCurrentStatus()).toBe(WorkflowStatus.DRAFTED);
  });

  it('should transition to AWAITING when posted', () => {
    state.saveDrafts([{ uid: 1 }]);
    state.markPosted();
    expect(state.getCurrentStatus()).toBe(WorkflowStatus.AWAITING);
  });

  it('should clear drafts', () => {
    state.saveDrafts([{ uid: 1 }]);
    state.clearDrafts();
    expect(state.getCurrentStatus()).toBe(WorkflowStatus.IDLE);
  });
});
