const { OAuth2Client } = require("google-auth-library");

function createGoogleAuthenticator({ clientId, allowedDomains }) {
  const client = new OAuth2Client(clientId);

  return async function authenticateGoogleToken(req, res, next) {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({ error: "Google sign-in is required." });
    }

    try {
      const ticket = await client.verifyIdToken({ idToken: match[1], audience: clientId });
      const payload = ticket.getPayload();
      const emailDomain = String(payload.email || "").split("@").pop().toLowerCase();
      const hostedDomain = String(payload.hd || "").toLowerCase();
      const domainAllowed = allowedDomains.has(emailDomain) && allowedDomains.has(hostedDomain);

      if (!payload.sub || payload.email_verified !== true || !domainAllowed) {
        return res.status(403).json({ error: "Please sign in with an approved NYU Google account." });
      }

      req.player = { sub: payload.sub };
      return next();
    } catch (error) {
      return res.status(401).json({ error: "Your Google sign-in expired or could not be verified." });
    }
  };
}

module.exports = { createGoogleAuthenticator };
