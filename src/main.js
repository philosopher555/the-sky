import './style.css';
import { FlightGame } from './game.js';
import { NetworkManager } from './network.js';

const interfaceRoot = document.querySelector('#interface');
const storedCoins = Number(localStorage.getItem('skyline-coins')) || 0;
const storedName = localStorage.getItem('skyline-pilot') || `PILOT-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
localStorage.setItem('skyline-pilot', storedName);

const state = {
	coins: storedCoins,
	name: storedName,
	sensitivity: Number(localStorage.getItem('skyline-sensitivity')) || 100,
	best: Number(localStorage.getItem('skyline-best')) || 0,
	owned: JSON.parse(localStorage.getItem('skyline-planes') || '["cyan"]'),
	selectedPlane: localStorage.getItem('skyline-selected-plane') || 'cyan',
	screen: 'menu',
	panel: '',
	chatScope: 'global',
	room: 'none',
	roomCode: '',
	opponentHits: 0,
	globalChatStatus: 'unconfigured',
	messages: { global: [], room: [] },
	sound: true,
	sfx: null,
	hudTime: 0,
};

const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({
	'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

interfaceRoot.innerHTML = `
	<div class="vignette" aria-hidden="true"></div>
	<header class="topbar">
		<button class="brand" data-action="home" aria-label="返回主菜单"><span class="brand-mark">S</span><span>SKY<span class="brand-slash">//</span>LINE</span><small>RAIN CITY / 07</small></button>
		<div class="top-status"><span class="status-dot"></span><span id="connection-label">离线竞技</span><span class="top-divider"></span><span class="coin-count"><span class="coin-icon">¢</span><b id="coin-count">${state.coins}</b></span><button class="icon-button" data-action="settings" title="设置" aria-label="设置">⚙</button></div>
	</header>

	<section class="screen menu-screen" id="menu-screen">
		<div class="menu-copy">
			<div class="eyebrow"><span class="eyebrow-line"></span> NIGHT FLIGHT / SEASON 01</div>
			<h1>雨夜<span>空战</span></h1>
			<p class="menu-lede">穿越霓虹街谷，在暴雨和火线之间<br />成为最后留在天际线上的飞行员。</p>
			<div class="menu-actions">
				<button class="primary-button" data-action="start"><span>出击</span><span class="button-arrow">↗</span></button>
				<button class="secondary-button" data-action="online"><span class="tiny-signal">◉</span> 联机 1v1</button>
			</div>
			<div class="menu-links"><button data-action="help">操作说明 <span>↗</span></button><button data-action="shop">机库商城 <span>↗</span></button><button data-action="chat">公共聊天室 <span class="chat-status-dot" id="chat-status-dot"></span></button></div>
		</div>
		<div class="menu-aside">
			<div class="season-tag"><span>LIVE</span> SKYLINE CIRCUIT</div>
			<div class="flight-stats"><span class="stat-label">PERSONAL BEST</span><strong id="best-score">${String(state.best).padStart(2, '0')}</strong><span class="stat-foot">本地最高命中</span></div>
			<div class="weather-stamp"><span class="weather-symbol">〰</span><span>雨量 08.4 mm/h<br /><b>能见度 低</b></span></div>
			<div class="aside-coordinate">31°13' N&nbsp; 121°28' E</div>
		</div>
		<div class="menu-bottom"><span>NEON DISTRICT / SECTOR 07</span><span>3 MIN / FREE FLIGHT COMBAT</span><span class="key-hint"><kbd>ENTER</kbd> 出击</span></div>
	</section>

	<section class="game-hud" id="game-hud" hidden>
		<div class="hud-top">
			<div class="hud-stat"><span class="hud-label">命中</span><strong id="hud-hits">00</strong><span class="hud-unit">HIT</span></div>
			<div class="hud-time"><span>剩余时间</span><strong id="hud-time">03:00</strong><div class="time-track"><i id="time-progress"></i></div></div>
			<div class="hud-stat hud-speed"><span class="hud-label">速度</span><strong id="hud-speed">052</strong><span class="hud-unit">KM/H</span></div>
			<div class="duel-score" id="duel-score" hidden>对手 <strong id="hud-opponent-hits">00</strong></div>
			<button class="icon-button pause-button" data-action="pause" title="暂停 (Esc)" aria-label="暂停">Ⅱ</button>
		</div>
		<div class="target-reticle"><i></i><b></b><span></span></div>
		<div class="hud-left-bottom"><span id="flight-mode">AI CIRCUIT</span><div class="boost-meter"><i id="boost-progress"></i></div><span>BOOST</span></div>
		<div class="hud-right-bottom"><span class="hud-item-label">E / 道具</span><button class="item-button" data-action="item" aria-label="使用道具"><span>✦</span><b id="item-count">01</b></button></div>
		<div class="hit-flash" id="hit-flash"></div>
		<div class="offline-alert" id="offline-alert" hidden><strong>系统离线</strong><span>重新接入 <b id="offline-time">2.0</b>s</span></div>
		<div class="touch-controls" id="touch-controls">
			<div class="joystick" id="joystick"><div class="joystick-ring"><i id="joystick-knob"></i></div><span>转向</span></div>
			<div class="touch-actions"><button class="touch-fire" data-action="fire"><span>◎</span><b>开火</b></button><button data-action="boost">加速</button><button data-action="item">道具</button></div>
		</div>
		<div class="hud-help"><kbd>W</kbd><kbd>S</kbd> 油门 <span>·</span> <kbd>SHIFT</kbd> 加速 <span>·</span> <kbd>E</kbd> 道具</div>
	</section>

	<section class="screen result-screen" id="result-screen" hidden>
		<div class="result-panel"><div class="eyebrow"><span class="eyebrow-line"></span> FLIGHT COMPLETE</div><h2>飞行结束</h2><p>雨停之前，你留下了自己的记录。</p><div class="result-score"><strong id="result-hits">00</strong><span>命中数</span></div><div class="result-reward">获得 <b id="result-coins">+0</b> 枚霓虹币</div><div class="result-actions"><button class="primary-button" data-action="restart">再次出击 <span class="button-arrow">↗</span></button><button class="secondary-button" data-action="home">返回基地</button></div></div>
	</section>

	<div class="overlay" id="overlay" hidden><section class="dialog" id="dialog" role="dialog" aria-modal="true"></section></div>
	<div class="toast" id="toast" aria-live="polite"></div>
