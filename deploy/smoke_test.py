"""Read-only public smoke checks for the deployed HairRoot service.

The script intentionally does not print the service URL or any credentials.
Set both SMOKE_EMAIL and SMOKE_PASSWORD to include a login/session check; when
neither is set the public health, readiness, and UI checks still run.
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit


def request(base, path, data=None, opener=None):
    headers = {}
    if data is not None:
        headers["Content-Type"] = "application/json"
        headers["Origin"] = base
    req = urllib.request.Request(
        base + path,
        headers=headers,
        data=json.dumps(data).encode() if data is not None else None,
    )
    client = opener or urllib.request.build_opener()
    with client.open(req, timeout=30) as response:
        return response.read()


def retry_check(base, path, predicate):
    for attempt in range(5):
        try:
            if not predicate(request(base, path)):
                raise ValueError("unexpected response")
            print("PASS " + path)
            return
        except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
            if attempt == 4:
                raise RuntimeError("Smoke check failed: " + path) from None
            time.sleep(3)


def check_login(base, email, password):
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
    )
    logged_in = False
    try:
        login = json.loads(
            request(base, "/api/auth/login", {"email": email, "password": password}, opener)
        )
        if login.get("user", {}).get("email", "").lower() != email.lower():
            raise RuntimeError("Login smoke check failed.")
        logged_in = True

        current = json.loads(request(base, "/api/auth/me", opener=opener))
        if current.get("user", {}).get("email", "").lower() != email.lower():
            raise RuntimeError("Authenticated session smoke check failed.")
        print("PASS login and authenticated session")
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, json.JSONDecodeError):
        raise RuntimeError("Login smoke check failed.") from None
    finally:
        if logged_in:
            try:
                request(base, "/api/auth/logout", {}, opener)
                print("PASS logout")
            except (urllib.error.URLError, TimeoutError):
                raise RuntimeError("Logout smoke check failed.") from None


def check(base):
    parsed = urlsplit(base)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("SERVICE_URL must be a valid HTTPS URL.")

    retry_check(
        base,
        "/api/health",
        lambda body: json.loads(body).get("status") == "ok",
    )
    retry_check(
        base,
        "/api/ready",
        lambda body: json.loads(body).get("db") == "connected",
    )
    retry_check(base, "/", lambda body: b"<html" in body.lower())

    email = os.getenv("SMOKE_EMAIL", "")
    password = os.getenv("SMOKE_PASSWORD", "")
    if bool(email) != bool(password):
        raise RuntimeError("Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.")
    if email:
        check_login(base, email, password)
    else:
        print("SKIP login: optional smoke credentials are not configured")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 deploy/smoke_test.py SERVICE_URL")
    try:
        check(sys.argv[1].rstrip("/"))
    except (ValueError, RuntimeError) as error:
        sys.exit(str(error))
