export function demoAuth(req, _res, next) {
  const demoUser = req.header("x-demo-user") || "campus-ops";
  req.user = {
    id: demoUser,
    role: demoUser === "admin" ? "admin" : "analyst"
  };
  next();
}
