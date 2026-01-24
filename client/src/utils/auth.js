export const getLoggedInUser = () => {
  return JSON.parse(localStorage.getItem("user"));
};