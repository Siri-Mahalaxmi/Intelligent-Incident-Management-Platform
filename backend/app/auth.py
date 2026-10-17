"""
auth.py — FastAPI dependency for Supabase JWT verification.

Supports both classic Supabase JWT secrets (HS256) and the newer
Supabase projects that use RS256 with a JWKS endpoint. Tries HS256
with the configured secret first; if that fails with an algorithm
error it falls back to fetching the public key from the JWKS endpoint.
"""

import os
import jwt  # PyJWT
import json
import urllib.request

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.profile_service import (
    UserProfile,
    get_profile_by_auth_id,
    update_profile_last_active,
)

_bearer_scheme = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# JWT secret / key helpers
# ---------------------------------------------------------------------------

def _get_jwt_secret() -> str | None:
    """Return the HS256 JWT secret from env, or None if not set."""
    return os.environ.get("SUPABASE_JWT_SECRET") or None


def _get_supabase_url() -> str | None:
    return os.environ.get("SUPABASE_URL") or None


# Simple in-process cache for JWKS keys so we don't fetch on every request
_jwks_cache: dict = {}


def _get_jwks_key(kid: str | None):
    """
    Fetch the public key from the Supabase JWKS endpoint.
    Supports both EC keys (ES256, newest Supabase) and RSA keys (RS256).
    Caches the JWKS response in memory — cleared on process restart.
    Raises HTTPException if the key cannot be fetched or parsed.
    """
    global _jwks_cache

    supabase_url = _get_supabase_url()
    if not supabase_url:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL is not set in backend/.env.",
        )

    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    try:
        if not _jwks_cache:
            with urllib.request.urlopen(jwks_url, timeout=5) as resp:
                _jwks_cache = json.loads(resp.read())
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Failed to fetch Supabase JWKS keys from {jwks_url}: {exc}",
        )

    from jwt.algorithms import RSAAlgorithm, ECAlgorithm

    keys = _jwks_cache.get("keys", [])
    if not keys:
        raise HTTPException(
            status_code=401,
            detail="Supabase JWKS endpoint returned no keys.",
        )

    # Use the key matching kid, or fall back to the first key
    matching = [k for k in keys if kid is None or k.get("kid") == kid]
    if not matching:
        matching = keys

    key_data = matching[0]
    kty = key_data.get("kty", "RSA")

    try:
        if kty == "EC":
            return ECAlgorithm.from_jwk(json.dumps(key_data))
        else:
            return RSAAlgorithm.from_jwk(json.dumps(key_data))
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Failed to parse JWKS public key (kty={kty}): {exc}",
        )


def _decode_token(token: str) -> dict:
    """
    Decode and verify a Supabase JWT.

    Strategy:
    1. Peek at the header to see which algorithm is declared.
    2. If HS256 — use the SUPABASE_JWT_SECRET.
    3. If RS256 — fetch the public key from the JWKS endpoint.
    4. If neither secret nor JWKS key is available, raise 401.
    """
    # Peek at header without verifying — safe, just reads alg/kid fields
    try:
        header = jwt.get_unverified_header(token)
    except jwt.DecodeError as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Malformed authentication token: {exc}",
        )

    alg = header.get("alg", "HS256")
    kid = header.get("kid")

    decode_kwargs = dict(
        algorithms=[alg],
        audience="authenticated",
        options={"verify_exp": True},
        leeway=60,  # allow up to 60s clock skew between server and Supabase
    )

    # ── HS256 path ────────────────────────────────────────────────────────
    if alg == "HS256":
        secret = _get_jwt_secret()
        if not secret:
            raise HTTPException(
                status_code=500,
                detail=(
                    "SUPABASE_JWT_SECRET is not set in backend/.env. "
                    "Find it in Supabase Dashboard → Project Settings → "
                    "API → JWT Settings → JWT Secret."
                ),
            )
        try:
            return jwt.decode(token, secret, **decode_kwargs)
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail="Session expired. Please sign in again.",
            )
        except jwt.InvalidTokenError as exc:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid authentication token: {exc}",
            )

    # ── RS256 path (newer Supabase projects) ──────────────────────────────
    if alg == "RS256":
        public_key = _get_jwks_key(kid)
        try:
            return jwt.decode(token, public_key, **decode_kwargs)
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
        except jwt.InvalidTokenError as exc:
            raise HTTPException(status_code=401, detail=f"Invalid authentication token: {exc}")

    # ── ES256 / ES384 / ES512 path (newest Supabase projects) ────────────
    if alg in ("ES256", "ES384", "ES512"):
        public_key = _get_jwks_key(kid)
        try:
            return jwt.decode(token, public_key, **decode_kwargs)
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
        except jwt.InvalidTokenError as exc:
            raise HTTPException(status_code=401, detail=f"Invalid authentication token: {exc}")

    # ── Unknown algorithm ─────────────────────────────────────────────────
    raise HTTPException(
        status_code=401,
        detail=f"Unsupported JWT algorithm: {alg}. Expected HS256, RS256, or ES256.",
    )


# ---------------------------------------------------------------------------
# Core dependency
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer_scheme),
) -> UserProfile:
    """
    FastAPI dependency — verifies the Supabase JWT and returns the
    caller's application profile (with role + organization_id).
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode_token(credentials.credentials)

    auth_user_id: str | None = payload.get("sub")
    if not auth_user_id:
        raise HTTPException(
            status_code=401,
            detail="Token missing user identifier (sub claim).",
        )

    profile = get_profile_by_auth_id(auth_user_id)
    update_profile_last_active(auth_user_id)
    return profile


# ---------------------------------------------------------------------------
# Role-enforcement helpers
# ---------------------------------------------------------------------------

def require_central_admin(
    user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """Raises 403 if the caller is not a central_admin."""
    if not user.is_central_admin:
        raise HTTPException(
            status_code=403,
            detail="Central administrator access required.",
        )
    return user


def require_org_access(org_id: str, user: UserProfile) -> None:
    """
    Raises 403 if an org user tries to access a different org's data.
    central_admin passes unconditionally.
    """
    if user.is_central_admin:
        return
    if user.organization_id != org_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this organization's data.",
        )
