// the general premise here is that every cell has coordinates and pieces may be at those coordinates
// pieces move by changing their coordinates in some manner

class Move {
  constructor(vector, options) {
    this.vector = vector;
    this.options = options || {};

    // -1 for "as far as possible" (e.g. queen) and 1 for "one step" (e.g. king)
    this.momentum = this.options.momentum != undefined ? this.options.momentum : -1;

    // whether a piece can move to different coords without capturing (e.g. pawn's forward move)
    this.canPlace = this.options.canPlace != undefined ? this.options.canPlace : true;

    // whether a piece can capture with this move (e.g. pawn's diagonal capture)
    this.canCapture = this.options.canCapture != undefined ? this.options.canCapture : true;

    // whether a piece can have change the direction it's going (no standard pieces have this)
    this.canTurn = this.options.canTurn != undefined ? this.options.canTurn : false;
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

    this.cellMap = {};
    for (let x = 0; x < this.size; x += 1) {
      for (let y = 0; y < this.size; y += 1) {
        this.cellMap[x + '_' + y] = {};
      }
    }
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
    let newCoords = {
      x: coords.x + movement.vector.dx,
      y: coords.y + movement.vector.dy,
    }

    if (!this.isValidCoords(newCoords))
      return null;
    return newCoords;
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
        new Move({dx: 1, dy: 1}, {momentum: 1, canPlace: false}),
        new Move({dx: -1, dy: 1}, {momentum: 1, canPlace: false}),
      ]),
      bpawn: new Piece('pawn', [
        new Move({dx: 0, dy: -1}, {momentum: 1, canCapture: false}),
        new Move({dx: 1, dy: -1}, {momentum: 1, canPlace: false}),
        new Move({dx: -1, dy: -1}, {momentum: 1, canPlace: false}),
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

      let instance = {
        piece: piece,
        player: player,
        coords: {x: px, y: py},
        icon: null,
      }

      this.pieces[player].push(instance);
      this.board.cellMap[px + '_' + py].occupier = instance;
    })
  }

  initGraphics(root) {
    let board = document.createElementNS('http://www.w3.org/2000/svg', 'g'),
        pieces = document.createElementNS('http://www.w3.org/2000/svg', 'g'),
        cellSize = parseInt(root.getAttribute('width')) / this.board.size;

    this.board.cellSize = cellSize;
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

        piece.icon = icon;
        pieces.appendChild(icon);
      })
    })

    this.attachBoardEventListeners(root);

    root.appendChild(board);
    root.appendChild(pieces);
  }

  attachBoardEventListeners(board) {
    this.floating = {}

    board.addEventListener('mousedown', event => {
      let boardX = parseInt(event.offsetX / this.board.cellSize),
          boardY = parseInt(event.offsetY / this.board.cellSize);

      if (this.floating.piece) {
        let oldX = this.floating.piece.coords.x,
            oldY = this.floating.piece.coords.y;

        this.board.cellMap[oldX + '_' + oldY].occupier = null;
        this.board.cellMap[boardX + '_' + boardY].occupier = this.floating.piece;

        this.floating.piece.coords.x = boardX;
        this.floating.piece.coords.y = boardY;

        this.floating.piece.icon.setAttribute('x', boardX * this.board.cellSize);
        this.floating.piece.icon.setAttribute('y', boardY * this.board.cellSize);

        this.floating.piece = null;
      } else {
        let cell = this.board.cellMap[boardX + '_' + boardY];

        if (cell.occupier) {
          this.floating.piece = cell.occupier;
          this.floating.startX = event.offsetX - event.offsetX % this.board.cellSize + this.board.cellSize / 2;
          this.floating.startY = event.offsetY - event.offsetX % this.board.cellSize + this.board.cellSize / 2;

          console.log('here goes')
          this.floating.validMoves = this.calculateValidMoves(cell.occupier.piece, cell.occupier.coords);
          console.log(this.floating.validMoves);
        }
      }
    })

    board.addEventListener('mousemove', event => {
      if (this.floating.piece) {
        let screenX = this.floating.piece.coords.x * this.board.cellSize + event.offsetX - this.floating.startX,
            screenY = this.floating.piece.coords.y * this.board.cellSize + event.offsetY - this.floating.startY;
        this.floating.piece.icon.setAttribute('x', screenX);
        this.floating.piece.icon.setAttribute('y', screenY);
      }
    })
  }

  calculateValidMoves(piece, coords) {
    // returns a list of valid coords
    let seenCoords = {},
        validCoords = {},
        moveQueue = [];

    seenCoords[coords.x + '_' + coords.y] = [];

    piece.movements.forEach(move => {
      moveQueue.push([coords, move]);
    })

    let index = -1;
    while (index < moveQueue.length - 1) {
      index += 1;

      let [coords, move] = moveQueue[index];
      console.log(coords, move);

      let newCoords = this.board.transform(coords, move);
      if (!newCoords)
        return;

      let coordsKey = newCoords.x + '_' + newCoords.y;

      // if we've been here with this move before, skip
      let priorMoves = seenCoords[coordsKey];
      if (priorMoves) {
        let skip = false;

        for (let i = 0; i < priorMoves.length; i += 1) {
          if (priorMoves[i] == move)
            skip = true;
        }

        if (skip)
          continue;
      } else {
        seenCoords[coordsKey] = [];
      }

      let occupier = this.board.cellMap[coordsKey].occupier,
          validAction = null;

      if (occupier) {
        // check capture ability
        if (move.canCapture && piece.player != occupier.player)
          validAction = {capture: true};

      } else {
        if (move.canPlace)
          validAction = {place: true};

        // add further moves to the moveQueue if any
        if (move.canTurn) {
          piece.movements.forEach(move => moveQueue.push([newCoords, move]));
        } else if (move.momentum == -1 || move.momentum > 1) {
          let nextMove = move.copy();
          if (move.momentum > 1)
            nextMove.momentum -= 1;

          moveQueue.push([newCoords, nextMove])
        }
      }

      seenCoords[coordsKey].push(move);
      if (validAction)
        validCoords[coordsKey] = validAction;
    }

    return validCoords;
  }

  perform(player, piece, move) {}
}

let game = new StandardChess(),
    svg = document.getElementById('svg');

game.initGraphics(svg)
