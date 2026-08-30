import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.setCustomParameters({
  prompt: 'select_account'
});

const TOKEN_STORAGE_KEY = 'examix_google_access_token';
const PROFILE_STORAGE_KEY = 'examix_user_profile';
const VAULT_FOLDER_ID_KEY = 'examix_vault_folder_id';
export const VAULT_FOLDER_NAME = 'Examix_AI_Mastery_Vault';

export interface StoredUserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
})();

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const storedToken = cachedAccessToken || localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        cachedAccessToken = storedToken;
        // Save user profile
        try {
          const profile: StoredUserProfile = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL
          };
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
        } catch (e) {
          console.error('Failed to store profile', e);
        }
        if (onAuthSuccess) onAuthSuccess(user, storedToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      // User is signed out
      if (!isSigningIn) {
        cachedAccessToken = null;
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(PROFILE_STORAGE_KEY);
        } catch {}
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token');
    }
    
    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, cachedAccessToken);
      const profile: StoredUserProfile = {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL
      };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      cachedAccessToken = stored;
      return stored;
    }
  } catch {}
  return null;
};

export const getStoredProfile = (): StoredUserProfile | null => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Sign out error:', err);
  } finally {
    cachedAccessToken = null;
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(VAULT_FOLDER_ID_KEY);
    } catch {}
  }
};

/**
 * Locate or automatically create the dedicated folder: Examix_AI_Mastery_Vault
 */
export const getOrCreateVaultFolder = async (token?: string): Promise<string | null> => {
  try {
    const activeToken = token || (await getAccessToken());
    if (!activeToken) return null;

    // Check cached folder ID first
    const cachedFolderId = localStorage.getItem(VAULT_FOLDER_ID_KEY);
    if (cachedFolderId) {
      // Validate folder still exists
      const verifyRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${cachedFolderId}?fields=id,name,trashed`,
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        if (verifyData && !verifyData.trashed) {
          return verifyData.id;
        }
      }
    }

    // Search for existing folder in Drive
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${VAULT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${activeToken}` } }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const folderId = searchData.files[0].id;
        localStorage.setItem(VAULT_FOLDER_ID_KEY, folderId);
        return folderId;
      }
    }

    // Create new folder in user's root Drive
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: VAULT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Examix AI Automated Mastery Vault (Cognitive Graphs, History & Error Logs)'
      })
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      const folderId = createData.id;
      localStorage.setItem(VAULT_FOLDER_ID_KEY, folderId);
      return folderId;
    }
  } catch (error) {
    console.error('getOrCreateVaultFolder failed:', error);
  }
  return null;
};

