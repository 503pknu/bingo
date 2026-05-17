import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChefHat,
  Clipboard,
  Crown,
  DoorOpen,
  Loader2,
  Play,
  RefreshCw,
  Shuffle,
  Trophy,
  Users,
  Utensils,
} from "lucide-react";

const DB_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://bingo503-default-rtdb.firebaseio.com";
const PLAYER_KEY = "food_bingo_player";
const ROOM_KEY = "food_bingo_room";
const MAX_PLAYERS = 50;
const BOARD_SIZE = 25;
const STREAM_FALLBACK_MS = 12000;

const COUNTRIES = [
  { id: "korea", name: "한국", color: "#d64550" },
  { id: "china", name: "중국", color: "#d99020" },
  { id: "japan", name: "일본", color: "#4f7acb" },
  { id: "france", name: "프랑스", color: "#6b64c9" },
  { id: "usa", name: "미국", color: "#2f8a61" },
  { id: "uk", name: "영국", color: "#7b6a58" },
  { id: "italy", name: "이탈리아", color: "#c44783" },
];

const FOOD_POOL = [
  ...makeFoods("korea", [
    "김치찌개", "비빔밥", "불고기", "삼겹살", "떡볶이", "김밥", "잡채", "갈비찜", "냉면", "순두부찌개", "설렁탕",
    "감자탕", "닭갈비", "해물파전", "부대찌개", "된장찌개", "보쌈", "족발", "삼계탕", "호떡", "닭강정", "쭈꾸미볶음",
  ]),
  ...makeFoods("china", [
    "베이징덕", "마파두부", "딤섬", "샤오롱바오", "훠궈", "탄탄면", "짜장면", "탕수육", "깐풍기", "마라샹궈", "마라탕",
    "쿵파오치킨", "양저우볶음밥", "동파육", "완탕면", "춘권", "차슈", "사천닭볶음", "어향가지", "홍소육", "유린기", "팔보채",
  ]),
  ...makeFoods("japan", [
    "초밥", "라멘", "돈카츠", "우동", "소바", "규동", "오코노미야키", "타코야키", "가라아게", "샤부샤부", "스키야키",
    "텐동", "가츠동", "오야코동", "미소시루", "야키소바", "오니기리", "에비후라이", "나베", "모찌", "교자", "카레라이스",
  ]),
  ...makeFoods("france", [
    "크루아상", "라타투이", "부야베스", "코코뱅", "비프 부르기뇽", "키슈 로렌", "에스카르고", "크렘 브륄레", "마카롱", "수플레",
    "니수아즈 샐러드", "그라탱 도피누아", "콩피 드 카나르", "갈레트", "프렌치 어니언 수프", "타르트 타탱", "크레페", "파테",
    "브리오슈", "무스 오 쇼콜라", "카술레", "스테이크 프리트",
  ]),
  ...makeFoods("usa", [
    "햄버거", "핫도그", "바비큐 립", "맥앤치즈", "버팔로윙", "클램 차우더", "애플파이", "팬케이크", "프라이드치킨", "시저샐러드",
    "미트로프", "칠리 콘 카르네", "잠발라야", "검보", "랍스터롤", "필리 치즈스테이크", "코브 샐러드", "콘브레드", "브라우니",
    "베이글", "나초", "풀드포크",
  ]),
  ...makeFoods("uk", [
    "피시 앤 칩스", "셰퍼드 파이", "비프 웰링턴", "선데이 로스트", "뱅어스 앤 매시", "요크셔 푸딩", "스카치 에그",
    "치킨 티카 마살라", "풀 잉글리시 브렉퍼스트", "스테이크 앤 에일 파이", "코티지 파이", "토드 인 더 홀", "버블 앤 스퀵",
    "콘월 페이스트리", "이튼 메스", "트라이플", "스티키 토피 푸딩", "스콘", "잉글리시 머핀", "플라우맨스 런치", "크럼펫",
  ]),
  ...makeFoods("italy", [
    "마르게리타 피자", "라자냐", "카르보나라", "리소토", "티라미수", "브루스케타", "뇨키", "라비올리", "오소부코", "아란치니",
    "카프레제 샐러드", "미네스트로네", "볼로네제 파스타", "페스토 파스타", "포카치아", "판나코타", "카놀리", "프로슈토 멜론",
    "칼초네", "폴렌타", "카초 에 페페",
  ]),
];