`;

const game = new FlightGame(document.querySelector('#flight-scene'), handleGameEvent);
game.setPlayerSkin(state.selectedPlane);
game.setSensitivity(state.sensitivity / 100);
const network = new NetworkManager(handleNetworkStatus, handleNetworkMessage, game.setRemoteState.bind(game));
network.bindGame(game);
network.connectGlobalChat();

function showToast(message) {
	const toast = document.querySelector('#toast');
	toast.textContent = message;
	toast.classList.add('visible');
	clearTimeout(showToast.timeout);
	showToast.timeout = setTimeout(() => toast.classList.remove('visible'), 2500);
}

function setScreen(screen) {
	state.screen = screen;
	document.querySelector('#menu-screen').hidden = screen !== 'menu';
	document.querySelector('#game-hud').hidden = screen !== 'game';
	document.querySelector('#result-screen').hidden = screen !== 'result';
	document.querySelector('#connection-label').textContent = state.room === 'connected' ? '1v1 已连接' : '离线竞技';
}

function closePanel() {
	document.querySelector('#overlay').hidden = true;
	state.panel = '';
	game.setPaused(false);
	if (state.screen === 'game') document.querySelector('#game-hud').classList.remove('is-paused');
}

function openPanel(name) {
	state.panel = name;
	game.setPaused(true);
	document.querySelector('#game-hud').classList.add('is-paused');
	const overlay = document.querySelector('#overlay');
	const dialog = document.querySelector('#dialog');
	overlay.hidden = false;

	if (name === 'pause') {
		dialog.innerHTML = `<button class="dialog-close" data-action="resume" aria-label="继续">×</button><div class="eyebrow"><span class="eyebrow-line"></span> FLIGHT PAUSED</div><h2>暂离航线</h2><p>街谷还在下雨，等你回来。</p><div class="dialog-actions"><button class="primary-button" data-action="resume">继续飞行 <span class="button-arrow">↗</span></button><button class="secondary-button" data-action="home">退出比赛</button></div>`;
	} else if (name === 'help') {
		dialog.innerHTML = `<button class="dialog-close" data-action="close" aria-label="关闭">×</button><div class="eyebrow"><span class="eyebrow-line"></span> FLIGHT MANUAL</div><h2>操作说明</h2><div class="control-list"><div><span>鼠标移动</span><b>转向 / 瞄准</b></div><div><span>鼠标左键</span><b>连续开火</b></div><div><span>W / S</span><b>加速 / 减速</b></div><div><span>SHIFT</span><b>短时加速</b></div><div><span>E</span><b>释放电磁脉冲</b></div><div><span>ESC</span><b>暂停 / 返回</b></div><div><span>方向键 / ENTER</span><b>菜单选择 / 确认</b></div><div><span>虚拟摇杆</span><b>桌面与手机均可拖动转向，右侧按钮开火/加速/使用道具</b></div></div><button class="primary-button dialog-wide" data-action="close">明白了 <span class="button-arrow">↗</span></button>`;
	} else if (name === 'settings') {
		dialog.innerHTML = `<button class="dialog-close" data-action="close" aria-label="关闭">×</button><div class="eyebrow"><span class="eyebrow-line"></span> FLIGHT SETTINGS</div><h2>飞行设置</h2><div class="settings-list"><label><span>飞行员代号</span><input id="pilot-name" maxlength="16" value="${esc(state.name)}" /></label><label><span>音效</span><input id="sound-toggle" type="checkbox" ${state.sound ? 'checked' : ''} /></label><label><span>灵敏度</span><input id="sensitivity" type="range" min="60" max="140" value="${state.sensitivity}" /></label></div><button class="primary-button dialog-wide" data-action="save-settings">保存设置 <span class="button-arrow">↗</span></button>`;
	} else if (name === 'shop') {
		const planes = [
			{ id: 'cyan', name: '深空青', price: 0, color: '#50f1e1', description: '标准涂装' },
			{ id: 'pink', name: '霓虹玫', price: 60, color: '#ff4f9a', description: '热区限定' },
			{ id: 'gold', name: '雨夜金', price: 120, color: '#ffc857', description: '黄金航迹' },
		];
		dialog.innerHTML = `<button class="dialog-close" data-action="close" aria-label="关闭">×</button><div class="eyebrow"><span class="eyebrow-line"></span> HANGAR / EXCHANGE</div><h2>机库商城</h2><div class="shop-balance"><span>可用霓虹币</span><strong>¢ ${state.coins}</strong></div><div class="plane-list">${planes.map((plane) => `<article class="plane-item ${state.selectedPlane === plane.id ? 'selected' : ''}"><span class="plane-swatch" style="--swatch:${plane.color}">✦</span><div><strong>${plane.name}</strong><small>${plane.description}</small></div><button data-action="plane" data-plane="${plane.id}" ${state.owned.includes(plane.id) ? '' : state.coins < plane.price ? 'disabled' : ''}>${state.owned.includes(plane.id) ? state.selectedPlane === plane.id ? '使用中' : '选择' : `¢ ${plane.price}`}</button></article>`).join('')}</div><p class="shop-note">比赛命中可获得霓虹币，涂装会保存在本机。</p>`;
	} else if (name === 'online') {
		dialog.innerHTML = `<button class="dialog-close" data-action="close" aria-label="关闭">×</button><div class="eyebrow"><span class="eyebrow-line"></span> ONLINE DUEL</div><h2>联机 1v1</h2><p>创建房间并把 6 位房间码发给对手。双方通过浏览器直连。</p><div class="room-actions"><button class="primary-button" data-action="create-room">创建房间 <span class="button-arrow">↗</span></button><div class="room-join"><input id="room-code" maxlength="6" placeholder="输入房间码" /><button data-action="join-room">加入</button></div></div><div class="room-status" id="room-status">${state.roomCode ? `房间码 <strong>${esc(state.roomCode)}</strong>` : '使用 PeerJS 公共信令服务，连接双方需保持页面开启。'}</div><button class="secondary-button dialog-wide" data-action="start">单人出击</button>`;
	} else if (name === 'chat') {
		const chat = state.messages[state.chatScope];
		const globalStateLabel = state.globalChatStatus === 'connected' ? '所有飞行员在线' : '等待聊天室配置';
		dialog.innerHTML = `<button class="dialog-close" data-action="close" aria-label="关闭">×</button><div class="eyebrow"><span class="eyebrow-line"></span> COMMS / SKYLINE</div><h2>通讯频道</h2><div class="chat-tabs"><button data-action="chat-scope" data-scope="global" class="${state.chatScope === 'global' ? 'active' : ''}">公共频道</button><button data-action="chat-scope" data-scope="room" class="${state.chatScope === 'room' ? 'active' : ''}">对战房间</button><span>${state.chatScope === 'global' ? globalStateLabel : state.room === 'connected' ? '对手已连接' : '尚未加入房间'}</span></div><div class="chat-feed" id="chat-feed">${chat.length ? chat.map(renderMessage).join('') : `<div class="chat-empty">${state.chatScope === 'global' ? state.globalChatStatus === 'connected' ? '暂无消息，发送第一条通讯。' : '公共频道需要配置 Supabase 才能连接。' : '加入 1v1 房间后，可与对手通讯。'}</div>`}</div><form class="chat-compose" id="chat-form"><input id="chat-input" maxlength="160" autocomplete="off" placeholder="发送消息..." /><button type="submit" aria-label="发送">↗</button></form>`;
	}
	requestAnimationFrame(() => dialog.querySelector('button, input')?.focus());
}

function renderMessage(message) {
	const time = new Date(message.at || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
	return `<article class="chat-message"><div><strong>${esc(message.name || '飞行员')}</strong><time>${time}</time></div><p>${esc(message.text)}</p></article>`;
}

function handleGameEvent(type, detail = {}) {
	if (type === 'start') {
		closePanel();
		setScreen('game');
		document.querySelector('#flight-mode').textContent = state.room === 'connected' ? '1V1 DUEL' : 'AI CIRCUIT';
		return;
	}
	if (type === 'shot') network.send({ type: 'shot', position: detail.position });
	if (type === 'hit') {
		state.coins += 5;
		localStorage.setItem('skyline-coins', state.coins);
		document.querySelector('#coin-count').textContent = state.coins;
		network.send({ type: 'score', hits: detail.hits });
		if (detail.hits % 3 === 0) game.player.item = Math.min(3, game.player.item + 1);
		showToast('命中确认  +5 霓虹币');
	}
	if (type === 'player-hit') {
		if (!detail.remote) network.send({ type: 'damage' });
		playTone(120, 0.18, 'sawtooth');
		showToast('战机受损，系统离线 2 秒');
		document.querySelector('#hit-flash').classList.add('flash');
		setTimeout(() => document.querySelector('#hit-flash').classList.remove('flash'), 260);
	}
	if (type === 'player-back') showToast('系统恢复，重新接入战斗');
	if (type === 'remote-hit') showToast('对手战机受击');
	if (type === 'item') playTone(510, 0.16, 'triangle');
	if (type === 'finish') finishMatch(detail.hits);
}

function handleNetworkStatus(update) {
	if (update.room) state.room = update.room;
	if (update.roomCode) state.roomCode = update.roomCode;
	if (update.globalChat) state.globalChatStatus = update.globalChat;
	if (typeof update.opponentHits === 'number') state.opponentHits = update.opponentHits;
		const opponentScore = document.querySelector('#hud-opponent-hits');
		if (opponentScore && typeof update.opponentHits === 'number') opponentScore.textContent = String(update.opponentHits).padStart(2, '0');
	if (update.message && update.room !== 'connected') showToast(update.message);
	const connectionLabel = document.querySelector('#connection-label');
	if (connectionLabel) connectionLabel.textContent = state.room === 'connected' ? '1v1 已连接' : '离线竞技';
	const dot = document.querySelector('#chat-status-dot');
	if (dot) dot.classList.toggle('online', state.globalChatStatus === 'connected');
	const duelScore = document.querySelector('#duel-score');
	if (duelScore) duelScore.hidden = state.room !== 'connected';
	if (state.panel === 'online' && update.roomCode) openPanel('online');
	if (state.panel === 'online' && update.message) {
		const roomStatus = document.querySelector('#room-status');
		if (roomStatus) roomStatus.textContent = update.message;
	}
	if (state.panel === 'chat' && update.globalChat) openPanel('chat');
}

function handleNetworkMessage(message) {
	const scope = message.scope || 'room';
	if (!state.messages[scope]) state.messages[scope] = [];
	state.messages[scope].push(message);
	state.messages[scope] = state.messages[scope].slice(-60);
	if (state.panel === 'chat' && state.chatScope === scope) {
		const feed = document.querySelector('#chat-feed');
		if (feed) {
			feed.insertAdjacentHTML('beforeend', renderMessage(message));
			feed.scrollTop = feed.scrollHeight;
		}
	}
}

function finishMatch(hits) {
	const reward = 10 + hits * 5;
	state.coins += reward;
	state.best = Math.max(state.best, hits);
	localStorage.setItem('skyline-coins', state.coins);
	localStorage.setItem('skyline-best', state.best);
	document.querySelector('#result-hits').textContent = String(hits).padStart(2, '0');
	document.querySelector('#result-coins').textContent = `+${reward}`;
	document.querySelector('#coin-count').textContent = state.coins;
	document.querySelector('#best-score').textContent = String(state.best).padStart(2, '0');
	setScreen('result');
}

function playTone(frequency, duration, wave = 'sine') {
	if (!state.sound) return;
	try {
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		state.sfx ||= new AudioContextClass();
		const oscillator = state.sfx.createOscillator();
		const gain = state.sfx.createGain();
		oscillator.type = wave;
		oscillator.frequency.value = frequency;
		gain.gain.setValueAtTime(0.035, state.sfx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, state.sfx.currentTime + duration);
		oscillator.connect(gain).connect(state.sfx.destination);
		oscillator.start();
		oscillator.stop(state.sfx.currentTime + duration);
	} catch {}
}

function startMatch() {
	closePanel();
	game.start();
}

function returnHome() {
	closePanel();
	game.active = false;
	network.disconnectRoom();
	state.room = 'none';
	state.roomCode = '';
	setScreen('menu');
}

interfaceRoot.addEventListener('click', (event) => {
	const button = event.target.closest('[data-action]');
	if (!button) return;
	const action = button.dataset.action;
	if (action === 'start' || action === 'restart') startMatch();
	else if (action === 'home') returnHome();
	else if (action === 'pause') openPanel('pause');
	else if (action === 'resume' || action === 'close') closePanel();
	else if (action === 'help' || action === 'settings' || action === 'shop' || action === 'online' || action === 'chat') openPanel(action);
	else if (action === 'item') {
		if (!game.useItem()) showToast('电磁脉冲尚未充能');
		else document.querySelector('#item-count').textContent = String(game.player.item).padStart(2, '0');
	} else if (action === 'create-room') {
		try {
			network.createRoom();
			showToast('正在创建 1v1 房间...');
		} catch {
			showToast('房间创建失败，请检查网络连接');
		}
	} else if (action === 'join-room') {
		const code = document.querySelector('#room-code')?.value || '';
		try {
			network.joinRoom(code);
			showToast('正在连接对手...');
		} catch (error) {
			showToast(error.message);
		}
	} else if (action === 'chat-scope') {
		state.chatScope = button.dataset.scope;
		openPanel('chat');
	} else if (action === 'save-settings') {
		const name = document.querySelector('#pilot-name').value.trim().slice(0, 16);
		if (name) {
			state.name = name;
			localStorage.setItem('skyline-pilot', name);
		}
		state.sound = document.querySelector('#sound-toggle').checked;
		state.sensitivity = Number(document.querySelector('#sensitivity').value);
		localStorage.setItem('skyline-sensitivity', state.sensitivity);
		game.setSensitivity(state.sensitivity / 100);
		closePanel();
		showToast('飞行设置已保存');
	} else if (action === 'plane') {
		const plane = button.dataset.plane;
		const price = { cyan: 0, pink: 60, gold: 120 }[plane];
		if (!state.owned.includes(plane)) {
			if (state.coins < price) return showToast('霓虹币不足');
			state.coins -= price;
			state.owned.push(plane);
			localStorage.setItem('skyline-coins', state.coins);
			localStorage.setItem('skyline-planes', JSON.stringify(state.owned));
		}
		state.selectedPlane = plane;
		game.setPlayerSkin(plane);
		localStorage.setItem('skyline-selected-plane', plane);
		document.querySelector('#coin-count').textContent = state.coins;
		openPanel('shop');
	} else if (action === 'fire') game.setFiring(true);
	else if (action === 'boost') game.setBoost(!game.input.boosting);
});

interfaceRoot.addEventListener('submit', (event) => {
	if (event.target.id !== 'chat-form') return;
	event.preventDefault();
	const input = document.querySelector('#chat-input');
	const text = input.value.trim().slice(0, 160);
	if (!text) return;
	const message = { name: state.name, text, at: Date.now() };
	if (state.chatScope === 'global') {
		if (!network.sendGlobalChat(message)) return showToast('公共聊天室尚未配置');
	} else {
		if (state.room !== 'connected') return showToast('请先加入 1v1 房间');
		network.sendChat(message);
	}
	handleNetworkMessage({ scope: state.chatScope, ...message });
	input.value = '';
});

interfaceRoot.addEventListener('pointerdown', (event) => {
	if (event.target.closest('[data-action="fire"]')) game.setFiring(true);
	if (event.target.closest('#joystick')) {
		event.preventDefault();
		event.target.closest('#joystick').setPointerCapture(event.pointerId);
		updateJoystick(event);
	}
});
interfaceRoot.addEventListener('pointermove', (event) => {
	if (event.target.closest('#joystick') || document.querySelector('#joystick')?.hasPointerCapture(event.pointerId)) updateJoystick(event);
});
interfaceRoot.addEventListener('pointerup', (event) => {
	game.setFiring(false);
	if (document.querySelector('#joystick')?.hasPointerCapture(event.pointerId)) {
		document.querySelector('#joystick').releasePointerCapture(event.pointerId);
		game.input.steerX = 0;
		game.input.steerY = 0;
		document.querySelector('#joystick-knob').style.transform = 'translate(0, 0)';
	}
});

function updateJoystick(event) {
	const joystick = document.querySelector('#joystick');
	const rect = joystick.getBoundingClientRect();
	const dx = event.clientX - (rect.left + rect.width / 2);
	const dy = event.clientY - (rect.top + rect.height / 2);
	const radius = Math.min(rect.width, rect.height) * 0.34;
	const length = Math.min(Math.hypot(dx, dy), radius);
	const angle = Math.atan2(dy, dx);
	const x = Math.cos(angle) * length;
	const y = Math.sin(angle) * length;
	document.querySelector('#joystick-knob').style.transform = `translate(${x}px, ${y}px)`;
	game.input.steerX = x / radius;
	game.input.steerY = -y / radius;
}

document.addEventListener('pointermove', (event) => {
	if (state.screen !== 'game' || event.pointerType !== 'mouse' || state.panel) return;
	const x = (event.clientX / window.innerWidth - 0.5) * 2;
	const y = (event.clientY / window.innerHeight - 0.5) * 2;
	game.steer(x, -y);
});
document.querySelector('#flight-scene').addEventListener('pointerdown', (event) => {
	if (event.button === 0 && state.screen === 'game' && !state.panel) game.setFiring(true);
});
document.addEventListener('pointerup', () => game.setFiring(false));

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		if (state.panel) closePanel();
		else if (state.screen === 'game') openPanel('pause');
		else if (state.screen === 'result') returnHome();
		else if (state.screen === 'menu') closePanel();
		return;
	}
	if (state.panel) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			cycleFocus(event.key === 'ArrowDown' ? 1 : -1);
		}
		if (event.key === 'Enter') document.activeElement?.click();
		return;
	}
	if (state.screen === 'menu') {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			cycleFocus(event.key === 'ArrowDown' ? 1 : -1, document.querySelector('#menu-screen'));
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			const focusedButton = document.activeElement?.closest('#menu-screen button');
			if (focusedButton) focusedButton.click();
			else startMatch();
		}
		return;
	}
	if (event.code === 'KeyW') game.setThrottle(1);
	if (event.code === 'KeyS') game.setThrottle(-1);
	if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') game.setBoost(true);
	if (event.code === 'KeyE') document.querySelector('[data-action="item"]')?.click();
});
document.addEventListener('keyup', (event) => {
	if (event.code === 'KeyW' || event.code === 'KeyS') game.setThrottle(0);
	if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') game.setBoost(false);
});

function cycleFocus(direction, scope = document.querySelector('#dialog')) {
	const items = [...scope.querySelectorAll('button:not(:disabled), input:not(:disabled)')].filter((item) => item.offsetParent !== null);
	if (!items.length) return;
	const current = items.indexOf(document.activeElement);
	items[(current + direction + items.length) % items.length].focus();
}

function updateHud(delta) {
	if (state.screen !== 'game') return;
	const player = game.player;
	state.hudTime += delta;
	if (state.hudTime < 0.1) return;
	state.hudTime = 0;
	const minutes = Math.floor(game.timer / 60).toString().padStart(2, '0');
	const seconds = Math.floor(game.timer % 60).toString().padStart(2, '0');
	document.querySelector('#hud-time').textContent = `${minutes}:${seconds}`;
	document.querySelector('#time-progress').style.width = `${(game.timer / 180) * 100}%`;
	document.querySelector('#hud-hits').textContent = String(player.hits).padStart(2, '0');
	document.querySelector('#hud-speed').textContent = String(Math.round(player.speed)).padStart(3, '0');
	document.querySelector('#boost-progress').style.width = `${Math.min(100, ((player.speed - 28) / 54) * 100)}%`;
	document.querySelector('#item-count').textContent = String(player.item).padStart(2, '0');
	document.querySelector('#offline-alert').hidden = player.offline <= 0;
	document.querySelector('#offline-time').textContent = player.offline.toFixed(1);
}

let previousTime = performance.now();
function appFrame(time) {
	const delta = Math.min((time - previousTime) / 1000, 0.05);
	previousTime = time;
	updateHud(delta);
	network.tick(time);
	requestAnimationFrame(appFrame);
}
requestAnimationFrame(appFrame);

document.querySelector('#menu-screen').addEventListener('focusin', (event) => {
	if (!event.target.matches('button')) return;
	event.target.classList.add('keyboard-focus');
});