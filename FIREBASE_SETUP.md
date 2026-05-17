# Firebase 설정

이 앱은 Firebase Realtime Database REST API를 사용합니다.

## 1. Realtime Database 만들기

Firebase 콘솔에서 `bingo503` 프로젝트를 열고 `Build > Realtime Database`를 생성합니다.

앱 코드의 기본 주소:

```txt
https://bingo503-default-rtdb.firebaseio.com
```

만약 콘솔에 표시되는 Database URL이 다르면 `src/App.jsx`의 `DB_URL` 값을 그 주소로 바꿔주세요.

Vercel에서는 더 안전하게 환경 변수로 넣을 수도 있습니다.

```txt
VITE_FIREBASE_DATABASE_URL=https://bingo503-default-rtdb.firebaseio.com
```

## 2. 테스트용 규칙

처음 테스트할 때는 `database.rules.json` 내용을 Realtime Database Rules에 붙여 넣으면 됩니다.

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

이 규칙은 프로토타입용입니다. 누구나 방 데이터를 읽고 쓸 수 있으므로 실제 공개 운영 전에는 Firebase Authentication과 방장 권한 검증을 추가하는 것이 좋습니다.

## 3. Vercel

Vercel 프로젝트는 GitHub 저장소와 연결하면 됩니다.

권장 설정:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

환경 변수는 현재 버전에서는 필요하지 않습니다.