const DEFAULT_RATIOS = {
  korea: 20,
  china: 15,
  japan: 15,
  france: 10,
  usa: 15,
  uk: 10,
  italy: 15,
};

const FOOD_DECOR = ["🍔", "🍩", "🥕", "🧁", "🍉", "🌮", "🍤", "🥦", "🍓", "🥐", "🍕", "🍜"];

export default function App() {
  const [player, setPlayer] = useState(() => readStorage(PLAYER_KEY, makePlayer()));
  const [roomCode, setRoomCode] = useState(() => readStorage(ROOM_KEY, ""));
  const [room, setRoom] = useState(null);
  const [name, setName] = useState(player.name || "");
  const [joinCode, setJoinCode] = useState(roomCode || "");
  const [ratios, setRatios] = useState(DEFAULT_RATIOS);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const roomRef = useRef(room);

  useEffect(() => {
    writeStorage(PLAYER_KEY, player);
  }, [player]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    if (!roomCode) return undefined;
    writeStorage(ROOM_KEY, roomCode);
    let stopped = false;
    let stream = null;
    let fallbackTimer = null;

    async function tick() {
      try {
        const nextRoom = await fbGet(`rooms/${roomCode}`);
        if (!stopped) {
          setRoom(nextRoom || null);
          if (!nextRoom) setError("방을 찾을 수 없습니다. 방 코드를 다시 확인해주세요.");
        }
      } catch {
        if (!stopped) setError("Firebase 연결을 확인해주세요. Realtime Database가 켜져 있어야 합니다.");
      }
    }

    if ("EventSource" in window) {
      stream = new EventSource(`${DB_URL}/rooms/${roomCode}.json`);
      stream.addEventListener("put", (event) => {
        if (stopped) return;
        setRoom((current) => applyFirebaseStreamEvent(current, JSON.parse(event.data), "put"));
      });
      stream.addEventListener("patch", (event) => {
        if (stopped) return;
        setRoom((current) => applyFirebaseStreamEvent(current, JSON.parse(event.data), "patch"));
      });
      stream.onerror = () => {
        if (!stopped && !fallbackTimer) {
          stream.close();
          tick();
          fallbackTimer = window.setInterval(tick, STREAM_FALLBACK_MS);
        }
      };
    } else {
      tick();
      fallbackTimer = window.setInterval(tick, STREAM_FALLBACK_MS);
    }

    return () => {
      stopped = true;
      if (stream) stream.close();
      if (fallbackTimer) window.clearInterval(fallbackTimer);
    };
  }, [roomCode]);

  const players = useMemo(() => Object.values(room?.players || {}).sort(sortByJoinedAt), [room]);
  const me = room?.players?.[player.id] || null;
  const calledFoods = room?.calledFoods || [];
  const latestFood = calledFoods.length ? getFood(calledFoods.at(-1)) : null;
  const board = me?.board || [];
  const boardStatus = useMemo(() => buildBoardStatus(board, calledFoods), [board, calledFoods]);
  const isHost = room?.hostId === player.id;
  const canStart = isHost && room?.status === "lobby" && players.length >= 2 && players.every((item) => item.board?.length === BOARD_SIZE);
  const turnOrder = room?.turnOrder || [];
  const currentTurnId = room?.status === "playing" ? turnOrder[room?.turnIndex || 0] : "";
  const currentTurnPlayer = players.find((item) => item.id === currentTurnId) || null;
  const isMyTurn = room?.status === "playing" && currentTurnId === player.id && !room?.winner;
  const ratioTotal = Object.values(ratios).reduce((sum, value) => sum + Number(value || 0), 0);

  function clearAlerts() {
    setError("");
    setMessage("");
  }

  useEffect(() => {
    if (!room || !me || room.status !== "playing" || room.winner) return;
    if (boardStatus.hasBingo) {
      fbPatch(`rooms/${roomCode}`, {
        status: "finished",
        winner: {
          playerId: player.id,
          name: me.name,
          completedAt: now(),
          line: boardStatus.line,
        },
      }).catch(console.warn);
    }
  }, [boardStatus.hasBingo, boardStatus.line, me, player.id, room, roomCode]);

  async function createRoom() {
    clearAlerts();
    if (!name.trim()) return setError("이름을 입력해주세요.");
    setLoading(true);
    try {
      const code = await makeUniqueRoomCode();
      const nextPlayer = { ...player, name: name.trim() };
      const newRoom = {
        code,
        hostId: nextPlayer.id,
        status: "lobby",
        maxPlayers: MAX_PLAYERS,
        createdAt: now(),
        calledFoods: [],
        turnOrder: [],
        turnIndex: 0,
        round: 0,
        winner: null,
        players: {
          [nextPlayer.id]: buildRoomPlayer(nextPlayer),
        },
      };
      await fbPut(`rooms/${code}`, newRoom);
      setPlayer(nextPlayer);
      setRoomCode(code);
      setJoinCode(code);
      setRoom(newRoom);
      setMessage(`방 ${code}가 만들어졌습니다.`);
    } catch (err) {
      console.error(err);
      setError("방 생성에 실패했습니다. Firebase Realtime Database 생성 여부와 Rules를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    clearAlerts();
    const code = joinCode.trim().toUpperCase();
    if (!name.trim()) return setError("이름을 입력해주세요.");
    if (!/^\d{4}$/.test(code)) return setError("방 코드는 숫자 4자리입니다.");
    setLoading(true);
    try {
      const target = await fbGet(`rooms/${code}`);
      if (!target) return setError("존재하지 않는 방입니다.");
      const currentPlayers = Object.values(target.players || {});
      if (!target.players?.[player.id] && currentPlayers.length >= MAX_PLAYERS) {
        return setError("이 방은 이미 50명이 가득 찼습니다.");
      }
      const nextPlayer = { ...player, name: name.trim() };
      const roomPlayer = target.players?.[nextPlayer.id] || buildRoomPlayer(nextPlayer);
      await fbPatch(`rooms/${code}/players/${nextPlayer.id}`, {
        ...roomPlayer,
        name: nextPlayer.name,
        onlineAt: now(),
      });
      setPlayer(nextPlayer);
      setRoomCode(code);
      setRoom({ ...target, players: { ...(target.players || {}), [nextPlayer.id]: roomPlayer } });
      setMessage(`${code} 방에 참가했습니다.`);
    } catch (err) {
      console.error(err);
      setError("방 참가에 실패했습니다. Firebase Realtime Database 생성 여부와 Rules를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function saveBoard() {
    clearAlerts();
    if (!roomCode) return;
    if (room?.status !== "lobby") return setError("게임 시작 후에는 빙고판을 바꿀 수 없습니다.");
    if (ratioTotal !== 100) return setError("나라별 비율 합계가 100%가 되어야 합니다.");
    const nextBoard = generateBoard(ratios);
    await fbPatch(`rooms/${roomCode}/players/${player.id}`, {
      board: nextBoard,
      ratios,
      ready: true,
      updatedAt: now(),
    });
    setMessage("내 음식 빙고판이 저장되었습니다.");
  }

  async function startGame() {
    clearAlerts();
    if (!canStart) return;
    await fbPatch(`rooms/${roomCode}`, {
      status: "playing",
      calledFoods: [],
      turnOrder: shuffle(players.map((item) => item.id)),
      turnIndex: 0,
      round: 1,
      winner: null,
      startedAt: now(),
    });
  }

  async function selectFood(foodId) {
    clearAlerts();
    const current = roomRef.current;
    if (!current || current.status !== "playing" || current.winner) return;
    const order = current.turnOrder?.length ? current.turnOrder : shuffle(Object.keys(current.players || {}));
    const activePlayerId = order[current.turnIndex || 0];
    if (activePlayerId !== player.id) {
      setError("아직 내 차례가 아닙니다.");
      return;
    }
    const called = current.calledFoods || [];
    if (called.includes(foodId)) {
      setError("이미 선택된 음식입니다. 다른 음식을 골라주세요.");
      return;
    }
    if (!current.players?.[player.id]?.board?.includes(foodId)) return;
    const turn = nextTurnState(order, current.turnIndex || 0, current.round || 1, current.players || {});
    await fbPatch(`rooms/${roomCode}`, {
      calledFoods: [...called, foodId],
      turnOrder: turn.turnOrder,
      turnIndex: turn.turnIndex,
      round: turn.round,
      lastSelectedFood: foodId,
      lastSelectedBy: player.id,
      lastSelectedByName: me?.name || player.name,
      lastSelectedAt: now(),
    });
  }

  async function resetRoom() {
    clearAlerts();
    if (!isHost) return;
    await fbPatch(`rooms/${roomCode}`, {
      status: "lobby",
      calledFoods: [],
      turnOrder: [],
      turnIndex: 0,
      round: 0,
      winner: null,
      resetAt: now(),
    });
  }

  function leaveRoom() {
    writeStorage(ROOM_KEY, "");
    setRoomCode("");
    setJoinCode("");
    setRoom(null);
    clearAlerts();
  }

  return (
    <main className="app">
      <FoodDecor />
      <header className="topbar">
        <button className="brand" type="button" onClick={leaveRoom}>
          <span><Utensils size={22} /></span>
          <strong><small>WORLD</small> Food Bingo</strong>
        </button>
        {room && (
          <div className="room-chip">
            <span>방 코드</span>
            <b>{roomCode}</b>
            <button type="button" title="방 코드 복사" onClick={() => copyText(roomCode)}>
              <Clipboard size={16} />
            </button>
          </div>
        )}
      </header>

      {error && <p className="alert error">{error}</p>}
      {message && <p className="alert">{message}</p>}

      {!roomCode || !room ? (
        <section className="entry">
          <div className="entry-copy">
            <span className="eyebrow"><ChefHat size={16} /> 7개 나라 음식 150개</span>
            <h1>음식으로 맞붙는 실시간 빙고</h1>
            <p>방을 만들거나 참가한 뒤, 각자 원하는 나라별 비율로 25칸 음식판을 만듭니다. 최소 2명부터 시작할 수 있고 최대 50명까지 같은 방에 들어올 수 있습니다.</p>
          </div>
          <div className="entry-panel">
            <label>
              플레이어 이름
              <input value={name} maxLength={16} onChange={(event) => setName(event.target.value)} placeholder="예: 민수" />
            </label>
            <button className="primary" type="button" disabled={loading} onClick={createRoom}>
              {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
              새 방 만들기
            </button>
            <div className="join-line">
              <input value={joinCode} inputMode="numeric" maxLength={4} onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="방 코드" />
              <button type="button" disabled={loading} onClick={joinRoom}>
                <DoorOpen size={18} />
                참가
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="game-layout">
          <aside className="side">
            <RoomSummary room={room} players={players} isHost={isHost} />
            <RatioPanel
              disabled={room.status !== "lobby"}
              ratios={ratios}
              total={ratioTotal}
              onChange={(countryId, value) => setRatios((current) => rebalanceRatios(current, countryId, Number(value)))}
              onRandom={() => setRatios(randomRatios())}
              onSave={saveBoard}
            />
            <PlayerList players={players} hostId={room.hostId} />
          </aside>

          <div className="board-zone">
            <div className="status-panel">
              <div>
                <span className="eyebrow"><Users size={16} /> {players.length}/{MAX_PLAYERS}명 접속</span>
                <h2>{statusText(room, players, currentTurnPlayer, player.id)}</h2>
                {latestFood ? (
                  <p className="latest">
                    선택된 음식 <b>{latestFood.name}</b>
                    <span style={{ "--country": countryOf(latestFood.countryId).color }}>{countryOf(latestFood.countryId).name}</span>
                  </p>
                ) : (
                  <p>게임이 시작되면 자기 차례에 빙고판에서 음식 하나를 클릭합니다.</p>
                )}
              </div>
              <div className="host-actions">
                {room.status === "lobby" && (
                  <button className="primary" type="button" disabled={!canStart} onClick={startGame}>
                    <Play size={18} />
                    게임 시작
                  </button>
                )}
                {room.status === "playing" && <span className={isMyTurn ? "turn-badge active" : "turn-badge"}>{isMyTurn ? "내 차례" : `${currentTurnPlayer?.name || "다음"} 차례`}</span>}
                {isHost && (
                  <button type="button" onClick={resetRoom}>
                    <RefreshCw size={18} />
                    다시 로비로
                  </button>
                )}
              </div>
            </div>

            {room.winner && (
              <div className="winner">
                <Trophy size={28} />
                <div className="winner-copy">
                  <span className="flower-burst" aria-hidden="true">✿ ❀ ✿</span>
                  <strong>{room.winner.name}님, 축하합니다!</strong>
                  <span>{lineText(room.winner.line)} 빙고 완성</span>
                </div>
              </div>
            )}

            <BingoBoard board={board} calledFoods={calledFoods} line={boardStatus.line} canSelect={isMyTurn} onSelect={selectFood} />

            <section className="called-panel">
              <h3>선택된 음식 {calledFoods.length}개</h3>
              <div className="called-list">
                {calledFoods.map((foodId) => {
                  const food = getFood(foodId);
                  const country = countryOf(food.countryId);
                  return (
                    <span key={foodId} style={{ "--country": country.color }}>
                      {food.name}
                    </span>
                  );
                })}
              </div>
            </section>
          </div>
        </section>
      )}
    </main>
  );
}

function RatioPanel({ disabled, ratios, total, onChange, onRandom, onSave }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>내 음식 비율</h2>
        <b className={total === 100 ? "good" : "bad"}>{total}%</b>
      </div>
      <div className="ratio-list">
        {COUNTRIES.map((country) => (
          <label key={country.id} style={{ "--country": country.color }}>
            <span>{country.name}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              disabled={disabled}
              value={ratios[country.id] || 0}
              onChange={(event) => onChange(country.id, event.target.value)}
            />
            <b>{ratios[country.id] || 0}%</b>
          </label>
        ))}
      </div>
      <div className="button-row">
        <button type="button" disabled={disabled} onClick={onRandom}>
          <Shuffle size={17} />
          랜덤 비율
        </button>
        <button className="primary" type="button" disabled={disabled || total !== 100} onClick={onSave}>
          <ChefHat size={17} />
          판 만들기
        </button>
      </div>
    </section>
  );
}

function FoodDecor() {
  return (
    <div className="food-decor" aria-hidden="true">
      {FOOD_DECOR.map((item, index) => (
        <span key={`${item}-${index}`}>{item}</span>
      ))}
    </div>
  );
}

function RoomSummary({ room, players, isHost }) {
  return (
    <section className="panel summary">
      <span className="eyebrow"><Crown size={16} /> {isHost ? "방장" : "참가자"}</span>
      <h2>{room.code}</h2>
      <p>{room.status === "lobby" ? "로비에서 판을 준비 중입니다." : room.status === "playing" ? "게임 진행 중입니다." : "게임이 끝났습니다."}</p>
      <div className="mini-stats">
        <strong>{players.length}<span>명</span></strong>
        <strong>{players.filter((item) => item.ready).length}<span>준비</span></strong>
      </div>
    </section>
  );
}

function PlayerList({ players, hostId }) {
  return (
    <section className="panel">
      <h2>참가자</h2>
      <div className="players">
        {players.map((item) => (
          <article key={item.id}>
            <b>{item.name}</b>
            {item.id === hostId && <span>방장</span>}
            <em className={item.ready ? "ready" : ""}>{item.ready ? "준비 완료" : "판 없음"}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

function BingoBoard({ board, calledFoods, line, canSelect, onSelect }) {
  if (!board.length) {
    return (
      <section className="empty-board">
        <ChefHat size={34} />
        <h2>아직 내 빙고판이 없습니다</h2>
        <p>왼쪽에서 나라별 음식 비율을 100%로 맞추고 판을 만들어주세요.</p>
      </section>
    );
  }

  return (
    <section className="bingo-board">
      {board.map((foodId, index) => {
        const food = getFood(foodId);
        const country = countryOf(food.countryId);
        const marked = calledFoods.includes(foodId);
        const winning = line?.includes(index);
        return (
          <button
            key={`${foodId}-${index}`}
            type="button"
            className={`${marked ? "marked" : ""} ${winning ? "winning" : ""}`}
            style={{ "--country": country.color }}
            disabled={!canSelect || marked}
            onClick={() => onSelect(foodId)}
          >
            <span>{country.name}</span>
            <strong>{food.name}</strong>
          </button>
        );
      })}
    </section>
  );
}

function makeFoods(countryId, names) {
  return names.map((name, index) => ({ id: `${countryId}_${index + 1}`, countryId, name }));
}

function generateBoard(ratios) {
  const counts = allocateCounts(ratios);
  const selected = [];
  for (const country of COUNTRIES) {
    const foods = FOOD_POOL.filter((food) => food.countryId === country.id);
    selected.push(...shuffle(foods).slice(0, counts[country.id]).map((food) => food.id));
  }
  return shuffle(selected).slice(0, BOARD_SIZE);
}

function allocateCounts(ratios) {
  const exact = COUNTRIES.map((country) => {
    const raw = ((ratios[country.id] || 0) / 100) * BOARD_SIZE;
    return { id: country.id, floor: Math.floor(raw), rest: raw - Math.floor(raw) };
  });
  let remaining = BOARD_SIZE - exact.reduce((sum, item) => sum + item.floor, 0);
  const counts = Object.fromEntries(exact.map((item) => [item.id, item.floor]));
  for (const item of [...exact].sort((a, b) => b.rest - a.rest)) {
    if (remaining <= 0) break;
    counts[item.id] += 1;
    remaining -= 1;
  }
  return counts;
}

function buildBoardStatus(board, calledFoods) {
  const marked = board.map((foodId) => calledFoods.includes(foodId));
  const lines = [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24],
    [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
    [0, 6, 12, 18, 24],
    [4, 8, 12, 16, 20],
  ];
  const line = lines.find((items) => items.every((index) => marked[index]));
  return { hasBingo: Boolean(line), line: line || null };
}

function statusText(room, players, currentTurnPlayer, myPlayerId) {
  if (room.winner) return `${room.winner.name}님이 빙고를 완성했습니다`;
  if (room.status === "lobby") {
    if (players.length < 2) return "최소 2명이 모이면 시작할 수 있습니다";
    return "모두 판을 만들면 방장이 시작할 수 있습니다";
  }
  if (room.status === "playing") {
    if (!currentTurnPlayer) return "차례를 준비하고 있습니다";
    return currentTurnPlayer.id === myPlayerId ? "내 차례입니다. 음식 하나를 클릭하세요" : `${currentTurnPlayer.name}님의 차례입니다`;
  }
  return "게임 종료";
}

function lineText(line) {
  if (!line) return "빙고";
  const first = line[0];
  const last = line.at(-1);
  if (first === 0 && last === 24) return "대각선";
  if (first === 4 && last === 20) return "대각선";
  if (line[1] === first + 1) return "가로줄";
  return "세로줄";
}

function buildRoomPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    board: [],
    ratios: DEFAULT_RATIOS,
    ready: false,
    joinedAt: now(),
    onlineAt: now(),
  };
}

function nextTurnState(order, currentIndex, currentRound, playersById) {
  const liveOrder = order.filter((id) => playersById[id]);
  if (liveOrder.length === 0) {
    const fallback = shuffle(Object.keys(playersById));
    return { turnOrder: fallback, turnIndex: 0, round: currentRound || 1 };
  }

  if (currentIndex < liveOrder.length - 1) {
    return { turnOrder: liveOrder, turnIndex: currentIndex + 1, round: currentRound || 1 };
  }

  return {
    turnOrder: shuffle(liveOrder),
    turnIndex: 0,
    round: (currentRound || 1) + 1,
  };
}

function rebalanceRatios(current, changedId, nextValue) {
  const clampedValue = clampToStep(nextValue, 0, 100, 5);
  const others = COUNTRIES.filter((country) => country.id !== changedId).map((country) => country.id);
  const remaining = 100 - clampedValue;
  const otherTotal = others.reduce((sum, id) => sum + Number(current[id] || 0), 0);

  if (remaining === 0) {
    return {
      ...Object.fromEntries(COUNTRIES.map((country) => [country.id, 0])),
      [changedId]: 100,
    };
  }

  if (otherTotal === 0) {
    const base = Math.floor(remaining / others.length / 5) * 5;
    const next = {
      ...Object.fromEntries(COUNTRIES.map((country) => [country.id, 0])),
      [changedId]: clampedValue,
    };
    let leftover = remaining;
    for (const id of others) {
      next[id] = Math.min(base, leftover);
      leftover -= next[id];
    }
    let index = 0;
    while (leftover > 0) {
      next[others[index % others.length]] += 5;
      leftover -= 5;
      index += 1;
    }
    return next;
  }

  const exact = others.map((id) => {
    const raw = (Number(current[id] || 0) / otherTotal) * remaining;
    const stepped = Math.floor(raw / 5) * 5;
    return { id, value: stepped, rest: raw - stepped };
  });
  const next = {
    ...Object.fromEntries(COUNTRIES.map((country) => [country.id, 0])),
    [changedId]: clampedValue,
  };
  for (const item of exact) next[item.id] = item.value;

  let diff = 100 - Object.values(next).reduce((sum, value) => sum + value, 0);
  for (const item of [...exact].sort((a, b) => b.rest - a.rest)) {
    if (diff <= 0) break;
    next[item.id] += 5;
    diff -= 5;
  }

  return next;
}

function clampToStep(value, min, max, step) {
  const clamped = Math.max(min, Math.min(max, Number(value) || 0));
  return Math.round(clamped / step) * step;
}

function randomRatios() {
  const cuts = shuffle([0, 5, 10, 15, 20, 25, 30, 35, 40]).slice(0, COUNTRIES.length);
  const weights = COUNTRIES.map((_, index) => cuts[index] + 5);
  const total = weights.reduce((sum, value) => sum + value, 0);
  const rounded = weights.map((value) => Math.round((value / total) * 20) * 5);
  let diff = 100 - rounded.reduce((sum, value) => sum + value, 0);
  let index = 0;
  while (diff !== 0) {
    const step = diff > 0 ? 5 : -5;
    if (rounded[index] + step >= 0) {
      rounded[index] += step;
      diff -= step;
    }
    index = (index + 1) % rounded.length;
  }
  return Object.fromEntries(COUNTRIES.map((country, countryIndex) => [country.id, rounded[countryIndex]]));
}

async function makeUniqueRoomCode() {
  for (let index = 0; index < 10; index += 1) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const existing = await fbGet(`rooms/${code}`);
    if (!existing) return code;
  }
  throw new Error("Cannot allocate room code");
}

function getFood(id) {
  return FOOD_POOL.find((food) => food.id === id) || FOOD_POOL[0];
}

function countryOf(id) {
  return COUNTRIES.find((country) => country.id === id) || COUNTRIES[0];
}

function shuffle(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

function sortByJoinedAt(a, b) {
  return Date.parse(a.joinedAt || "") - Date.parse(b.joinedAt || "");
}

function makePlayer() {
  return { id: `player_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, name: "" };
}

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    if (!value) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browser storage is optional for the game to run.
  }
}

function copyText(value) {
  navigator.clipboard?.writeText(value).catch(() => {});
}

function applyFirebaseStreamEvent(current, eventData, eventType) {
  if (!eventData) return current;
  const { path, data } = eventData;
  if (path === "/") {
    if (eventType === "patch" && current && data && typeof data === "object") {
      return { ...current, ...data };
    }
    return data || null;
  }

  const next = current ? JSON.parse(JSON.stringify(current)) : {};
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return data || null;

  let target = next;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!target[part] || typeof target[part] !== "object") target[part] = {};
    target = target[part];
  }

  const key = parts.at(-1);
  if (data === null) {
    delete target[key];
  } else if (
    eventType === "patch" &&
    target[key] &&
    typeof target[key] === "object" &&
    !Array.isArray(target[key]) &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    target[key] = { ...target[key], ...data };
  } else {
    target[key] = data;
  }
  return next;
}

async function fbGet(path) {
  const response = await fetch(`${DB_URL}/${path}.json`);
  if (!response.ok) throw new Error(`GET ${path} failed`);
  return response.json();
}

async function fbPut(path, value) {
  const response = await fetch(`${DB_URL}/${path}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error(`PUT ${path} failed`);
}

async function fbPatch(path, value) {
  const response = await fetch(`${DB_URL}/${path}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error(`PATCH ${path} failed`);
}

function now() {
  return new Date().toISOString();
}

function clearAlerts() {
  // Kept outside component state setters by calling local closures where needed.
}
