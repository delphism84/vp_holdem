# 고객 개발자 안내: m3u8-player.net 재생 이슈 — 서버 로그·원인 추정

**대상:** `stream.kingofzeusfin.com` HLS를 [m3u8-player.net](https://m3u8-player.net/) 에서 재생할 때 실패하는 사례  
**비교 기준:** [livepush.io HLS 테스트 플레이어](https://livepush.io/hlsplayer/index.html) 에서는 동일 URL 정상 재생  
**작성 목적:** 제3자 플레이어(hls.js 기반 추정)와의 호환성 이슈를 서버 로그로 뒷받침하고, 인프라 측 조치와 고객(또는 플랫폼) 측 확인 포인트를 구분하기 위함

---

## 1. 결론 요약

- 동일 **m3u8 URL**에 대해 **서버는 `200`으로 매니페스트·세그먼트를 정상 제공**하는 경우가 대부분이며, **404**는 플레이리스트에 없는 **오래된 세그먼트 번호**를 요청할 때 발생(라이브 롤링·정상 동작).
- nginx 액세스 로그상 **m3u8-player.net(Referer) 트래픽**과 **livepush.io(Referer) 트래픽**의 HTTP 패턴이 **다름**(폴링 간격, Range 사용 등).
- **클라이언트 측 차이**(hls.js·MSE·Range 전략)만으로 설명되지 않는 실패가 있음: **TS 세그먼트가 키프레임(IDR)에서 끊기지 않으면** 브라우저 MSE가 `appendBuffer` 단계에서 실패할 수 있음(§3 참고). 이 경우 **원본 인코딩·RTMP 키프레임 표시·GOP** 점검이 우선이다.
- [m3u8-player.net FAQ](https://m3u8-player.net/)에서도 재생 실패 시 CORS·포맷·네트워크 등 **클라이언트 측 확인**을 안내함.
- **서버(SRS/nginx)는 안정 서빙을 위해 추가 튜닝을 적용한 상태**(세그먼트·윈도우, m3u8/ts Range 완화, CORS/CORP, 304 방지 등). SRS는 `hls_wait_keyframe on` 이어도 **퍼블리셔 FLV의 키프레임 비트·타임스탬프**가 어긋나면 TS 경계가 IDR과 일치하지 않을 수 있다.

---

## 2. nginx 액세스 로그에서 관측된 차이 (동일 클라이언트 IP·동일 스트림 예시)

실제 로그 형식(예):

```text
$remote_addr - - [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
```

### 2.1 m3u8-player.net (Referer: `https://m3u8-player.net/`)

- **`.m3u8`**: 짧은 시간에 **동일 URL에 대한 `200` 요청이 과다** (폴링이 비정상적으로 촘촘한 구간 관측).
- **`.ts`**: **`206 Partial Content` 비중이 큼** — Range 요청으로 **조각만 수신**하는 패턴.  
  같은 세그먼트에 대해 **큰 바이트(예: ~200KB+)와 매우 작은 바이트(예: 수 KB)** 가 연속해 찍히는 경우도 있음.
- **404**: 오래된 세그먼트 재요청 등과 함께 **다수 관측 가능** (플레이리스트·버퍼와 동기가 어긋날 때 흔함).

**의미:** MSE/hls.js 조합에서 **Range 기반 로딩·재시도**가 실패하거나, **재생기가 플레이리스트 갱신과 세그먼트 선택을 안정적으로 맞추지 못하는** 전형적 패턴과 맞닿아 있음.

### 2.2 livepush.io (Referer: `https://livepush.io/`)

- **`.m3u8`**: 대략 **1~2초 간격**의 `200` 갱신에 가까운 패턴.
- **`.ts`**: 대부분 **`200` + 한 번에 전체 세그먼트 크기(예: ~250KB 전후)** 수준으로 수신.

**의미:** 동일 원본 스트림에 대해 **다운로드·버퍼링 전략이 다름**. 서버가 한쪽만 차별하지 않는 한, **플레이어 구현 차이**로 해석하는 것이 자연스러움.

---

## 3. 브라우저 MSE 오류와 TS 세그먼트 독립성 (서버 검증)

일부 플레이어 콘솔에 다음과 유사한 메시지가 보일 수 있다.

```text
video append ... failed for segment #N in playlist ... table11_01.m3u8
```

**의미:** hls.js가 **MSE `SourceBuffer`에 세그먼트를 붙이는 단계**에서 실패한 것이다. HTTP `200`이어도 **조각 단독으로 H.264가 디코딩 불가**이면 발생할 수 있다.

**서버에서의 확인 방법(예시):**

1. 플레이리스트에 나온 **`.ts` URL**을 그대로 내려받는다.
2. **첫 비디오 패킷이 키프레임인지** 확인한다. (ffprobe로 `flags=K__` 여부 등)
3. **해당 `.ts`만** `ffmpeg -i seg.ts -f null -` 로 디코드해 본다.  
   - 세그먼트 `0`은 통과하는데 `1` 이후만 실패·`non-existing PPS`·`no frame` 이 반복되면, **세그먼트가 IDR로 시작하지 않거나 SPS/PPS 맥락이 끊긴** 전형적 패턴이다.

**권장 대응(인코더·업로더):**

| 항목 | 설명 |
|------|------|
| GOP / 키프레임 | **Closed GOP**, 키프레임 간격이 **SRS `hls_fragment`(초)** 와 맞도록 설정(예: 20fps·1초 GOP면 `keyint=20`, `min-keyint=20`, `scenecut=0` 등). |
| SPS/PPS | IDR 앞에 **파라미터 세트가 반복**되도록 x264/인코더에서 `repeat-headers` 등 동등 옵션 검토. |
| 검증 | 배포 후 **여러 세그먼트 파일의 첫 비디오 패킷**이 키프레임인지 샘플링. |

**참고:** fMP4 기반 HLS(`hls_use_fmp4`)는 **SRS 빌드·설정에 따라 비활성**일 수 있다. TS 경로를 쓰는 한 **원본 비트스트림 정합성**이 재생 호환의 핵심이다.

---

## 4. 상태코드 집계 예시 (최근 로그 샘플 기준, 참고용)

동일 Referer 필터로 최근 수천 줄을 요약했을 때(환경·시간대에 따라 수치는 변동):

| Referer | 대략적 비고 |
|---------|-------------|
| m3u8-player.net | `200` 외에 **`206`·`404` 비중이 상대적으로 큼** |
| livepush.io | **`304` 포함**, `.ts`는 **`200` 중심** |

※ 정확한 비율은 장애 시각의 로그 샘플을 첨부해 산출하는 것을 권장.

---

## 5. 원본 스트림(SRS)·엣지(nginx) 측 적용한 완화 (이미 배포)

고객사 인프라에서 **지연 증가를 감수하고 안정성을 올리는** 방향으로 조정됨:

| 구분 | 조치 요지 |
|------|-----------|
| **SRS** | `min_latency off`, `hls_wait_keyframe on`, `hls_fragment`·`hls_window`·`hls_dispose`, `max_connections` 등 |
| **nginx** | `.m3u8`/`.ts`에 `max_ranges 0`(가능한 한 **전체 `200`**) CORS/CORP, `etag`/`if_modified_since` 끔, `send_timeout` 연장, 스트림 도메인 `gzip off` 등 |

**실패 유형별로:** HTTP·CORS는 nginx 로그로, **`appendBuffer` / `MEDIA_ERROR`** 는 §3의 **TS·키프레임·인코딩**을 함께 본다.

---

## 6. 고객(또는 m3u8-player.net 운영) 개발자에게 요청할 확인 사항

1. **브라우저 개발자 도구**  
   - Network: 실패 구간의 **요청 URL**, **status**(특히 `206`/`404`/`CORS` 오류), **Initiator**  
   - Console: hls.js **`MEDIA_ERROR` / `NETWORK_ERROR` / 파싱 오류** 메시지
2. **사용 중인 hls.js 버전** 및 **`xhrSetup` / `fetchSetup` / Range 관련 옵션**  
   - 서버가 전체 파일을 `200`으로 주더라도 클라이언트가 **불필요한 Range 재시도**를 하면 패턴이 달라질 수 있음.
3. **동일 URL을 livepush·VLC와 교차 검증**  
   - 원인 분리: **원본 인코딩 문제 vs 특정 웹 플레이어만 실패**.
4. **콘솔에 `append` / `MEDIA_ERROR` 가 보이면**  
   - §3 절차로 **세그먼트 단독 디코딩·첫 패킷 키프레임** 여부를 확인하고, 인코더 GOP·헤더 반복 설정을 검토.

---

## 7. 전달용 한 줄 멘트 (고객 PM/개발)

> 동일 HLS URL에 대해 nginx 로그상 **livepush는 `.ts`를 주로 `200` 전체 다운로드**하는 반면, **m3u8-player.net은 `206`(Range)와 촘촘한 `.m3u8` 폴링**이 두드러질 수 있어, **플레이어·hls.js 동작 차이**를 먼저 의심할 수 있다. 다만 **`video append failed` 등 MSE 단계 오류**가 있으면 **TS가 IDR에서 끊기지 않은 원본 인코딩 이슈**를 함께 점검해야 한다. 서버는 CORS·Range·타임아웃 등 **안정 서빙**을 이미 완화한 상태다.

---

## 8. 참고 링크

- [m3u8-player.net — 재생 실패 FAQ (CORS·포맷 등)](https://m3u8-player.net/)
- [livepush.io — HLS 테스트 플레이어](https://livepush.io/hlsplayer/index.html)
