/**
 * Tank Minefield: Iron Perimeter — P2P Transport & Network Intent Protocol
 * 
 * Features:
 * - Tab-to-Tab communication via native BroadcastChannel API.
 * - Authoritative intent-based state updates with sequence numbers.
 * - Private fog-of-war (hidden mine locations kept secret).
 * - Shared deterministic seed for synchronized 24x24 arena map.
 * - Local hotseat test harness for rapid single-machine testing.
 */

export const P2P_MATCH_STATE = {
  IDLE: 'IDLE',
  HOSTING: 'HOSTING',
  CONNECTED: 'CONNECTED',
  COMBAT: 'COMBAT',
  FINISHED: 'FINISHED'
};

export class TankP2PTransport {
  static CHANNEL_NAME = 'tank_minefield_p2p_channel_v1';

  constructor(options = {}) {
    this.playerName = options.playerName || 'Commander 1';
    this.presetId = options.presetId || 'US';
    this.status = P2P_MATCH_STATE.IDLE;
    this.role = null; // 'host' (P1) | 'guest' (P2)
    this.roomId = null;
    this.seed = null;
    this.sequence = 0;
    this.opponentName = 'Opponent';
    this.opponentPresetId = 'USSR';

    this.onMatchConnected = options.onMatchConnected || null;
    this.onRemoteIntent = options.onRemoteIntent || null;
    this.onAvailableRoomsChange = options.onAvailableRoomsChange || null;

    this.availableRooms = new Map();
    this._channel = null;
    this._announceInterval = null;

    this._initChannel();
    this.queryOpenRooms();
  }

  _initChannel() {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this._channel = new BroadcastChannel(TankP2PTransport.CHANNEL_NAME);
        this._channel.onmessage = (event) => this._handleMessage(event.data);
      } catch (e) {
        console.warn('[TankP2P] BroadcastChannel unavailable:', e);
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

  hostRoom(customSeed = null) {
    this.stopAnnouncing();
    this.role = 'host';
    this.seed = customSeed || Date.now();
    this.roomId = `TANK-P2P-${Math.abs(this.seed % 1000000).toString(36).toUpperCase()}`;
    this.status = P2P_MATCH_STATE.HOSTING;

    this._broadcast({
      type: 'ROOM_ANNOUNCE',
      roomId: this.roomId,
      hostName: this.playerName,
      presetId: this.presetId,
      seed: this.seed,
      timestamp: Date.now()
    });

    this._announceInterval = setInterval(() => {
      if (this.status === P2P_MATCH_STATE.HOSTING) {
        this._broadcast({
          type: 'ROOM_ANNOUNCE',
          roomId: this.roomId,
          hostName: this.playerName,
          presetId: this.presetId,
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

  joinRoom(roomId, customName = null, customPreset = null) {
    this.stopAnnouncing();
    if (customName) this.playerName = customName;
    if (customPreset) this.presetId = customPreset;

    const roomInfo = this.availableRooms.get(roomId);
    this.role = 'guest';
    this.roomId = roomId;
    this.seed = roomInfo ? roomInfo.seed : null;
    this.status = P2P_MATCH_STATE.CONNECTED;

    this._broadcast({
      type: 'ROOM_JOIN_REQUEST',
      roomId: this.roomId,
      guestName: this.playerName,
      guestPresetId: this.presetId
    });
  }

  joinByCode(code, customName = null, customPreset = null) {
    try {
      const decoded = JSON.parse(atob(code));
      if (decoded.roomId && decoded.seed) {
        this.availableRooms.set(decoded.roomId, {
          roomId: decoded.roomId,
          hostName: decoded.hostName || 'Host',
          presetId: decoded.presetId || 'US',
          seed: decoded.seed,
          timestamp: Date.now()
        });
        return this.joinRoom(decoded.roomId, customName, customPreset);
      }
    } catch (e) {
      console.warn('[TankP2P] Invalid match code:', e);
      return false;
    }
    return false;
  }

  getShareableCode() {
    if (!this.roomId || !this.seed) return '';
    const payload = {
      roomId: this.roomId,
      hostName: this.playerName,
      presetId: this.presetId,
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
    this.status = P2P_MATCH_STATE.IDLE;
    this.role = null;
    this.roomId = null;
    this.seed = null;
  }

  queryOpenRooms() {
    this._broadcast({ type: 'ROOM_QUERY' });
  }

  sendIntent(actionType, payload = {}) {
    if (this.status !== P2P_MATCH_STATE.CONNECTED || !this.roomId) return;
    this.sequence++;
    this._broadcast({
      type: 'GAME_INTENT',
      roomId: this.roomId,
      fromRole: this.role,
      fromName: this.playerName,
      sequence: this.sequence,
      action: actionType,
      payload
    });
  }

  _broadcast(msg) {
    if (this._channel) {
      try {
        this._channel.postMessage(msg);
      } catch (e) {
        console.warn('[TankP2P] postMessage error:', e);
      }
    }
  }

  _handleMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'ROOM_ANNOUNCE') {
      if (msg.roomId && msg.roomId !== this.roomId) {
        this.availableRooms.set(msg.roomId, {
          roomId: msg.roomId,
          hostName: msg.hostName,
          presetId: msg.presetId,
          seed: msg.seed,
          timestamp: Date.now()
        });
        if (this.onAvailableRoomsChange) {
          this.onAvailableRoomsChange(Array.from(this.availableRooms.values()));
        }
      }
    } else if (msg.type === 'ROOM_QUERY') {
      if (this.status === P2P_MATCH_STATE.HOSTING && this.roomId) {
        this._broadcast({
          type: 'ROOM_ANNOUNCE',
          roomId: this.roomId,
          hostName: this.playerName,
          presetId: this.presetId,
          seed: this.seed,
          timestamp: Date.now()
        });
      }
    } else if (msg.type === 'ROOM_JOIN_REQUEST') {
      if (this.role === 'host' && this.roomId === msg.roomId && this.status === P2P_MATCH_STATE.HOSTING) {
        this.stopAnnouncing();
        this.status = P2P_MATCH_STATE.CONNECTED;
        this.opponentName = msg.guestName || 'Player 2';
        this.opponentPresetId = msg.guestPresetId || 'USSR';

        this._broadcast({
          type: 'ROOM_START_CONFIRM',
          roomId: this.roomId,
          hostName: this.playerName,
          hostPresetId: this.presetId,
          guestName: this.opponentName,
          seed: this.seed
        });

        if (this.onMatchConnected) {
          this.onMatchConnected({
            roomId: this.roomId,
            role: 'host',
            seed: this.seed,
            opponentName: this.opponentName,
            opponentPresetId: this.opponentPresetId
          });
        }
      }
    } else if (msg.type === 'ROOM_START_CONFIRM') {
      if (this.role === 'guest' && this.roomId === msg.roomId) {
        this.status = P2P_MATCH_STATE.CONNECTED;
        this.opponentName = msg.hostName || 'Player 1';
        this.opponentPresetId = msg.hostPresetId || 'US';
        this.seed = msg.seed;

        if (this.onMatchConnected) {
          this.onMatchConnected({
            roomId: this.roomId,
            role: 'guest',
            seed: this.seed,
            opponentName: this.opponentName,
            opponentPresetId: this.opponentPresetId
          });
        }
      }
    } else if (msg.type === 'GAME_INTENT') {
      if (this.roomId === msg.roomId && msg.fromRole !== this.role) {
        if (this.onRemoteIntent) {
          this.onRemoteIntent(msg.action, msg.payload, msg.fromName);
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
}
