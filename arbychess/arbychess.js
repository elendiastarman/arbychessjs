// the general premise here is that every cell has coordinates and pieces may be at those coordinates
// pieces move by changing their coordinates in some manner

class Move {
  constructor(vector, options) {
    this.vector = vector;
    this.options = options || {};

    // -1 for "as far as possible" (e.g. queen) and 1 for "one step" (e.g. king)
    this.momentum = this.options.momentum || -1;

    // whether a piece can move to different coords without capturing (e.g. pawn's forward move)
    this.canReposition = this.options.canReposition || true;

    // whether a piece can capture with this move (e.g. pawn's diagonal capture)
    this.canCapture = this.options.canCapture || true;
  }

  copy() {
    return new Move(this.vector, this.options);
  }
}

class Board {
  isValidCoords(coords){}
  transform(coords, movement){}
}

class SquareGrid extends Board {
  constructor(size) {
    super()
    this.size = size;
  }

  initTiles(cellSize) {
    let tiles = [];

    for (let x = 0; x < this.size; x += 1) {
      for (let y = 0; y < this.size; y += 1) {
        let tile = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

        tile.setAttribute('x', x * cellSize + 'px');
        tile.setAttribute('y', y * cellSize + 'px');
        tile.setAttribute('width', cellSize + 'px');
        tile.setAttribute('height', cellSize + 'px');

        let twiddle = ((x + y) % 2) - 1;
        tile.style.stroke = 'black';
        tile.style.fill = `hsl(40, 80%, ${60 + twiddle * 40}%)`;

        tiles.push(tile);
      }
    }

    return tiles;
  }

  isValidCoords(coords) {
    if (coords.x < 0 || coords.y < 0)
      return false;
    if (coords.x > this.size || coords.y > this.size)
      return false;

    return true;
  }

  transform(coords, movement) {
    coords.x += movement.vector.dx;
    coords.y += movement.vector.dy;
  }

  rotate4(movements) {
    let newMovements = [];
    movements.forEach(move => {
      newMovements.push(move);

      let flip = move.copy()
      flip.vector.dx = -move.vector.dx;
      flip.vector.dy = -move.vector.dy;
      newMovements.push(flip);

      let rot = move.copy()
      rot.vector.dx = move.vector.dy;
      rot.vector.dy = -move.vector.dx;
      newMovements.push(rot);

      let rotinv = move.copy()
      rotinv.vector.dx = -move.vector.dy;
      rotinv.vector.dy = move.vector.dx;
      newMovements.push(rotinv);
    })

    return newMovements;
  }
}

class Piece {
  constructor(name, movements) {
    this.name = name;
    this.movements = movements;
  }

  copy() {
    let movesCopy = [];
    this.movements.forEach(move => movesCopy.push(move.copy()));
    return new Piece(this.name, movesCopy);
  }
}

class Player {}

class StandardChess {
  constructor() {
    this.board = new SquareGrid(8);
    this.basePieces = {
      king: new Piece('king', this.board.rotate4([
        new Move({dx: 1, dy: 0}, {momentum: 1}),
        new Move({dx: 1, dy: 1}, {momentum: 1}),
      ])),
      queen: new Piece('queen', this.board.rotate4([
        new Move({dx: 1, dy: 0}),
        new Move({dx: 1, dy: 1}),
      ])),
      rook: new Piece('rook', this.board.rotate4([
        new Move({dx: 1, dy: 0}),
      ])),
      bishop: new Piece('bishop', this.board.rotate4([
        new Move({dx: 1, dy: 1}),
      ])),
      knight: new Piece('knight', this.board.rotate4([
        new Move({dx: 1, dy: 2}, {momentum: 1}),
        new Move({dx: 2, dy: 1}, {momentum: 1}),
      ])),
      wpawn: new Piece('pawn', [
        new Move({dx: 0, dy: 1}, {momentum: 1, canCapture: false}),
        new Move({dx: 1, dy: 1}, {momentum: 1, canReposition: false}),
        new Move({dx: -1, dy: 1}, {momentum: 1, canReposition: false}),
      ]),
      bpawn: new Piece('pawn', [
        new Move({dx: 0, dy: -1}, {momentum: 1, canCapture: false}),
        new Move({dx: 1, dy: -1}, {momentum: 1, canReposition: false}),
        new Move({dx: -1, dy: -1}, {momentum: 1, canReposition: false}),
      ]),
    };

    this.players = {
      white: new Player('white'),
      black: new Player('black'),
    }
    this.playerCycle = ['white', 'black'];


    this.pieces = {
      white: [],
      black: [],
    }

    let startFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
        px = -1, py = 7,
        piece = null,
        player = null;

    startFEN.split('').forEach(char => {
      if (char == '/') {
        px = -1;
        py -= 1;
        return;
      }
      else if (char == 'K' || char == 'k')
        piece = this.basePieces.king.copy()
      else if (char == 'Q' || char == 'q')
        piece = this.basePieces.queen.copy()
      else if (char == 'R' || char == 'r')
        piece = this.basePieces.rook.copy()
      else if (char == 'B' || char == 'b')
        piece = this.basePieces.bishop.copy()
      else if (char == 'N' || char == 'n')
        piece = this.basePieces.knight.copy()
      else if (char == 'P')
        piece = this.basePieces.wpawn.copy()
      else if (char == 'p')
        piece = this.basePieces.bpawn.copy()
      else {
        px += parseInt(char);
        return;
      }

      px += 1;
      player = ('KQRBNP'.indexOf(char) > -1) ? 'white' : 'black';

      this.pieces[player].push({
        piece: piece,
        coords: {x: px, y: py},
      })
    })
  }

  initGraphics(root) {
    let board = document.createElementNS('http://www.w3.org/2000/svg', 'g'),
        pieces = document.createElementNS('http://www.w3.org/2000/svg', 'g'),
        cellSize = parseInt(root.getAttribute('width')) / this.board.size;

    this.board.initTiles(cellSize).forEach(tile => board.appendChild(tile));

    let pieceImages = {
      king: {white: 'Chess_klt45.svg', black: 'Chess_kdt45.svg'},
      queen: {white: 'Chess_qlt45.svg', black: 'Chess_qdt45.svg'},
      rook: {white: 'Chess_rlt45.svg', black: 'Chess_rdt45.svg'},
      bishop: {white: 'Chess_blt45.svg', black: 'Chess_bdt45.svg'},
      knight: {white: 'Chess_nlt45.svg', black: 'Chess_ndt45.svg'},
      pawn: {white: 'Chess_plt45.svg', black: 'Chess_pdt45.svg'},
    }

    this.playerCycle.forEach(player => {
      this.pieces[player].forEach(piece => {
        let icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');

        icon.setAttribute('x', piece.coords.x * cellSize);
        icon.setAttribute('y', piece.coords.y * cellSize);
        icon.setAttribute('width', cellSize);
        icon.setAttribute('height', cellSize);
        icon.setAttribute('href', 'svgs/' + pieceImages[piece.piece.name][player]);

        pieces.appendChild(icon);
      })
    })

    root.appendChild(board);
    root.appendChild(pieces);
  }

  perform(player, piece, move) {}
}

let game = new StandardChess(),
    svg = document.getElementById('svg');

game.initGraphics(svg)
