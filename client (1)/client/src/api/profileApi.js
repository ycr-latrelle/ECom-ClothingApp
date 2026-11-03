const PROFILE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/me/profile`;

async function getIdToken(user) {
  if (!user) {
    throw new Error("You must be signed in to manage your profile.");
  }

  return user.getIdToken();
}

export async function getMyProfile(user) {
  const token = await getIdToken(user);

  const response = await fetch(PROFILE_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Could not load profile (HTTP ${response.status}).`);
  }

  return response.json();
}

export async function saveMyProfile(user, profile) {
  const token = await getIdToken(user);

  const response = await fetch(PROFILE_URL, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error(`Could not save profile (HTTP ${response.status}).`);
  }
}