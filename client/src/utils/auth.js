export const getLoggedInUser = () => {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const clearClientStorage = () => {
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
};
