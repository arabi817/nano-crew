# 시험용 서버: 브라우저가 옛 파일을 기억하지 않게 '저장 금지' 표시를 붙여서 보내요.
# 사용: python tools/devserver.py 8780 .
import functools
import http.server
import sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8780
root = sys.argv[2] if len(sys.argv) > 2 else '.'
handler = functools.partial(NoCache, directory=root)
print(f'Nano Crew test server: http://localhost:{port}  (close this window to stop)')
http.server.ThreadingHTTPServer(('', port), handler).serve_forever()
