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
    # 디버깅: 요청 정보 로깅
    raw_path = event.get("rawPath", "N/A")
    http_method = event.get("requestContext", {}).get("http", {}).get("method", "N/A")
    print(f"[HANDLER] 요청: {http_method} {raw_path}")
    print(f"[HANDLER] 등록된 라우트 수: {len(app.routes)}")
    
    # rawPath와 requestContext.http.path 통일
    if "rawPath" in event:
        raw = event["rawPath"]
        rc = event.get("requestContext", {}).get("http", {})
        if rc.get("path") != raw:
            event["requestContext"]["http"]["path"] = raw
        print(f"[HANDLER] 경로 통일: {raw} -> {event['requestContext']['http']['path']}")
    
    try:
        result = mangum_handler(event, context)
        print(f"[HANDLER] 응답 상태: {result.get('statusCode', 'N/A')}")
        return result
    except Exception as e:
        print(f"[HANDLER] 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        raise
