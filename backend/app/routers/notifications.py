import hashlib, hmac
from fastapi import APIRouter, Request, HTTPException
from starlette.responses import JSONResponse
from app.config import settings   # put VERIFY_TOKEN in .env

router = APIRouter(prefix="/ebay/webhooks")

@router.get("/account-deletion")
async def account_deletion_challenge(request: Request):
    code = request.query_params.get("challenge_code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing challenge_code")

    data = code + settings.ebay_verify_token + str(request.url).split("?")[0]
    response_hash = hashlib.sha256(data.encode()).hexdigest()
    return JSONResponse({"challengeResponse": response_hash})
