"""WebSocket foundation: ping consumer through the real ASGI stack (origin
validation + auth middleware + in-memory channel layer).

Plugin-free async execution: each test runs its entire communicator session
with asyncio.run (one fresh event loop per test) — no reliance on pytest-asyncio
activation and none of asgiref's cross-loop thread-local state, so local and CI
behave identically.
"""

import asyncio

from channels.testing import WebsocketCommunicator

from config.asgi import application

ORIGIN = [(b"origin", b"http://localhost:3000")]


async def _ping_pong_session():
    communicator = WebsocketCommunicator(application, "/ws/ping/", headers=ORIGIN)
    connected, _ = await communicator.connect()
    assert connected
    await communicator.send_json_to({"type": "ping"})
    response = await communicator.receive_json_from()
    assert response == {"type": "pong"}
    await communicator.disconnect()


async def _unknown_type_session():
    communicator = WebsocketCommunicator(application, "/ws/ping/", headers=ORIGIN)
    await communicator.connect()
    await communicator.send_json_to({"type": "wat"})
    response = await communicator.receive_json_from()
    assert response == {"type": "error", "code": "unsupported_type"}
    await communicator.disconnect()


async def _invalid_json_session():
    communicator = WebsocketCommunicator(application, "/ws/ping/", headers=ORIGIN)
    await communicator.connect()
    await communicator.send_to(text_data="{nope")
    response = await communicator.receive_json_from()
    assert response == {"type": "error", "code": "invalid_json"}
    await communicator.disconnect()


async def _foreign_origin_session():
    communicator = WebsocketCommunicator(
        application, "/ws/ping/", headers=[(b"origin", b"https://evil.example")]
    )
    connected, _close_code = await communicator.connect()
    assert not connected


def test_ping_pong_roundtrip():
    asyncio.run(_ping_pong_session())


def test_unknown_type_is_rejected_gracefully():
    asyncio.run(_unknown_type_session())


def test_invalid_json_rejected():
    asyncio.run(_invalid_json_session())


def test_foreign_origin_is_rejected():
    asyncio.run(_foreign_origin_session())
