import os
import sys

print(f"[INIT] Python: {sys.version_info.major}.{sys.version_info.minor}")

try:
    from app.main import app
    print(f"[INIT] app 로드 완료, 라우트: {len(app.routes)}개")
except Exception as e:
    print(f"[INIT] app import 실패: {e}")
    raise

from mangum import Mangum

mangum_handler = Mangum(app, lifespan="off")


def handler(event, context):
    """
    Lambda Function URL handler.
    
    Lambda Function URL v2 이벤트에서 requestContext.http.path는
    trailing slash를 제거하지만, rawPath는 원본을 유지함.
    두 값을 통일하여 FastAPI 라우팅이 정상 동작하도록 보장.
    """
    # rawPath와 requestContext.http.path 통일
    if "rawPath" in event:
        raw = event["rawPath"]
        rc = event.get("requestContext", {}).get("http", {})
        if rc.get("path") != raw:
            event["requestContext"]["http"]["path"] = raw
    
    return mangum_handler(event, context)
