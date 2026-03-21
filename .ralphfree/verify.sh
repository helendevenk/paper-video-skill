#!/bin/bash
# Paper-Video 视频质量验证脚本
#
# Usage: bash .ralphfree/verify.sh output/video.mp4
#
# 检查项：文件存在、格式正确、时长合理、无损坏

VIDEO="${1:-}"
if [ -z "$VIDEO" ]; then
  echo "Usage: bash .ralphfree/verify.sh <video.mp4>"
  exit 1
fi

PASS=0
FAIL=0

check() {
  if [ $1 -eq 0 ]; then
    echo "✅ $2"
    PASS=$((PASS + 1))
  else
    echo "❌ $2"
    FAIL=$((FAIL + 1))
  fi
}

# 1. 文件存在且非空
test -s "$VIDEO"
check $? "文件存在且非空: $VIDEO"

if [ ! -s "$VIDEO" ]; then
  echo "Results: $PASS passed, $FAIL failed"
  exit 1
fi

# 2. ffprobe 能解析
PROBE=$(ffprobe -v quiet -print_format json -show_streams "$VIDEO" 2>/dev/null)
test $? -eq 0
check $? "ffprobe 解析成功"

# 3. 提取视频流信息
WIDTH=$(echo "$PROBE" | python3 -c "import sys,json; s=json.load(sys.stdin); v=[x for x in s['streams'] if x['codec_type']=='video'][0]; print(v['width'])" 2>/dev/null)
HEIGHT=$(echo "$PROBE" | python3 -c "import sys,json; s=json.load(sys.stdin); v=[x for x in s['streams'] if x['codec_type']=='video'][0]; print(v['height'])" 2>/dev/null)
CODEC=$(echo "$PROBE" | python3 -c "import sys,json; s=json.load(sys.stdin); v=[x for x in s['streams'] if x['codec_type']=='video'][0]; print(v['codec_name'])" 2>/dev/null)
PIX_FMT=$(echo "$PROBE" | python3 -c "import sys,json; s=json.load(sys.stdin); v=[x for x in s['streams'] if x['codec_type']=='video'][0]; print(v['pix_fmt'])" 2>/dev/null)
DURATION=$(echo "$PROBE" | python3 -c "import sys,json; s=json.load(sys.stdin); v=[x for x in s['streams'] if x['codec_type']=='video'][0]; print(v.get('duration','0'))" 2>/dev/null)
FPS=$(echo "$PROBE" | python3 -c "import sys,json; s=json.load(sys.stdin); v=[x for x in s['streams'] if x['codec_type']=='video'][0]; r=v['r_frame_rate']; n,d=r.split('/'); print(int(n)//int(d))" 2>/dev/null)

# 4. 分辨率
test "$WIDTH" = "1920" -a "$HEIGHT" = "1080"
check $? "分辨率: ${WIDTH}x${HEIGHT} (期望 1920x1080)"

# 5. 编码
test "$CODEC" = "h264"
check $? "编码: $CODEC (期望 h264)"

# 6. Pixel format (yuv420p 或 yuvj420p 都可以)
echo "$PIX_FMT" | grep -qE "^yuv(j)?420p$"
check $? "Pixel format: $PIX_FMT (期望 yuv420p/yuvj420p)"

# 7. FPS
test "$FPS" = "30"
check $? "帧率: ${FPS}fps (期望 30)"

# 8. 时长合理 (> 5s)
DURATION_INT=$(echo "$DURATION" | python3 -c "import sys; print(int(float(sys.stdin.read().strip())))" 2>/dev/null || echo "0")
test "$DURATION_INT" -gt 5
check $? "时长: ${DURATION_INT}s (期望 > 5s)"

# 9. 文件大小合理 (> 100KB)
SIZE=$(stat -f%z "$VIDEO" 2>/dev/null || stat -c%s "$VIDEO" 2>/dev/null || echo "0")
SIZE_KB=$((SIZE / 1024))
test "$SIZE_KB" -gt 100
check $? "文件大小: ${SIZE_KB}KB (期望 > 100KB)"

# Summary
echo ""
echo "Results: $PASS passed, $FAIL failed"
echo "Video: $VIDEO | ${WIDTH}x${HEIGHT} | ${FPS}fps | $CODEC | $PIX_FMT | ${DURATION_INT}s | ${SIZE_KB}KB"

if [ $FAIL -gt 0 ]; then
  exit 1
else
  exit 0
fi
