import hashlib
import hmac
from datetime import datetime
import pytz


def timestamp_shanghai() -> str:
    """Return current time in Asia/Shanghai formatted for AliExpress."""
    dt = datetime.now(pytz.timezone("Asia/Shanghai"))
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def make_signature(params: dict[str, str], secret: str, algo: str = "md5") -> str:
    """
    AliExpress Affiliate signature algorithm.

    MD5 variant:  secret + (key + value) + secret  → MD5 → upper hex.
    HMAC‑MD5 variant: HMAC(secret, key=value…)
    """
    sorted_items = sorted(params.items(), key=lambda kv: kv[0])
    plain = secret + "".join(f"{k}{v}" for k, v in sorted_items) + secret

    if algo.lower() == "hmac":
        return hmac.new(secret.encode(), plain.encode(), hashlib.md5).hexdigest().upper()
    return hashlib.md5(plain.encode()).hexdigest().upper()
