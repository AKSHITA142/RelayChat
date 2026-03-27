export const getAppBaseUrl = () => {
  const base = import.meta.env.BASE_URL || "/";
  return new URL(base, window.location.origin).toString();
};

export const redirectToAppBase = () => {
  window.location.href = getAppBaseUrl();
};

