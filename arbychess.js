// the general premise here is that every cell has coordinates and pieces may be at those coordinates
// pieces move by changing their coordinates in some manner

class Move {
  constructor(vector, options) {
    this.vector = vector;
    this.options = options != undefined ? options : {};

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
    if (coords.x >= this.size || coords.y >= this.size)
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

      let flip = new Move({dx: -move.vector.dx, dy: -move.vector.dy}, move.options);
      let rot = new Move({dx: move.vector.dy, dy: -move.vector.dx}, move.options);
      let rotinv = new Move({dx: -move.vector.dy, dy: move.vector.dx}, move.options);

      newMovements.push(flip);
      newMovements.push(rot);
      newMovements.push(rotinv);
    })

    return newMovements;
  }
}

class Piece {
  constructor(name, movements) {
    this.name = name;
    this.movements = movements;
    this.history = [];
  }

  copy() {
    let movesCopy = [];
    this.movements.forEach(move => movesCopy.push(move.copy()));
    let newCopy = new Piece(this.name, movesCopy);
    if (this.specialMoves)
      newCopy.specialMoves = this.specialMoves.bind(newCopy);
    return newCopy;
  }
}

class Player {
  constructor(name) {
    this.name = name;
  }
}

class Variant {
  constructor() {
    this.history = [];
  }
}

class StandardChess extends Variant {
  constructor() {
    super()

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

    /** special moves such as castling and en passant */

    // 2-square move
    this.basePieces.wpawn.specialMoves = (piece) => {
      return (piece.base.history.length > 0) ? [] : [
        [piece.coords, new Move({dx: 0, dy: 1}, {momentum: 2, canCapture: false})],
      ];
    };
    this.basePieces.bpawn.specialMoves = (piece) => {
      return (piece.base.history.length > 0) ? [] : [
        [piece.coords, new Move({dx: 0, dy: -1}, {momentum: 2, canCapture: false})],
      ];
    };

    /** */

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
        base = null,
        player = null;

    startFEN.split('').forEach(char => {
      if (char == '/') {
        px = -1;
        py -= 1;
        return;
      }
      else if (char == 'K' || char == 'k')
        base = this.basePieces.king.copy()
      else if (char == 'Q' || char == 'q')
        base = this.basePieces.queen.copy()
      else if (char == 'R' || char == 'r')
        base = this.basePieces.rook.copy()
      else if (char == 'B' || char == 'b')
        base = this.basePieces.bishop.copy()
      else if (char == 'N' || char == 'n')
        base = this.basePieces.knight.copy()
      else if (char == 'P')
        base = this.basePieces.wpawn.copy()
      else if (char == 'p')
        base = this.basePieces.bpawn.copy()
      else {
        px += parseInt(char);
        return;
      }

      px += 1;
      player = ('KQRBNP'.indexOf(char) > -1) ? 'white' : 'black';

      let piece = {
        base: base,
        player: player,
        coords: {x: px, y: py},
        icon: null,
      }

      this.pieces[player].push(piece);
      this.board.cellMap[px + '_' + py].occupier = piece;
    })
  }

