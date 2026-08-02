import "./style.css";

type Seat = 0 | 1;
type SeatMatrix = Seat[][];

interface SeatPosition {
  row: number;
  seat: number;
}

interface ReserveMultipleResult {
  reserved: SeatPosition[];
  failed: Array<{ position: SeatPosition; reason: string }>;
}

const TOTAL_ROWS = 8;
const SEATS_PER_ROW = 10;

const screeningRoom: SeatMatrix = createScreeningRoom(TOTAL_ROWS, SEATS_PER_ROW);

function createScreeningRoom(rows: number, seatsPerRow: number): SeatMatrix {
  return Array.from({ length: rows }, () => Array.from({ length: seatsPerRow }, () => 0 as Seat));
}

function isWithinBounds(position: SeatPosition): boolean {
  return (
    position.row >= 0 &&
    position.row < TOTAL_ROWS &&
    position.seat >= 0 &&
    position.seat < SEATS_PER_ROW
  );
}

function toHumanPosition(position: SeatPosition): string {
  return `Row ${position.row + 1}, Seat ${position.seat + 1}`;
}

function displayScreeningRoom(room: SeatMatrix): void {
  console.log("Current screening room (X occupied, L available):");
  room.forEach((row, rowIndex) => {
    const formattedRow = row.map((seat) => (seat === 1 ? "X" : "L")).join(" ");
    console.log(`Row ${rowIndex + 1}: ${formattedRow}`);
  });
}

function reserveSeat(room: SeatMatrix, position: SeatPosition): { ok: boolean; message: string } {
  if (!isWithinBounds(position)) {
    return { ok: false, message: `${toHumanPosition(position)} is out of range.` };
  }

  if (room[position.row][position.seat] === 1) {
    return { ok: false, message: `${toHumanPosition(position)} is already reserved.` };
  }

  room[position.row][position.seat] = 1;
  return { ok: true, message: `${toHumanPosition(position)} reserved successfully.` };
}

function reserveMultipleSeats(room: SeatMatrix, positions: SeatPosition[]): ReserveMultipleResult {
  const result: ReserveMultipleResult = {
    reserved: [],
    failed: [],
  };

  positions.forEach((position) => {
    const seatResult = reserveSeat(room, position);
    if (seatResult.ok) {
      result.reserved.push(position);
    } else {
      result.failed.push({ position, reason: seatResult.message });
    }
  });

  return result;
}

function countOccupiedSeats(room: SeatMatrix): { occupied: number; total: number } {
  const occupied = room.flat().filter((seat) => seat === 1).length;
  return {
    occupied,
    total: TOTAL_ROWS * SEATS_PER_ROW,
  };
}

function findTwoAdjacentAvailableSeats(room: SeatMatrix):
  | { first: SeatPosition; second: SeatPosition }
  | { message: string } {
  for (let row = 0; row < TOTAL_ROWS; row += 1) {
    for (let seat = 0; seat < SEATS_PER_ROW - 1; seat += 1) {
      if (room[row][seat] === 0 && room[row][seat + 1] === 0) {
        return {
          first: { row, seat },
          second: { row, seat: seat + 1 },
        };
      }
    }
  }

  return { message: "No adjacent seats available." };
}

function parseMultipleSeatInput(input: string): { positions: SeatPosition[]; errors: string[] } {
  const entries = input
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const positions: SeatPosition[] = [];
  const errors: string[] = [];

  entries.forEach((entry) => {
    const match = entry.match(/^(\d+)\s*[-:]\s*(\d+)$/);
    if (!match) {
      errors.push(`Invalid format: \"${entry}\". Use row-seat, e.g. 2-7.`);
      return;
    }

    const row = Number(match[1]) - 1;
    const seat = Number(match[2]) - 1;
    const position: SeatPosition = { row, seat };

    if (!isWithinBounds(position)) {
      errors.push(`${toHumanPosition(position)} is out of range.`);
      return;
    }

    positions.push(position);
  });

  return { positions, errors };
}

function getRequiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required DOM element not found: ${selector}`);
  }
  return element;
}

const seatGrid = getRequiredElement<HTMLDivElement>("#seat-grid");
const seatCounter = getRequiredElement<HTMLParagraphElement>("#seat-counter");
const statusElement = getRequiredElement<HTMLParagraphElement>("#status");
const singleSeatForm = getRequiredElement<HTMLFormElement>("#single-seat-form");
const multipleSeatForm = getRequiredElement<HTMLFormElement>("#multiple-seat-form");
const findAdjacentButton = getRequiredElement<HTMLButtonElement>("#find-adjacent");
const printConsoleButton = getRequiredElement<HTMLButtonElement>("#print-console");

function setStatus(message: string): void {
  statusElement.textContent = message;
}

function renderSeatCounter(): void {
  const { occupied, total } = countOccupiedSeats(screeningRoom);
  seatCounter.textContent = `Occupied: ${occupied} / ${total}`;
}

function renderSeatGrid(): void {
  seatGrid.innerHTML = "";

  for (let row = 0; row < TOTAL_ROWS; row += 1) {
    for (let seat = 0; seat < SEATS_PER_ROW; seat += 1) {
      const position: SeatPosition = { row, seat };
      const isOccupied = screeningRoom[row][seat] === 1;
      const seatButton = document.createElement("button");

      seatButton.type = "button";
      seatButton.className = `seat-btn ${isOccupied ? "seat-btn-occupied" : "seat-btn-free"}`;
      seatButton.textContent = `${row + 1}-${seat + 1}`;
      seatButton.setAttribute("aria-label", `${toHumanPosition(position)}${isOccupied ? " occupied" : " available"}`);
      seatButton.disabled = isOccupied;

      seatButton.addEventListener("click", () => {
        const result = reserveSeat(screeningRoom, position);
        setStatus(result.message);
        renderAll();
      });

      seatGrid.appendChild(seatButton);
    }
  }
}

function renderAll(): void {
  renderSeatCounter();
  renderSeatGrid();
  displayScreeningRoom(screeningRoom);
}

singleSeatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(singleSeatForm);
  const row = Number(formData.get("row")) - 1;
  const seat = Number(formData.get("seat")) - 1;
  const position: SeatPosition = { row, seat };

  const result = reserveSeat(screeningRoom, position);
  setStatus(result.message);
  renderAll();

  if (result.ok) {
    singleSeatForm.reset();
  }
});

multipleSeatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(multipleSeatForm);
  const input = String(formData.get("seats") ?? "");
  const parsed = parseMultipleSeatInput(input);

  if (parsed.errors.length > 0) {
    setStatus(parsed.errors[0]);
    return;
  }

  const result = reserveMultipleSeats(screeningRoom, parsed.positions);
  renderAll();

  if (result.failed.length === 0) {
    setStatus(`Reserved ${result.reserved.length} seat(s) successfully.`);
    multipleSeatForm.reset();
    return;
  }

  setStatus(result.failed[0].reason);
});

findAdjacentButton.addEventListener("click", () => {
  const result = findTwoAdjacentAvailableSeats(screeningRoom);

  if ("message" in result) {
    setStatus(result.message);
    return;
  }

  setStatus(
    `First adjacent option: ${toHumanPosition(result.first)} and ${toHumanPosition(result.second)}.`
  );
});

printConsoleButton.addEventListener("click", () => {
  displayScreeningRoom(screeningRoom);
  setStatus("Matrix printed to console with X (occupied) and L (available).");
});

renderAll();
