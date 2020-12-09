var solutions = [
    [[[0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],],
     [[0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],],
     [[0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],],]
];

const pieces = [
    // red
    [[[1, 1, 1],
      [0, 1, 0]]],
    // orange
    [[[1, 1],
      [1, 0]],
     [[1, 0],
      [0, 0]]],
    // yellow
    [[[1, 1],
      [1, 0]]],
    // green
    [[[0, 1, 1],
      [1, 1, 0]]],
    // cyan
    [[[1, 1],
      [1, 0]],
     [[0, 0],
      [1, 0]]],
    // blue
    [[[1, 1],
      [1, 0]],
     [[0, 1],
      [0, 0]]],
    // pink
    [[[1, 1, 1],
      [1, 0, 0]]],
];

var unusedPieceColors = [1, 2, 3, 4, 5, 6, 7].reverse();
var pieceRotations = [];
var moves = [];

var totalSolutions = 0;
var totalMoves = 0;

function takeNextUnusedPiece() {
    var c = unusedPieceColors.pop();
    if (c != undefined) {
        moves.push({
            color: c,
            piece: pieces[c - 1],
            stage: "probe",
            pos: [0, 0, 0],
            rot: 0
        });
        return true;
    } else {
        return false;
    }
}

function nextMove() {
    if (moves.length == 0) {
        console.log("END: total moves " + totalMoves);
        return false;
    }
    ++totalMoves;

    var move = moves[moves.length - 1];
    if (move.stage == "probe") {
        if (makeMove(move)) {
            move.stage = "put";
            makeMove(move);
            if (!takeNextUnusedPiece()) {
                ++totalSolutions;
                const cube = solutions[solutions.length - 1];
                if (uniqueSolution(cube)) {
                    solutions.push(copyPiece(cube));
                    console.log("Unique solution: " + cube);
                }
            }
        } else {
            advanceMove(move);
        }
    } else {
        move.stage = "del";
        makeMove(move);
        move.stage = "probe";
        advanceMove(move);
    }
    return true;
}

function makeMove(move) {
    const cube = solutions[solutions.length - 1];
    const piece = move.piece;
    const pos = move.pos;
    for (var z = 0; z < piece.length; ++z) {
        // Here we assume that the piece is positioned to be fully contained
        // in the cube's grid, so we don't have to check the boundaries:
        const zc = cube[pos[0] + z];
        const zp = piece[z];
        for (var y = 0; y < zp.length; ++y) {
            const yc = zc[pos[1] + y];
            const yp = zp[y];
            for (var x = 0; x < yp.length; ++x) {
                const cx = pos[2] + x;
                if (yp[x] != 0) {
                    if (move.stage == "del") {
                        yc[cx] = 0;
                    } else {
                        if (yc[cx] != 0)
                            return false;
                        if (move.stage == "put") {
                            yc[cx] = move.color;
                        }
                    }
                }
            }
        }
    }
    return true;
}

function advanceMove(move) {
    // We can also swap the order of position vs. rotation advancement, due to
    // both functions resetting the state after exhausting their options:
    if (!advanceMovePosition(move)) {
        if (!advanceMoveRotation(move)) {
            moves.pop();
            unusedPieceColors.push(move.color);
        }
    }
}

function advanceMovePosition(move) {
    var pos = move.pos;
    const piece = move.piece;
    if (pos[0] < 3 - piece.length) {
        ++pos[0];
    } else {
        pos[0] = 0;
        if (pos[1] < 3 - piece[0].length) {
            ++pos[1];
        } else {
            pos[1] = 0;
            if (pos[2] < 3 - piece[0][0].length) {
                ++pos[2];
            } else {
                // Reset position, so move advancement continues seamlessly:
                pos[2] = 0;
                return false;
            }
        }
    }
    return true;
}

function advanceMoveRotation(move) {
    var canAdvanceFurther = true;
    const rotations = pieceRotations[move.color - 1];
    ++move.rot;
    if (move.rot >= rotations.length) {
        // Reset rotation index, so move advancement continues seamlessly:
        move.rot = 0;
        canAdvanceFurther = false;
    }
    move.piece = rotations[move.rot];
    return canAdvanceFurther;
}

