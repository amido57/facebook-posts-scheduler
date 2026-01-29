import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_ME_NOW";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function setAuthCookie(res, token) {
  res.cookie("auth", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

export function clearAuthCookie(res) {
  res.clearCookie("auth", { path: "/" });
}
