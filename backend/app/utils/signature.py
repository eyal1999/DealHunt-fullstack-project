import hashlib, hmac

def make_signature(params: dict, secret: str, algo: str = "md5") -> str:
    """
    1) Sort params by key (ASCII)
    2) Concatenate secret + key1+val1 + key2+val2 + … + secret
    3) SHA256 → hex uppercase
    """
    items = sorted(params.items(), key=lambda kv: kv[0])
    raw = secret + "".join(f"{k}{v}" for k, v in items) + secret
    if algo == "md5":
        return hashlib.md5(raw.encode("utf-8")).hexdigest().upper()
    if algo == "hmac":
        return hmac.new(
            secret.encode(), raw.encode(), hashlib.md5
        ).hexdigest().upper()
    raise ValueError("Unsupported algo")