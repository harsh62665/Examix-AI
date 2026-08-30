/**
 * Neuro-Sync Cognitive Graph & Ebbinghaus Decay Spaced Repetition Engine
 * Examix AI - Dual-Brain Memory Architecture
 */

import { getAccessToken, getOrCreateVaultFolder, VAULT_FOLDER_NAME } from '../lib/firebase';

export interface ConceptNode {
  id: string;
  name: string;
  topic?: string;
  mastery_score: number; // 0 - 100
  retention_strength: number; // 0.0 - 1.0 (Ebbinghaus memory health)
  decay_interval_days: number; // 1, 2, 4, 7, 15, 30
  last_reviewed_timestamp: string; // ISO 8601
  decay_due_date: string; // ISO 8601
  known_traps: string[];
  trap_history?: string[];
  streak_count: number;
  status: 'MASTERED_LOCKED' | 'MASTERED' | 'NEEDS_REVISION' | 'CRITICAL_WEAKNESS';
}

export interface StudentCognitiveGraph {
  student_id: string;
  student_name?: string;
  overall_readiness_score: number; // 0 - 100
  last_synced_timestamp: string;
  concept_nodes: Record<string, ConceptNode>;
}

// Initial Default Concept Graph for Class 12 / JEE / NEET Physics & Chemistry
export const DEFAULT_COGNITIVE_GRAPH: StudentCognitiveGraph = {
  student_id: 'user_01',
  student_name: 'Examix Scholar',
  overall_readiness_score: 78,
  last_synced_timestamp: new Date().toISOString(),
  concept_nodes: {
    physics_coulombs_law_vector: {
      id: 'physics_coulombs_law_vector',
      name: "Coulomb's Law in Vector Form",
      topic: 'Physics - Electrostatics',
      mastery_score: 100,
      retention_strength: 0.95,
      decay_interval_days: 15,
      last_reviewed_timestamp: new Date().toISOString(),
      decay_due_date: new Date(Date.now() + 15 * 86400000).toISOString(),
      known_traps: ['Reversing unit vector direction r12 vs r21'],
      trap_history: [],
      streak_count: 3,
      status: 'MASTERED_LOCKED'
    },
    physics_electric_dipole_2l: {
      id: 'physics_electric_dipole_2l',
      name: 'Electric Dipole Separation (2l)',
      topic: 'Physics - Electrostatics',
      mastery_score: 40,
      retention_strength: 0.35,
      decay_interval_days: 2,
      last_reviewed_timestamp: new Date(Date.now() - 16 * 86400000).toISOString(),
      decay_due_date: new Date(Date.now() - 14 * 86400000).toISOString(), // overdue
      known_traps: ['Dividing given separation 2cm by 2 unnecessarily'],
      trap_history: ['Calculated l = 1cm when 2l = 2cm was given'],
      streak_count: 0,
      status: 'NEEDS_REVISION'
    },
    physics_quantization_charge: {
      id: 'physics_quantization_charge',
      name: 'Quantization of Charge (q = ne)',
      topic: 'Physics - Electrostatics',
      mastery_score: 55,
      retention_strength: 0.45,
      decay_interval_days: 3,
      last_reviewed_timestamp: new Date(Date.now() - 8 * 86400000).toISOString(),
      decay_due_date: new Date(Date.now() - 5 * 86400000).toISOString(), // overdue
      known_traps: ['Forgetting that n must be an integer (e = 1.6 x 10^-19 C)'],
      trap_history: ['Assumed non-integer electron fraction'],
      streak_count: 1,
      status: 'NEEDS_REVISION'
    },
    physics_dielectric_constant: {
      id: 'physics_dielectric_constant',
      name: 'Dielectric Constant (K or ε_r)',
      topic: 'Physics - Electrostatics',
      mastery_score: 70,
      retention_strength: 0.65,
      decay_interval_days: 7,
      last_reviewed_timestamp: new Date(Date.now() - 6 * 86400000).toISOString(),
      decay_due_date: new Date(Date.now() + 1 * 86400000).toISOString(),
      known_traps: ['Forgetting that electrostatic force decreases by factor K: F_m = F_0 / K'],
      trap_history: [],
      streak_count: 2,
      status: 'MASTERED'
    },
    physics_gauss_law_flux: {
      id: 'physics_gauss_law_flux',
      name: "Gauss's Law & Electric Flux (Φ = q_enclosed / ε_0)",
      topic: 'Physics - Electrostatics',
      mastery_score: 95,
      retention_strength: 0.9,
      decay_interval_days: 15,
      last_reviewed_timestamp: new Date().toISOString(),
      decay_due_date: new Date(Date.now() + 15 * 86400000).toISOString(),
      known_traps: ['Including charges located outside the Gaussian surface'],
      trap_history: [],
      streak_count: 3,
      status: 'MASTERED_LOCKED'
    }
  }
};

