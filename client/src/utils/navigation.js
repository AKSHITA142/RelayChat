export const getAppBaseUrl = () => {
  const base = import.meta.env.BASE_URL || "/";
  return new URL(base, window.location.origin).toString();
};

export const redirectToAppBase = () => {
  window.location.href = getAppBaseUrl();
};

export const replaceUrlToAppBase = () => {
  const base = import.meta.env.BASE_URL || "/";
  window.history.replaceState({}, document.title, base);
};

export const reloadToAppBase = () => {
  window.location.replace(getAppBaseUrl());
};

export const redirectToSessionExpired = () => {
  const base = getAppBaseUrl();
  const url = new URL(base);
  url.searchParams.set("session_expired", "true");
  window.location.href = url.toString();
};
