import { useState } from 'react';
import { loadProfilePrefs, saveProfilePrefs } from '../../api/profilePrefs.js';
import { DEFAULT_PREFS } from './avatarOptions.js';

// Avatar preferences for one account. Render with key={uid} so a different
// account always starts from its own saved choices.
export function useProfilePrefs(uid) {
  const [prefs, setPrefs] = useState(() => loadProfilePrefs(uid));

  const update = (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveProfilePrefs(uid, next);
  };

  const reset = () => update({ ...DEFAULT_PREFS });

  return { prefs, update, reset };
}