export const LOCAL_COGNITIVE_KEY = 'student_cognitive_graph.json';
export const DRIVE_COGNITIVE_FILE = 'student_cognitive_graph.json';
export const DRIVE_CHAT_HISTORY_FILE = 'chat_sessions_history.json';
export const DRIVE_ERROR_LOG_FILE = 'error_log_registry.json';

/**
 * Load the Cognitive Graph from Local Storage or fallback to Default
 */
export function loadLocalCognitiveGraph(): StudentCognitiveGraph {
  try {
    const raw = localStorage.getItem(LOCAL_COGNITIVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.concept_nodes && Object.keys(parsed.concept_nodes).length > 0) {
        // Calculate updated live retention health based on elapsed time
        return recalculateGraphHealth(parsed);
      }
    }
  } catch (err) {
    console.error('Failed to load local cognitive graph:', err);
  }
  return recalculateGraphHealth(DEFAULT_COGNITIVE_GRAPH);
}

/**
 * Save Cognitive Graph to Local Storage
 */
export function saveLocalCognitiveGraph(graph: StudentCognitiveGraph): void {
  try {
    graph.last_synced_timestamp = new Date().toISOString();
    graph.overall_readiness_score = calculateOverallReadiness(graph);
    localStorage.setItem(LOCAL_COGNITIVE_KEY, JSON.stringify(graph, null, 2));
    
    // Also keep student_profile.json synchronized
    localStorage.setItem('student_profile.json', JSON.stringify({
      student_id: graph.student_id,
      overall_readiness_score: graph.overall_readiness_score,
      last_synced_timestamp: graph.last_synced_timestamp,
      cognitive_graph: graph
    }));
  } catch (err) {
    console.error('Failed to save local cognitive graph:', err);
  }
}

/**
 * Recalculate live retention health (Ebbinghaus decay curve) for all concept nodes
 */
export function recalculateGraphHealth(graph: StudentCognitiveGraph): StudentCognitiveGraph {
  const now = Date.now();
  const updatedNodes: Record<string, ConceptNode> = {};

  for (const [key, node] of Object.entries(graph.concept_nodes)) {
    const lastRev = new Date(node.last_reviewed_timestamp).getTime() || now;
    const daysElapsed = Math.max(0, (now - lastRev) / 86400000);

    // Ebbinghaus exponential decay model: R = e^(-t / S)
    // S (stability) is higher with greater streak
    const stability = Math.max(1, (node.streak_count >= 3 ? 30 : (node.decay_interval_days || 4)));
    const retentionHealth = Math.max(0.1, Math.min(1.0, Number(Math.exp(-daysElapsed / stability).toFixed(2))));

    let status = node.status;
    if (node.streak_count >= 3 && retentionHealth >= 0.7) {
      status = 'MASTERED_LOCKED';
    } else if (retentionHealth >= 0.7) {
      status = 'MASTERED';
    } else if (retentionHealth >= 0.4) {
      status = 'NEEDS_REVISION';
    } else {
      status = 'CRITICAL_WEAKNESS';
    }

    const dueDate = new Date(lastRev + (node.decay_interval_days * 86400000)).toISOString();

    updatedNodes[key] = {
      ...node,
      retention_strength: retentionHealth,
      status,
      decay_due_date: dueDate
    };
  }

  const updatedGraph = {
    ...graph,
    concept_nodes: updatedNodes
  };
  updatedGraph.overall_readiness_score = calculateOverallReadiness(updatedGraph);
  return updatedGraph;
}

/**
 * Calculate the overall student readiness index (0 to 100)
 */
export function calculateOverallReadiness(graph: StudentCognitiveGraph): number {
  const nodes = Object.values(graph.concept_nodes);
  if (nodes.length === 0) return 78;

  let totalWeightedScore = 0;
  for (const node of nodes) {
    const statusWeight = 
      node.status === 'MASTERED_LOCKED' ? 1.0 :
      node.status === 'MASTERED' ? 0.85 :
      node.status === 'NEEDS_REVISION' ? 0.5 : 0.2;
    
    const nodeScore = (node.mastery_score * 0.5) + (node.retention_strength * 100 * 0.5);
    totalWeightedScore += nodeScore * statusWeight;
  }

  return Math.min(100, Math.max(10, Math.round(totalWeightedScore / nodes.length)));
}

