# Food Bingo

7개 나라 음식 150개를 사용하는 실시간 멀티플레이 빙고 게임입니다.

## 기능

- 방 생성 및 방 코드 참가
- 최대 50명 참가
- 각 플레이어가 나라별 음식 비율을 선택해 5x5 빙고판 생성
- 방장이 음식을 하나씩 랜덤 추첨
- 가로, 세로, 대각선 한 줄 완성 시 자동 승리 처리
- Firebase Realtime Database 기반 동기화
- Firebase 다운로드를 줄이기 위한 Realtime Database 스트리밍 수신

## 개발 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

## Firebase

자세한 설정은 `FIREBASE_SETUP.md`를 확인하세요.

## Firebase 사용량 절약

게임방에 들어간 뒤에는 주기적으로 방 전체를 다시 받지 않고, Firebase 스트리밍으로 변경된 데이터만 받습니다. 스트리밍을 지원하지 않는 브라우저에서는 12초 간격 백업 동기화로 동작합니다.
