export function requestLogger(req, _res, next) {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} :: ${req.ip}`
  );
  next();
}
