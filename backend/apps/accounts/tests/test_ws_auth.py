"""WebSocket authentication compatibility — scopes authenticate from the JWT
cookie through the full ASGI stack (origin validator + JWT middleware)."""

import asyncio

import pytest
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from config.asgi import application

User = get_user_model()
PASSWORD = "long-password-123"
ORIGIN = [(b"origin", b"http://localhost:3000")]


def _comm(extra_headers=None) -> WebsocketCommunicator:
    return WebsocketCommunicator(
        application, "/ws/ping/", headers=[*ORIGIN, *(extra_headers or [])]
    )


def run(coro):
    return asyncio.run(coro)


@pytest.mark.django_db(transaction=True)
def test_ws_unauthenticated_scope_is_anonymous():
    async def session():
        communicator = _comm()
        connected, _ = await communicator.connect()
        assert connected
        await communicator.send_json_to({"type": "whoami"})
        payload = await communicator.receive_json_from()
        assert payload["authenticated"] is False
        await communicator.disconnect()

    run(session())


@pytest.mark.django_db(transaction=True)
def test_ws_authenticates_from_jwt_cookie():
    user = User.objects.create_user(email="ws@x.io", password=PASSWORD, name="WS")
    token = str(RefreshToken.for_user(user).access_token)
    cookie = f"hm_access={token}".encode()

    async def session():
        communicator = _comm([(b"cookie", cookie)])
        connected, _ = await communicator.connect()
        assert connected
        await communicator.send_json_to({"type": "whoami"})
        payload = await communicator.receive_json_from()
        assert payload["authenticated"] is True
        assert payload["user_id"] == user.id
        await communicator.disconnect()

    run(session())


@pytest.mark.django_db(transaction=True)
def test_ws_rejects_garbage_and_inactive_tokens():
    user = User.objects.create_user(email="wsbad@x.io", password=PASSWORD, name="WSB")
    token = str(RefreshToken.for_user(user).access_token)
    user.is_active = False
    user.save()

    async def session():
        for cookie_value in (f"hm_access={token}", "hm_access=garbage.token.here"):
            communicator = _comm([(b"cookie", cookie_value.encode())])
            connected, _ = await communicator.connect()
            assert connected  # connect ok; scope is anonymous — consumers decide
            await communicator.send_json_to({"type": "whoami"})
            payload = await communicator.receive_json_from()
            assert payload["authenticated"] is False
            await communicator.disconnect()

    run(session())
