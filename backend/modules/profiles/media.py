"""Where a profile's picture and banner live in the bucket, and what may be confirmed.

`POST /bucket/upload-url` names objects
`<routing prefix>/users/0/<format>/<sub>_<timestamp>_<uuid>`. The confirm step
accepts only a name of that shape under the caller's own `sub`, so nobody can
point their profile at another person's object or at an unrelated one.
"""

import re
from typing import Literal

from backend.core.configs.config import config
from backend.modules.media.models import PROFILE_MEDIA_ENTITY_ID, EntityType, MediaFormat

ProfileMediaSlot = Literal["picture", "banner"]

# The upload format each slot is signed with.
SLOT_FORMATS: dict[ProfileMediaSlot, MediaFormat] = {
    "picture": MediaFormat.profile,
    "banner": MediaFormat.banner,
}

# What follows `<sub>_` in an object name: a UTC timestamp and a uuid hex.
_SUFFIX = re.compile(r"\d{8}T\d{6}_[0-9a-f]{32}")


def is_own_upload(slot: ProfileMediaSlot, sub: str, filename: str) -> bool:
    prefix = (
        f"{config.ROUTING_PREFIX}/{EntityType.users.value}/{PROFILE_MEDIA_ENTITY_ID}/"
        f"{SLOT_FORMATS[slot].value}/{sub}_"
    )
    return filename.startswith(prefix) and _SUFFIX.fullmatch(filename[len(prefix) :]) is not None
