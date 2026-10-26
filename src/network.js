import Peer from 'peerjs';

const peerPrefix = 'skyline-';

export class NetworkManager {
  constructor(onStatus, onMessage, onRemoteState) {
    this.onStatus = onStatus;
    this.onMessage = onMessage;
    this.onRemoteState = onRemoteState;
    this.peer = null;
    this.connection = null;
    this.globalChannel = null;
    this.globalClient = null;
    this.lastStateSent = 0;
    this.game = null;
  }

  bindGame(game) {
    this.game = game;
  }

  createRoom() {
    this.disconnectRoom();
    const roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const peerId = `${peerPrefix}${roomCode.toLowerCase()}`;
    this.peer = new Peer(peerId, { debug: 0 });
    this.peer.on('open', () => {
      this.onStatus({ room: 'host', roomCode, message: `房间 ${roomCode} 已建立，等待对手` });
    });
    this.peer.on('connection', (connection) => this.attachConnection(connection));
    this.peer.on('error', (error) => this.onStatus({ room: 'error', message: this.describeError(error) }));
    return roomCode;
  }

  joinRoom(code) {
    const roomCode = code.trim().toLowerCase();
    if (!/^[a-z0-9]{6}$/.test(roomCode)) throw new Error('请输入 6 位房间码');
    this.disconnectRoom();
    this.peer = new Peer(undefined, { debug: 0 });
    this.peer.on('open', () => {
      const connection = this.peer.connect(`${peerPrefix}${roomCode}`, { reliable: true });
      this.attachConnection(connection, roomCode.toUpperCase());
    });
    this.peer.on('error', (error) => this.onStatus({ room: 'error', message: this.describeError(error) }));
  }

  attachConnection(connection, roomCode = '') {
    this.connection = connection;
    connection.on('open', () => {
      this.onStatus({ room: 'connected', roomCode, message: '对手已接入' });
      this.send({ type: 'hello', name: localStorage.getItem('skyline-pilot') || '飞行员' });
    });
    connection.on('data', (payload) => {
      if (!payload || typeof payload !== 'object') return;
      if (payload.type === 'state') this.onRemoteState(payload.state);
      else if (payload.type === 'chat') this.onMessage({ scope: 'room', ...payload.message });
      else if (payload.type === 'shot') this.game?.addRemoteShot(payload.position);
      else if (payload.type === 'damage') this.game?.damagePlayer(true);
      else if (payload.type === 'score') this.onStatus({ opponentHits: payload.hits });
      else if (payload.type === 'hello') this.onStatus({ opponentName: payload.name });
    });
    connection.on('close', () => {
      this.connection = null;
      this.onStatus({ room: 'closed', message: '对手已离开房间' });
    });
    connection.on('error', (error) => this.onStatus({ room: 'error', message: this.describeError(error) }));
  }

  send(payload) {
    if (this.connection?.open) this.connection.send(payload);
  }

  sendChat(message) {
    this.send({ type: 'chat', message });
  }

  tick(timestamp) {
    if (timestamp - this.lastStateSent < 50 || !this.game) return;
    this.lastStateSent = timestamp;
    this.send({ type: 'state', state: this.game.getNetworkState() });
  }

  disconnectRoom() {
    this.connection?.close();
    this.peer?.destroy();
    this.connection = null;
    this.peer = null;
    this.onRemoteState(null);
  }

  async connectGlobalChat() {
    if (this.globalChannel) return;
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      this.onStatus({ globalChat: 'unconfigured', message: '公共聊天室需在部署环境配置 Supabase' });
      return;
    }
    const { createClient } = await import('@supabase/supabase-js');
    this.globalClient = createClient(url, key);
    this.globalChannel = this.globalClient.channel('skyline-global-chat', {
      config: { broadcast: { self: false } },
    });
    this.globalChannel
      .on('broadcast', { event: 'message' }, ({ payload }) => this.onMessage({ scope: 'global', ...payload }))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') this.onStatus({ globalChat: 'connected', message: '公共聊天室已连接' });
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.onStatus({ globalChat: 'error', message: '公共聊天室暂时不可用' });
        }
      });
  }

  sendGlobalChat(message) {
    if (!this.globalChannel) return false;
    this.globalChannel.send({ type: 'broadcast', event: 'message', payload: message });
    return true;
  }

  async disconnect() {
    this.disconnectRoom();
    if (this.globalChannel) await this.globalClient.removeChannel(this.globalChannel);
  }

  describeError(error) {
    if (error.type === 'peer-unavailable') return '房间不存在或房主已离开';
    if (error.type === 'unavailable-id') return '房间码冲突，请重新创建';
    return '联机服务暂不可用，请稍后重试';
  }
}