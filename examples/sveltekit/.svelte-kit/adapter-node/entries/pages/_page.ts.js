const load = ({ url }) => ({
  code: url.searchParams.get("code"),
  state: url.searchParams.get("state"),
  error: url.searchParams.get("error")
});
export {
  load
};