/**
 * Find the most urgent decayed / overdue concept for spaced surprise retrieval
 */
export function findDueDecayedConcept(graph: StudentCognitiveGraph): ConceptNode | null {
  const now = Date.now();
  const nodes = Object.values(graph.concept_nodes);

  // 1. First priority: Critical Weakness or Overdue decay date
  const overdueOrCritical = nodes.filter(n => {
    const isOverdue = new Date(n.decay_due_date).getTime() <= now;
    return isOverdue || n.status === 'CRITICAL_WEAKNESS' || n.retention_strength < 0.5;
  });

  if (overdueOrCritical.length > 0) {
    // Sort by lowest retention strength first
    overdueOrCritical.sort((a, b) => a.retention_strength - b.retention_strength);
    return overdueOrCritical[0];
  }

  // 2. Second priority: Needs revision
  const needsRevision = nodes.filter(n => n.status === 'NEEDS_REVISION');
  if (needsRevision.length > 0) {
    needsRevision.sort((a, b) => a.retention_strength - b.retention_strength);
    return needsRevision[0];
  }

  return null;
}

/**
 * Update the cognitive graph after a diagnostic evaluation of a student turn
 */
export function applyDiagnosticUpdate(
  graph: StudentCognitiveGraph,
  diagnostic: {
    concept_id?: string;
    concept_name: string;
    topic?: string;
    is_correct: boolean;
    traps_triggered?: string[];
    calculation_sound?: boolean;
    confidence?: number;
  }
): { updatedGraph: StudentCognitiveGraph; affectedNode: ConceptNode } {
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const key = diagnostic.concept_id || diagnostic.concept_name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  const existingNode = graph.concept_nodes[key] || {
    id: key,
    name: diagnostic.concept_name,
    topic: diagnostic.topic || 'General',
    mastery_score: 50,
    retention_strength: 0.5,
    decay_interval_days: 2,
    last_reviewed_timestamp: now,
    decay_due_date: new Date(nowMs + 2 * 86400000).toISOString(),
    known_traps: diagnostic.traps_triggered || [],
    trap_history: diagnostic.traps_triggered || [],
    streak_count: 0,
    status: 'NEEDS_REVISION' as const
  };

  let newStreak = existingNode.streak_count;
  let newInterval = existingNode.decay_interval_days;
  let newMastery = existingNode.mastery_score;
  let newRetention = existingNode.retention_strength;
  let newStatus: ConceptNode['status'] = existingNode.status;
  const newTraps = Array.from(new Set([...existingNode.known_traps, ...(diagnostic.traps_triggered || [])]));
  const trapHistory = [...(existingNode.trap_history || []), ...(diagnostic.traps_triggered || [])];

  if (diagnostic.is_correct) {
    newStreak += 1;
    newRetention = Math.min(1.0, Number((newRetention + 0.35).toFixed(2)));
    newMastery = Math.min(100, Math.round(newMastery + (100 - newMastery) * 0.4));
    
    // Expand spaced interval: 1 -> 3 -> 7 -> 15 -> 30 days
    if (newStreak >= 4) newInterval = 30;
    else if (newStreak === 3) newInterval = 15;
    else if (newStreak === 2) newInterval = 7;
    else newInterval = 3;

    if (newStreak >= 3) {
      newStatus = 'MASTERED_LOCKED';
    } else {
      newStatus = 'MASTERED';
    }
  } else {
    // Reset streak on mistake / trap
    newStreak = 0;
    newInterval = 1; // re-test in 24 hours
    newRetention = Math.max(0.15, Number((newRetention - 0.4).toFixed(2)));
    newMastery = Math.max(20, Math.round(newMastery * 0.65));
    newStatus = diagnostic.traps_triggered && diagnostic.traps_triggered.length > 0 ? 'CRITICAL_WEAKNESS' : 'NEEDS_REVISION';
  }

  const updatedNode: ConceptNode = {
    ...existingNode,
    name: diagnostic.concept_name,
    topic: diagnostic.topic || existingNode.topic,
    mastery_score: newMastery,
    retention_strength: newRetention,
    decay_interval_days: newInterval,
    last_reviewed_timestamp: now,
    decay_due_date: new Date(nowMs + newInterval * 86400000).toISOString(),
    known_traps: newTraps,
    trap_history: trapHistory,
    streak_count: newStreak,
    status: newStatus
  };

  const updatedGraph: StudentCognitiveGraph = {
    ...graph,
    concept_nodes: {
      ...graph.concept_nodes,
      [key]: updatedNode
    }
  };

  saveLocalCognitiveGraph(updatedGraph);
  return { updatedGraph, affectedNode: updatedNode };
}

