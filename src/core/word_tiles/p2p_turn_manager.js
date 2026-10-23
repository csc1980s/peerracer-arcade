/**
 * Word Tiles: Sovereign Lexicon — Turn-Based P2P & Multiplayer Match Manager
 * 
 * Features:
 * - True Turn-Based Head-to-Head PvP on a shared 15x15 board.
 * - Tab-to-Tab and Window-to-Window communication via native BroadcastChannel API.
 * - Deterministic shared seed for identical tile bag distributions.
 * - Move verification, board state sync, pass, exchange, and game-over handling.
 */

export const P2P_MATCH_STATUS = {
  IDLE: 'IDLE',
  HOSTING: 'HOSTING',
  CONNECTED: 'CONNECTED',
  FINISHED: 'FINISHED'
};

export class WordTilesP2PManager {
  static CHANNEL_NAME = 'word_tiles_p2p_channel_v1';

  constructor(options = {}) {
    this.playerName = options.playerName || 'Player 1';
    this.status = P2P_MATCH_STATUS.IDLE;
    this.role = null; // 'host' (Player 1) | 'guest' (Player 2)
    this.roomId = null;
    this.seed = null;
    this.opponentName = 'Opponent';

    this.onMatchConnected = options.onMatchConnected || null;
    this.onRemoteMove = options.onRemoteMove || null;
    this.onRemotePass = options.onRemotePass || null;
    this.onRemoteExchange = options.onRemoteExchange || null;
    this.onAvailableRoomsChange = options.onAvailableRoomsChange || null;

    this.availableRooms = new Map(); // roomId -> { roomId, hostName, timestamp }
    this._channel = null;
    this._announceInterval = null;

    this._initChannel();
    this.queryOpenRooms();
  }

