# 매일 N3

JLPT N3 일본어를 매일 조금씩 공부하는 개인 학습 사이트.
모든 한자에 후리가나, 모든 일본어에 TTS, 듀오링고식 게임 요소(스트릭·XP·하트·콤보·레벨·업적)가 들어 있다.

## 빠르게 시작

```bash
npm install        # kuromoji(후리가나 생성용) 설치
npm run build      # data → build/data.json → dist/index.html
npm run dev        # 빌드 후 http://localhost:5173 에서 확인
```

결과물은 `dist/index.html` 한 장이다. 서버 없이 파일을 바로 열어도 동작한다.

## 폴더 구조

```
src/index.html          앱 전체(HTML·CSS·JS). /*DATA*/ 자리에 데이터가 들어간다
scripts/build-data.js   원본 데이터 + 한국어 뜻 + 문법 원고 → build/data.json
                        (kuromoji로 예문 후리가나 자동 생성, 읽기 보정은 POST 배열)
scripts/bundle.js       src/index.html + build/data.json → dist/index.html
data/source/            공개 데이터 원본 (N3 어휘 CSV, 한자 데이터)
data/ko/v0~v3.txt       어휘 한국어 뜻  —  "번호|뜻"  (번호 = vocab_raw.json 순서)
data/ko/kanji.txt       한자 훈음        —  "한자|훈음"
data/grammar/g*.txt     문법 원고 (아래 형식)
data/third_party/       데이터 라이선스(MIT)
.github/workflows/      main 브랜치에 push하면 GitHub Pages로 자동 배포
```

## 콘텐츠 수정하는 법

**단어 뜻 고치기** — `data/ko/v*.txt`에서 해당 줄의 뜻만 바꾸고 `npm run build`.

**문법 추가/수정** — `data/grammar/`의 txt 파일. 파일을 새로 만들면 이름순으로 뒤에 붙는다.

```
## ～おかげで
M: ~덕분에                       ← 의미
C: 명사+の ＋ おかげで             ← 접속
E: 좋은 결과가 생긴 원인을 …       ← 설명
S: 薬の[[おかげで]]、熱が下がった。|약 덕분에 열이 내렸다.   ← 예문|번역
```

`[[ ]]`로 감싼 부분은 예문에서 강조되고, 문법 퀴즈의 빈칸이 된다(한 문장에 하나만 쓰면 퀴즈로 출제됨).
후리가나는 자동으로 달린다. 읽기가 틀리면 `scripts/build-data.js`의 `POST` 배열에
`['一{いち}人{にん}', '一人{ひとり}']`처럼 보정 규칙을 추가한다.

## 배포

- **GitHub Pages**: 저장소 Settings → Pages → Source를 "GitHub Actions"로 설정하고 main에 push.
- **Netlify / Vercel / Cloudflare Pages**: Build command `npm run build`, Output directory `dist`.

## 저장 방식

학습 기록은 브라우저 `localStorage`(키 `maeil-n3-v1`)에 저장된다. 기기 간 동기화는 아직 없다.

## 데이터 출처

- N3 어휘: [jamsinclair/open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) (MIT)
- 한자: [davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data) (MIT)
- 한국어 뜻·훈음·문법 해설·예문: 직접 작성
- 모의고사: 실제 기출이 아닌 JLPT 유형 연습 문제(매번 자동 출제)