function advancePieceRotation(piece, rot) {
    piece = rotatedPieceX(piece);
    if (rot[0] < 3) {
        ++rot[0];
    } else {
        rot[0] = 0;
        piece = rotatedPieceY(piece);
        if (rot[1] < 3) {
            ++rot[1];
        } else {
            rot[1] = 0;
            piece = rotatedPieceZ(piece);
            if (rot[2] < 3) {
                ++rot[2];
            } else {
                rot[2] = 0;
                return null;
            }
        }
    }
    return piece;
}

function rotatedPieceZ(p) {
    const zr = p.length;
    const yr = p[0][0].length;
    const xr = p[0].length;
    var r = new Array(zr);
    for (var z = 0; z < zr; ++z) {
        r[z] = new Array(yr);
        for (var y = 0; y < yr; ++y) {
            r[z][y] = new Array(xr);
            for (var x = 0; x < xr; ++x) {
                r[z][y][x] = p[z][(xr-1) - x][y];
            }
        }
    }
    return r;
}

function rotatedPieceY(p) {
    const zr = p[0][0].length;
    const yr = p[0].length;
    const xr = p.length;
    var r = new Array(zr);
    for (var z = 0; z < zr; ++z) {
        r[z] = new Array(yr);
        for (var y = 0; y < yr; ++y) {
            r[z][y] = new Array(xr);
            for (var x = 0; x < xr; ++x) {
                r[z][y][x] = p[x][y][(zr-1) - z];
            }
        }
    }
    return r;
}

function rotatedPieceX(p) {
    const zr = p[0].length;
    const yr = p.length;
    const xr = p[0][0].length;
    var r = new Array(zr);
    for (var z = 0; z < zr; ++z) {
        r[z] = new Array(yr);
        for (var y = 0; y < yr; ++y) {
            r[z][y] = new Array(xr);
            for (var x = 0; x < xr; ++x) {
                r[z][y][x] = p[(yr-1) - y][z][x];
            }
        }
    }
    return r;
}

function listContainsPiece(list, p) {
    for (var i = 0; i < list.length; ++i) {
        if (equalPieces(list[i], p)) {
            return true;
        }
    }
    return false;
}

function uniquePieceRotations(piece) {
    var rotations = [];
    var rot = [0, 0, 0];
    while (piece != null) {
        if (!listContainsPiece(rotations, piece)) {
            rotations.push(piece);
        }
        piece = advancePieceRotation(piece, rot);
    }
    return rotations;
}

function preCalculatePieceRotations() {
    for (var i = 0; i < pieces.length; ++i) {
        pieceRotations.push(uniquePieceRotations(pieces[i]));
    }
}

function copyPiece(p) {
    const rz = p.length;
    const ry = p[0].length;
    const rx = p[0][0].length;
    var r = new Array(rz);
    for (var z = 0; z < rz; ++z) {
        r[z] = new Array(ry);
        for (var y = 0; y < ry; ++y) {
            r[z][y] = new Array(rx);
            for (var x = 0; x < rx; ++x) {
                r[z][y][x] = p[z][y][x];
            }
        }
    }
    return r;
}

function equalPieces(p, q) {
    const pz = p.length;
    const py = p[0].length;
    const px = p[0][0].length;
    if (pz != q.length ||
        py != q[0].length ||
        px != q[0][0].length) {
        return false;
    }
    for (var z = 0; z < pz; ++z) {
        for (var y = 0; y < py; ++y) {
            for (var x = 0; x < px; ++x) {
                if (p[z][y][x] != q[z][y][x]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function equivalentCubes(c, d) {
    var rot = [0, 0, 0];
    while (d != null) {
        if (equalPieces(c, d)) {
            return true;
        }
        d = advancePieceRotation(d, rot);
    }
    return false;
}

function uniqueSolution(c) {
    for (var i = 0; i < solutions.length - 1; ++i) {
        if (equivalentCubes(c, solutions[i])) {
            return false;
        }
    }
    return true;
}
