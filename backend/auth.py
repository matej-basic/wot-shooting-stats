import hmac
import os
from typing import Optional

from fastapi import Header, HTTPException


def require_admin(authorization: Optional[str] = Header(default=None)) -> None:
    """Guard for routes that change or delete data.

    Requires `Authorization: Bearer <ADMIN_TOKEN>`. When ADMIN_TOKEN is not
    set, the guarded routes are disabled and answer 404 as if they did not
    exist.
    """
    expected = os.getenv("ADMIN_TOKEN", "").strip()
    if not expected:
        raise HTTPException(status_code=404, detail="Not Found")

    scheme, _, supplied = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(
        supplied.strip().encode("utf-8"), expected.encode("utf-8")
    ):
        raise HTTPException(status_code=403, detail="Forbidden")
