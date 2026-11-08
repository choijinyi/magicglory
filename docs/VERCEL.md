# Vercel 운영 배포

운영 주소: https://magicglory.vercel.app

프로젝트는 `choijinyis-projects/magicglory`이며 Node.js 24 Functions와 Turso SQLite를 사용합니다. 함수와 데이터베이스는 도쿄 리전으로 연결했습니다. 이미지·영상 포스터는 Vercel의 정적 파일로 제공하며 원본 홈페이지의 이미지 서버에 의존하지 않습니다. 원본의 일부 영상에서 썸네일을 받을 수 없는 경우 안내 이미지와 YouTube 보기 링크를 제공합니다.

## 검증

- 로컬 테스트 14개 통과.
- 운영 서버의 상태 확인 API 정상.
- 홈페이지 공연영상 썸네일 8개와 갤러리 이미지 8개 로딩 확인.
- 운영 관리자 로그인, 임시 게시글 등록·조회·삭제 및 삭제 후 404 확인.

## 환경변수

`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`은 Vercel Marketplace의 Turso 연결로 설정합니다. 관리자 설정에는 `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_PASSWORD_SALT`가 필요하며 Production의 Secret 변수로 보관합니다. 비밀번호 원문과 인증 데이터베이스는 저장소에 포함하지 않습니다. Vercel용 관리자 해시와 솔트는 독립적으로 생성했습니다.

Turso는 Starter 무료 요금제입니다. 현재 연결된 환경은 Production과 Development이며 Preview에는 연결하지 않았습니다.

## 개발 및 배포

```powershell
npm install
vercel link --yes --project magicglory --scope choijinyis-projects
vercel env pull .env.local --yes --scope choijinyis-projects
npm run db:migrate
npm test
```

Vercel Functions는 `api/index.mjs`가 담당합니다. 모든 동적 경로는 이 함수로 연결하고 이미지·폰트·CSS 등은 정적 파일로 제공합니다. 데이터베이스 스키마 변경은 `migrations/`와 명시적인 마이그레이션 명령으로 적용합니다. 요청 처리 중에는 테이블을 생성하지 않습니다.

CLI 업로드는 원본 미디어가 커서 Vercel Hobby의 소스 업로드 한도를 초과합니다. Python/Pillow가 설치된 Windows 작업 컴퓨터에서는 다음 명령으로 임시 업로드 디렉터리를 준비할 수 있습니다.

```powershell
python scripts/prepare-vercel-upload.py
```

이 스크립트는 원본 파일을 보존하고 배포용 큰 JPEG/PNG의 크기만 최적화합니다. 출력한 디렉터리를 사용해 배포합니다.

```powershell
vercel deploy "출력된 디렉터리" --prod --skip-domain --scope choijinyis-projects
vercel promote "검증한 배포 URL" --scope choijinyis-projects
```

## 후이즈 도메인 연결

현재 `magicglory.com`과 `www.magicglory.com`의 A 레코드는 `211.32.117.87`이고, 네임서버는 `ns1.whoisdomain.kr`부터 `ns4.whoisdomain.kr`까지입니다. 이 값은 2026-11-08에 실제 조회했으며 아직 변경하지 않았습니다.

1. Vercel 프로젝트 Settings → Domains에서 `magicglory.com`, `www.magicglory.com`을 추가합니다.
2. 후이즈에서 도메인 활용/부가서비스 → 네임서버 고급설정으로 들어가 해당 도메인을 선택합니다.
3. 웹사이트용 A/CNAME 레코드를 Vercel의 추천값으로 변경합니다. 기존 메일용 MX/TXT 레코드는 유지합니다.
4. Vercel에서 도메인 설정과 HTTPS 인증서 발급을 확인합니다.

현재 프로젝트 기준으로 조회된 추천값은 다음과 같습니다. 실제 적용 시에는 Vercel Domains 화면의 최신 추천값을 우선합니다.

| 레코드 | 이름 | 값 |
| --- | --- | --- |
| A | 루트 도메인 | 216.198.79.1 |
| A | 루트 도메인 | 64.29.17.1 |
| CNAME | www | bcd2971a32526ea2.vercel-dns-017.com. |

도메인 연결 안내: https://vercel.com/docs/domains/working-with-domains/add-a-domain

후이즈 DNS 안내: https://domain.whois.co.kr/ns_service/index.php
