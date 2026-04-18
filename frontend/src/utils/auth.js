const USERS_KEY = 'checkmateai_users';
const SESSION_KEY = 'checkmateai_session';

const safeJsonParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const normalizeSession = (session) => {
  if (!session || typeof session !== 'object') return null;
  if (!session.user || typeof session.user !== 'object') return null;

  const { user } = session;
  if (!user.email || !user.name) return null;

  return {
    ...session,
    user: {
      id: user.id || user.email,
      name: user.name,
      email: user.email,
      provider: user.provider || session.provider || 'manual',
      picture: user.picture || null,
    },
    provider: session.provider || user.provider || 'manual',
  };
};

export const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
};

export const loadUsers = () => {
  const storage = getStorage();
  if (!storage) return [];
  return safeJsonParse(storage.getItem(USERS_KEY), []);
};

export const saveUsers = (users) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(USERS_KEY, JSON.stringify(users));
};

export const loadSession = () => {
  const storage = getStorage();
  if (!storage) return null;
  const session = normalizeSession(safeJsonParse(storage.getItem(SESSION_KEY), null));
  if (!session) storage.removeItem(SESSION_KEY);
  return session;
};

export const saveSession = (session) => {
  const storage = getStorage();
  if (!storage) return;
  const normalized = normalizeSession(session);
  if (!normalized) return;
  storage.setItem(SESSION_KEY, JSON.stringify(normalized));
};

export const clearSession = () => {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(SESSION_KEY);
};

export const registerManualAccount = async ({ name, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const users = loadUsers();

  if (users.some((user) => user.email === normalizedEmail)) {
    return { status: 'error', message: 'An account already exists for that email.' };
  }

  const passwordHash = await hashPassword(password);
  const user = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    provider: 'manual',
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);

  const session = normalizeSession({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.provider,
      picture: null,
    },
    provider: 'manual',
    loggedInAt: new Date().toISOString(),
  });

  saveSession(session);
  return { status: 'ok', session };
};

export const loginManualAccount = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const users = loadUsers();
  const user = users.find((entry) => entry.email === normalizedEmail);

  if (!user) {
    return { status: 'error', message: 'No account found for that email.' };
  }

  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    return { status: 'error', message: 'Incorrect password.' };
  }

  const session = normalizeSession({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.provider,
      picture: null,
    },
    provider: 'manual',
    loggedInAt: new Date().toISOString(),
  });

  saveSession(session);
  return { status: 'ok', session };
};

export const createGoogleSession = (credential) => {
  const parts = credential.split('.');
  if (parts.length < 2) {
    return { status: 'error', message: 'Invalid Google credential.' };
  }

  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
  const decoded = atob(padded);
  const profile = safeJsonParse(decoded, null);

  if (!profile?.email) {
    return { status: 'error', message: 'Google sign-in did not return a profile.' };
  }

  const session = normalizeSession({
    user: {
      id: profile.sub || profile.email,
      name: profile.name || profile.email,
      email: profile.email,
      provider: 'google',
      picture: profile.picture || null,
    },
    provider: 'google',
    loggedInAt: new Date().toISOString(),
  });

  saveSession(session);
  return { status: 'ok', session };
};