  initGraphics(root) {
    let board = document.createElementNS('http://www.w3.org/2000/svg', 'g'),
        pieces = document.createElementNS('http://www.w3.org/2000/svg', 'g'),
        underlay = document.createElementNS('http://www.w3.org/2000/svg', 'g'),
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
        icon.setAttribute('href', 'svgs/' + pieceImages[piece.base.name][player]);

        piece.icon = icon;
        pieces.appendChild(icon);
      })
    })

    this.attachBoardEventListeners(root);
    underlay.setAttribute('id', 'underlay');

    root.appendChild(board);
    root.appendChild(underlay);
    root.appendChild(pieces);
  }

  attachBoardEventListeners(board) {
    this.floating = {};
    board.addEventListener('mousedown', this.mousedown.bind(this));
    board.addEventListener('mousemove', this.mousemove.bind(this));
  }

  mousedown(event) {
    let boardX = parseInt(event.offsetX / this.board.cellSize),
        boardY = parseInt(event.offsetY / this.board.cellSize);

    if (this.floating.piece) {
      let oldX = this.floating.piece.coords.x,
          oldY = this.floating.piece.coords.y,
          validAction = this.floating.validMoves[boardX + '_' + boardY];

      if (validAction) {
        this.history.push(validAction);
        this.floating.piece.base.history.push(validAction);

        if (validAction.capture) {
          validAction.victim.icon.remove();
        }

        // cycle to the next player
        let player = this.playerCycle[0];
        this.playerCycle = this.playerCycle.slice(1);
        this.playerCycle.push(player);

        // new position for piece
        this.board.cellMap[oldX + '_' + oldY].occupier = null;
        this.board.cellMap[boardX + '_' + boardY].occupier = this.floating.piece;

        this.floating.piece.coords.x = boardX;
        this.floating.piece.coords.y = boardY;

        this.floating.piece.icon.setAttribute('x', boardX * this.board.cellSize);
        this.floating.piece.icon.setAttribute('y', boardY * this.board.cellSize);
      } else {
        // reset icon location
        this.floating.piece.icon.setAttribute('x', oldX * this.board.cellSize);
        this.floating.piece.icon.setAttribute('y', oldY * this.board.cellSize);
      }

      this.floating.piece = null;
      let highlights = document.getElementById('underlay').firstChild;
      highlights.remove();

    } else {
      let cell = this.board.cellMap[boardX + '_' + boardY];

      if (cell.occupier && cell.occupier.player == this.playerCycle[0]) {
        this.floating.piece = cell.occupier;
        this.floating.startX = event.offsetX - event.offsetX % this.board.cellSize + this.board.cellSize / 2;
        this.floating.startY = event.offsetY - event.offsetX % this.board.cellSize + this.board.cellSize / 2;
        this.floating.validMoves = this.calculateValidMoves(cell.occupier);

        let underlay = document.getElementById('underlay'),
            inner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        underlay.appendChild(inner);

        // highlight the valid moves
        for (let key in this.floating.validMoves) {
          let [kx, ky] = key.split('_'),
              x = parseInt(kx),
              y = parseInt(ky),
              place = this.floating.validMoves[key].place,
              capture = this.floating.validMoves[key].capture;

          let highlight = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

          highlight.setAttribute('x', x * this.board.cellSize + 2 + 'px');
          highlight.setAttribute('y', y * this.board.cellSize + 2 + 'px');
          highlight.setAttribute('width', this.board.cellSize - 4 + 'px');
          highlight.setAttribute('height', this.board.cellSize - 4 + 'px');

          highlight.style.stroke = place ? 'green' : capture ? 'red' : 'blue';
          highlight.style.strokeWidth = '3px';
          highlight.style.fill = 'none';

          inner.appendChild(highlight);
        }

        this.mousemove(event);
      }
    }
  }

  mousemove(event) {
    if (this.floating.piece) {
      let screenX = this.floating.piece.coords.x * this.board.cellSize + event.offsetX - this.floating.startX,
          screenY = this.floating.piece.coords.y * this.board.cellSize + event.offsetY - this.floating.startY;
      this.floating.piece.icon.setAttribute('x', screenX);
      this.floating.piece.icon.setAttribute('y', screenY);
    }
  }

  calculateValidMoves(piece) {
    // returns a list of valid coords
    let seenCoords = {},
        validCoords = {},
        moveQueue = [];

    seenCoords[piece.coords.x + '_' + piece.coords.y] = [];

    piece.base.movements.forEach(move => {
      moveQueue.push([piece.coords, move]);
    })

    this.addSpecialMoves(piece, seenCoords, validCoords, moveQueue);

    let index = -1;
    while (index < moveQueue.length - 1) {
      index += 1;

      let [coords, move] = moveQueue[index];

      let newCoords = this.board.transform(coords, move);
      if (!newCoords)
        continue;

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

      seenCoords[coordsKey].push(move);

      let occupier = this.board.cellMap[coordsKey].occupier,
          validAction = null;

      if (occupier && move.canCapture && occupier.player != piece.player) {
        validAction = {capture: true, victim: occupier}

        // currently, no pieces can move after capturing, but if they could, that'd be here
      }

      if (!occupier && move.canPlace) {
        validAction = {place: true}

        if (move.momentum == -1 || move.momentum > 1) {
          let nextMove = move.copy();
          if (move.momentum > 1)
            nextMove.momentum -= 1;

          moveQueue.push([newCoords, nextMove])
        }
      }

      if (validAction && move.canTurn) {
        validAction.turn = true;
        piece.movements.forEach(move => moveQueue.push([newCoords, move]));
      }


      if (validAction)
        validCoords[coordsKey] = validAction;
    }

    this.rejectInvalidMoves(piece, seenCoords, validCoords, moveQueue);

    return validCoords;
  }

  addSpecialMoves(piece, seenCoords, validCoords, moveQueue) {
    if (piece.base.specialMoves)
      piece.base.specialMoves(piece).forEach(move => moveQueue.push(move));
  }

  rejectInvalidMoves(piece, seenCoords, validCoords, moveQueue) {
    if (piece.base.name == 'king') {
      // check
      // castle through check
    } else {
      // king is in check
    }
  }

  perform(player, piece, move) {}
}

let game = new StandardChess(),
    svg = document.getElementById('svg');

game.initGraphics(svg)