// =========================================================================
// GOOGLE DRIVE BI-DIRECTIONAL PERSISTENT SYNC & MASTER VAULT STORAGE
// =========================================================================

export interface DriveSyncResult {
  success: boolean;
  fileId?: string;
  vaultFolderId?: string;
  syncedFiles?: string[];
  timestamp?: string;
  error?: string;
  graph?: StudentCognitiveGraph;
}

export interface ErrorLogItem {
  id: string;
  concept: string;
  topic: string;
  trap: string;
  status: 'ACTIVE' | 'RESOLVED';
  detected_at: string;
  resolved_at?: string;
}

/**
 * Builds the Error Log Registry from Cognitive Graph and historical traps
 */
export function buildErrorLogRegistry(graph?: StudentCognitiveGraph): ErrorLogItem[] {
  const currentGraph = graph || loadLocalCognitiveGraph();
  const errors: ErrorLogItem[] = [];

  Object.values(currentGraph.concept_nodes).forEach(node => {
    // Active traps
    node.known_traps.forEach((trap, i) => {
      errors.push({
        id: `${node.id}_trap_${i}`,
        concept: node.name,
        topic: node.topic || 'General',
        trap,
        status: node.status === 'MASTERED_LOCKED' || node.status === 'MASTERED' ? 'RESOLVED' : 'ACTIVE',
        detected_at: node.last_reviewed_timestamp,
        resolved_at: node.status === 'MASTERED_LOCKED' || node.status === 'MASTERED' ? node.last_reviewed_timestamp : undefined
      });
    });

    // Historical traps
    (node.trap_history || []).forEach((historicalTrap, i) => {
      if (!node.known_traps.includes(historicalTrap)) {
        errors.push({
          id: `${node.id}_hist_${i}`,
          concept: node.name,
          topic: node.topic || 'General',
          trap: historicalTrap,
          status: 'RESOLVED',
          detected_at: node.last_reviewed_timestamp,
          resolved_at: node.last_reviewed_timestamp
        });
      }
    });
  });

  return errors;
}

/**
 * Helper to upload or update a file in Google Drive, inside a specific folder
 */
async function uploadOrUpdateDriveFile(
  fileName: string,
  content: string,
  token: string,
  folderId?: string | null,
  description?: string
): Promise<string> {
  // Search for file (optionally inside the vault folder)
  let query = `name='${fileName}' and trashed=false`;
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let fileId: string | null = null;
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      fileId = searchData.files[0].id;
    }
  }

  if (fileId) {
    // Update existing file
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: content
      }
    );
    if (!updateRes.ok) throw new Error(`Failed to update ${fileName}: ${updateRes.statusText}`);
    return fileId;
  } else {
    // Create new file
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata: any = {
      name: fileName,
      mimeType: 'application/json',
      description: description || `Examix AI File - ${fileName}`
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      content +
      closeDelim;

    const createRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      }
    );

    if (!createRes.ok) throw new Error(`Failed to create ${fileName}: ${createRes.statusText}`);
    const createData = await createRes.json();
    return createData.id;
  }
}

/**
 * AUTOMATED REAL-TIME MASTER VAULT SYNC:
 * Synchronizes all 3 core datasets directly into 📁 Examix_AI_Mastery_Vault:
 * 1. student_cognitive_graph.json
 * 2. chat_sessions_history.json
 * 3. error_log_registry.json
 */
