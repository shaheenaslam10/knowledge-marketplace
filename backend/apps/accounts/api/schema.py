"""drf-spectacular extensions for the cookie-first auth scheme.

Registers `hm_access`/`hm_refresh` cookie authentication so the OpenAPI
document describes how browsers authenticate (httpOnly cookies, never
Bearer headers). The Bearer fallback is documented by SimpleJWT's built-in
JWTAuth scheme for `JWTAuthentication`.
"""

from drf_spectacular.extensions import OpenApiAuthenticationExtension


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "apps.accounts.authentication.CookieJWTAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "apiKey", "in": "cookie", "name": "hm_access"}


class ActiveUserJWTAuthenticationScheme(CookieJWTAuthenticationScheme):
    """Same cookie, but rejects deactivated users on every request."""

    target_class = "apps.accounts.authentication.ActiveUserJWTAuthentication"
    name = "cookieAuth"