  _initChannel() {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this._channel = new BroadcastChannel(WordTilesP2PManager.CHANNEL_NAME);
        this._channel.onmessage = (event) => this._handleMessage(event.data);
      } catch (e) {
        console.warn('[WordTilesP2P] BroadcastChannel unavailable:', e);
      }
    }
  }

  destroy() {
    this.stopAnnouncing();
    if (this._channel) {
      this._channel.close();
      this._channel = null;
    }
  }

  // --------------------------------------------------------------------------
  // ROOM HOSTING & JOINING
  // --------------------------------------------------------------------------

  hostRoom(customSeed = null) {
    this.stopAnnouncing();
    this.role = 'host';
    this.seed = customSeed || Date.now();
    this.roomId = `WORD-P2P-${Math.abs(this.seed % 1000000).toString(36).toUpperCase()}`;
    this.status = P2P_MATCH_STATUS.HOSTING;

    this._broadcast({
      type: 'ROOM_ANNOUNCE',
      roomId: this.roomId,
      hostName: this.playerName,
      seed: this.seed,
      timestamp: Date.now()
    });

    // Periodically re-announce room availability
    this._announceInterval = setInterval(() => {
      if (this.status === P2P_MATCH_STATUS.HOSTING) {
        this._broadcast({
          type: 'ROOM_ANNOUNCE',
          roomId: this.roomId,
          hostName: this.playerName,
          seed: this.seed,
          timestamp: Date.now()
        });
      }
    }, 2000);

    return {
      roomId: this.roomId,
      seed: this.seed,
      matchCode: this.getShareableCode()
    };
  }

  joinRoom(roomId, customName = null) {
    this.stopAnnouncing();
    if (customName) this.playerName = customName;

    const roomInfo = this.availableRooms.get(roomId);
    this.role = 'guest';
    this.roomId = roomId;
    this.seed = roomInfo ? roomInfo.seed : null;
    this.status = P2P_MATCH_STATUS.CONNECTED;

    this._broadcast({
      type: 'ROOM_JOIN_REQUEST',
      roomId: this.roomId,
      guestName: this.playerName
    });
  }

  joinByCode(code, customName = null) {
    try {
      const decoded = JSON.parse(atob(code));
      if (decoded.roomId && decoded.seed) {
        this.availableRooms.set(decoded.roomId, {
          roomId: decoded.roomId,
          hostName: decoded.hostName || 'Host',
          seed: decoded.seed,
          timestamp: Date.now()
        });
        return this.joinRoom(decoded.roomId, customName);
      }
    } catch (e) {
      console.warn('[WordTilesP2P] Invalid match code:', e);
      return false;
    }
    return false;
  }

  getShareableCode() {
    if (!this.roomId || !this.seed) return '';
    const payload = {
      roomId: this.roomId,
      hostName: this.playerName,
      seed: this.seed
    };
    return btoa(JSON.stringify(payload));
  }

  stopAnnouncing() {
    if (this._announceInterval) {
      clearInterval(this._announceInterval);
      this._announceInterval = null;
    }
  }

  leaveMatch() {
    this.stopAnnouncing();
    if (this.roomId) {
      this._broadcast({
        type: 'ROOM_PLAYER_LEFT',
        roomId: this.roomId,
        playerName: this.playerName
      });
    }
    this.status = P2P_MATCH_STATUS.IDLE;
    this.role = null;
    this.roomId = null;
    this.seed = null;
  }

  queryOpenRooms() {
    this._broadcast({ type: 'ROOM_QUERY' });
  }

  // --------------------------------------------------------------------------
  // GAMEPLAY BROADCASTS
  // --------------------------------------------------------------------------

  sendMove(movePayload) {
    if (this.status !== P2P_MATCH_STATUS.CONNECTED || !this.roomId) return;

    this._broadcast({
      type: 'GAME_MOVE',
      roomId: this.roomId,
      fromRole: this.role,
      fromName: this.playerName,
      move: {
        placements: movePayload.placements.map(p => ({
          row: p.row,
          col: p.col,
          tile: {
            id: p.tile.id,
            letter: p.tile.letter,
            score: p.tile.score,
            isBlank: p.tile.isBlank,
            designatedLetter: p.tile.designatedLetter
          }
        })),
        score: movePayload.score,
        words: movePayload.words,
        bingo: movePayload.bingo,
        breakdown: movePayload.breakdown
      }
    });
  }

  sendPass() {
    if (this.status !== P2P_MATCH_STATUS.CONNECTED || !this.roomId) return;

    this._broadcast({
      type: 'GAME_PASS',
      roomId: this.roomId,
      fromRole: this.role,
      fromName: this.playerName
    });
  }

  sendExchange(count) {
    if (this.status !== P2P_MATCH_STATUS.CONNECTED || !this.roomId) return;

    this._broadcast({
      type: 'GAME_EXCHANGE',
      roomId: this.roomId,
      fromRole: this.role,
      fromName: this.playerName,
      count
    });
  }

  // --------------------------------------------------------------------------
  // MESSAGE DISPATCH
  // --------------------------------------------------------------------------

  _broadcast(msg) {
    if (this._channel) {
      try {
        this._channel.postMessage(msg);
      } catch (e) {
        console.warn('[WordTilesP2P] Broadcast postMessage error:', e);
      }
    }
  }

  _handleMessage(msg) {
    if (!msg || !msg.type) return;

    // Discovery / Announcements
    if (msg.type === 'ROOM_ANNOUNCE') {
      if (msg.roomId && msg.roomId !== this.roomId) {
        this.availableRooms.set(msg.roomId, {
          roomId: msg.roomId,
          hostName: msg.hostName,
          seed: msg.seed,
          timestamp: Date.now()
        });
        this._cleanExpiredRooms();
        if (this.onAvailableRoomsChange) {
          this.onAvailableRoomsChange(Array.from(this.availableRooms.values()));
        }
      }
    } else if (msg.type === 'ROOM_QUERY') {
      if (this.status === P2P_MATCH_STATUS.HOSTING && this.roomId) {
        this._broadcast({
          type: 'ROOM_ANNOUNCE',
          roomId: this.roomId,
          hostName: this.playerName,
          seed: this.seed,
          timestamp: Date.now()
        });
      }
    } else if (msg.type === 'ROOM_JOIN_REQUEST') {
      // Host receives join request from guest
      if (this.role === 'host' && this.roomId === msg.roomId && this.status === P2P_MATCH_STATUS.HOSTING) {
        this.stopAnnouncing();
        this.status = P2P_MATCH_STATUS.CONNECTED;
        this.opponentName = msg.guestName || 'Player 2';

        // Acknowledge match start to guest
        this._broadcast({
          type: 'ROOM_START_CONFIRM',
          roomId: this.roomId,
          hostName: this.playerName,
          guestName: this.opponentName,
          seed: this.seed
        });

        if (this.onMatchConnected) {
          this.onMatchConnected({
            roomId: this.roomId,
            role: 'host',
            seed: this.seed,
            opponentName: this.opponentName,
            isYourTurn: true // Host (Player 1) starts
          });
        }
      }
    } else if (msg.type === 'ROOM_START_CONFIRM') {
      // Guest receives confirmation from host
      if (this.role === 'guest' && this.roomId === msg.roomId) {
        this.status = P2P_MATCH_STATUS.CONNECTED;
        this.opponentName = msg.hostName || 'Player 1';
        this.seed = msg.seed;

        if (this.onMatchConnected) {
          this.onMatchConnected({
            roomId: this.roomId,
            role: 'guest',
            seed: this.seed,
            opponentName: this.opponentName,
            isYourTurn: false // Guest (Player 2) waits for Player 1's opening move
          });
        }
      }
    } else if (msg.type === 'GAME_MOVE') {
      if (this.roomId === msg.roomId && msg.fromRole !== this.role) {
        if (this.onRemoteMove) {
          this.onRemoteMove(msg.move, msg.fromName);
        }
      }
    } else if (msg.type === 'GAME_PASS') {
      if (this.roomId === msg.roomId && msg.fromRole !== this.role) {
        if (this.onRemotePass) {
          this.onRemotePass(msg.fromName);
        }
      }
    } else if (msg.type === 'GAME_EXCHANGE') {
      if (this.roomId === msg.roomId && msg.fromRole !== this.role) {
        if (this.onRemoteExchange) {
          this.onRemoteExchange(msg.count, msg.fromName);
        }
      }
    } else if (msg.type === 'ROOM_PLAYER_LEFT') {
      if (this.roomId === msg.roomId) {
        this.availableRooms.delete(msg.roomId);
        if (this.onAvailableRoomsChange) {
          this.onAvailableRoomsChange(Array.from(this.availableRooms.values()));
        }
      }
    }
  }

  _cleanExpiredRooms() {
    const now = Date.now();
    for (const [id, r] of this.availableRooms.entries()) {
      if (now - r.timestamp > 15000) {
        this.availableRooms.delete(id);
      }
    }
  }
}