export async function syncVaultToDrive(customGraph?: StudentCognitiveGraph): Promise<DriveSyncResult> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, error: 'Google Drive authentication required. Please connect Google Account.' };
    }

    // 1. Locate or create Examix_AI_Mastery_Vault folder
    const vaultFolderId = await getOrCreateVaultFolder(token);

    // 2. Prepare Cognitive Graph
    const currentGraph = customGraph || loadLocalCognitiveGraph();
    currentGraph.last_synced_timestamp = new Date().toISOString();
    const cognitiveGraphContent = JSON.stringify(currentGraph, null, 2);

    // 3. Prepare Chat Sessions History
    let chatHistoryContent = '[]';
    try {
      const rawSessions = localStorage.getItem('examix_chat_sessions_v1') || '[]';
      chatHistoryContent = JSON.stringify(JSON.parse(rawSessions), null, 2);
    } catch {
      chatHistoryContent = '[]';
    }

    // 4. Prepare Error Log Registry
    const errorRegistry = buildErrorLogRegistry(currentGraph);
    const errorRegistryContent = JSON.stringify(errorRegistry, null, 2);

    // 5. Concurrently sync files into the Vault
    const [cogFileId, chatFileId, errFileId] = await Promise.all([
      uploadOrUpdateDriveFile(
        DRIVE_COGNITIVE_FILE,
        cognitiveGraphContent,
        token,
        vaultFolderId,
        'Examix AI Cognitive Knowledge Graph & Spaced Repetition State'
      ),
      uploadOrUpdateDriveFile(
        DRIVE_CHAT_HISTORY_FILE,
        chatHistoryContent,
        token,
        vaultFolderId,
        'Examix AI Full Chat Turns, Math Derivations & Numerical Attempts'
      ),
      uploadOrUpdateDriveFile(
        DRIVE_ERROR_LOG_FILE,
        errorRegistryContent,
        token,
        vaultFolderId,
        'Examix AI Active & Resolved Traps and Formula Mistakes'
      )
    ]);

    saveLocalCognitiveGraph(currentGraph);
    localStorage.setItem('examix_last_vault_sync', new Date().toISOString());

    return {
      success: true,
      fileId: cogFileId,
      vaultFolderId: vaultFolderId || undefined,
      syncedFiles: [DRIVE_COGNITIVE_FILE, DRIVE_CHAT_HISTORY_FILE, DRIVE_ERROR_LOG_FILE],
      timestamp: currentGraph.last_synced_timestamp,
      graph: currentGraph
    };
  } catch (err: any) {
    console.error('syncVaultToDrive error:', err);
    return { success: false, error: err.message || 'Google Drive Master Vault sync failed' };
  }
}

/**
 * Upload & Sync Cognitive Graph to Google Drive (compat wrapper)
 */
export async function syncToDrive(graph?: StudentCognitiveGraph): Promise<DriveSyncResult> {
  return syncVaultToDrive(graph);
}

/**
 * Load Cognitive Graph from Google Drive (student_cognitive_graph.json)
 */
export async function loadFromDrive(): Promise<DriveSyncResult> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, error: 'Google Drive authentication required. Please connect Google Account.' };
    }

    const vaultFolderId = await getOrCreateVaultFolder(token);

    // 1. Search for student_cognitive_graph.json inside Vault or root Drive
    let query = `name='${DRIVE_COGNITIVE_FILE}' and trashed=false`;
    if (vaultFolderId) {
      query += ` and '${vaultFolderId}' in parents`;
    }

    let searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    let existingFile: any = null;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        existingFile = searchData.files[0];
      }
    }

    // Fallback: search anywhere in Drive
    if (!existingFile) {
      const globalSearch = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_COGNITIVE_FILE}' and trashed=false&fields=files(id,name,modifiedTime)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (globalSearch.ok) {
        const globalData = await globalSearch.json();
        if (globalData.files && globalData.files.length > 0) {
          existingFile = globalData.files[0];
        }
      }
    }

    if (!existingFile) {
      return { success: false, error: 'No student_cognitive_graph.json found on Google Drive.' };
    }

    // 2. Download file content
    const downloadRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!downloadRes.ok) throw new Error(`Drive download failed: ${downloadRes.statusText}`);
    const remoteGraph: StudentCognitiveGraph = await downloadRes.json();

    if (remoteGraph && remoteGraph.concept_nodes) {
      const refreshed = recalculateGraphHealth(remoteGraph);
      saveLocalCognitiveGraph(refreshed);
      return {
        success: true,
        fileId: existingFile.id,
        vaultFolderId: vaultFolderId || undefined,
        syncedFiles: [DRIVE_COGNITIVE_FILE],
        timestamp: refreshed.last_synced_timestamp,
        graph: refreshed
      };
    } else {
      throw new Error('Invalid cognitive graph structure received from Drive');
    }
  } catch (err: any) {
    console.error('loadFromDrive error:', err);
    return { success: false, error: err.message || 'Failed to load from Google Drive' };
  }
}
