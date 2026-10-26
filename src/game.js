import * as THREE from 'three';

const COLORS = {
  cyan: 0x48f4e3,
  pink: 0xff4f9a,
  amber: 0xffc857,
  ink: 0x071015,
};
const PLANE_COLORS = { cyan: COLORS.cyan, pink: COLORS.pink, gold: COLORS.amber };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const random = (min, max) => min + Math.random() * (max - min);

function makePlane(color = COLORS.cyan, scale = 1) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.78,
    roughness: 0.24,
    emissive: color,
    emissiveIntensity: 0.12,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x0b1820, metalness: 0.7, roughness: 0.28 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.46 * scale, 3.3 * scale, 4), bodyMaterial);
  body.rotation.x = -Math.PI / 2;
  body.position.z = -0.15 * scale;
  group.add(body);

  const wings = new THREE.Mesh(new THREE.BoxGeometry(5.3 * scale, 0.12 * scale, 1.1 * scale), bodyMaterial);
  wings.rotation.z = -0.08;
  group.add(wings);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(2.2 * scale, 0.1 * scale, 0.72 * scale), darkMaterial);
  tail.position.set(0, 0.05 * scale, 1.25 * scale);
  group.add(tail);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.48 * scale, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x9dfaf2, metalness: 0.45, roughness: 0.16, emissive: 0x217c80, emissiveIntensity: 0.6 }),
  );
  canopy.scale.set(0.7, 0.46, 1.4);
  canopy.position.set(0, 0.32 * scale, -0.16 * scale);
  group.add(canopy);

  for (const side of [-1, 1]) {
    const engine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12 * scale, 0.19 * scale, 0.72 * scale, 8),
      new THREE.MeshBasicMaterial({ color: side < 0 ? COLORS.cyan : COLORS.pink }),
    );
    engine.rotation.x = Math.PI / 2;
    engine.position.set(side * 0.78 * scale, -0.03 * scale, 0.9 * scale);
    group.add(engine);
  }
  group.userData.bodyMaterial = bodyMaterial;
  return group;
}

function neonTexture(label, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  context.fillStyle = '#071015';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = color;
  context.lineWidth = 6;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.shadowColor = color;
  context.shadowBlur = 22;
  context.fillStyle = '#f0ffff';
  context.font = 'bold 76px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, canvas.width / 2, canvas.height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeBuilding(x, z) {
  const width = random(7, 13);
  const depth = random(9, 17);
  const height = random(20, 53);
  const color = new THREE.Color().setHSL(random(0.48, 0.62), random(0.18, 0.35), random(0.08, 0.16));
  const group = new THREE.Group();
  group.position.set(x, -14 + height / 2, z);
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, metalness: 0.62, roughness: 0.42 }),
  );
  group.add(shell);

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.12, 0.14, depth + 0.12),
    new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? COLORS.cyan : COLORS.pink }),
  );
  edge.position.y = height / 2 - 0.5;
  group.add(edge);

  const rows = Math.floor(height / 3.4);
  const columns = Math.max(2, Math.floor(width / 2.1));
  const windowPositions = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (Math.random() > 0.52) continue;
      windowPositions.push({
        x: -width / 2 + ((column + 0.5) * width) / columns,
        y: -height / 2 + 2 + row * 3.4,
      });
    }
  }
  if (windowPositions.length) {
    const geometry = new THREE.PlaneGeometry(0.62, 1.2);
    const windows = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: Math.random() > 0.45 ? 0x23acae : 0xf29262 }),
      windowPositions.length,
    );
    const matrix = new THREE.Matrix4();
    windowPositions.forEach((position, index) => {
      matrix.makeTranslation(position.x, position.y, depth / 2 + 0.015);
      windows.setMatrixAt(index, matrix);
    });
    group.add(windows);
  }

  if (height > 28 && Math.random() > 0.35) {
    const labels = ['NOVA', '雨町', '07 / SKY', 'NEON', '雲端'];
    const colorHex = Math.random() > 0.5 ? '#51f7e4' : '#ff5b9d';
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(width * 0.9, 8), 2.2),
      new THREE.MeshBasicMaterial({ map: neonTexture(labels[Math.floor(Math.random() * labels.length)], colorHex), side: THREE.DoubleSide }),
    );
    sign.position.set(x > 0 ? -width / 2 - 0.08 : width / 2 + 0.08, random(-1, height / 2 - 3), 0);
    sign.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);
  }

  return group;
}

export class FlightGame {
  constructor(canvas, onEvent) {
    this.canvas = canvas;
    this.onEvent = onEvent;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.ink);
    this.scene.fog = new THREE.FogExp2(0x081319, 0.012);
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 700);
    this.camera.position.set(0, 3.2, 9);

    this.clock = new THREE.Clock();
    this.active = false;
    this.paused = false;
    this.player = { x: 0, y: 0, vx: 0, vy: 0, speed: 52, hits: 0, online: 0, offline: 0, boost: 0, item: 1, invincible: 0 };
    this.input = { targetX: 0, targetY: 0, throttle: 0, boosting: false, firing: false, steerX: 0, steerY: 0 };
    this.sensitivity = 1;
    this.timer = 180;
    this.bullets = [];
    this.effects = [];
    this.ai = [];
    this.buildings = [];
    this.intersections = [];
    this.roadMarks = [];
    this.roadTime = 0;
    this.frame = this.frame.bind(this);
    this.setupScene();
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    requestAnimationFrame(this.frame);
  }

  setupScene() {
    this.scene.add(new THREE.HemisphereLight(0x8adbd5, 0x141522, 1.55));
    const moon = new THREE.DirectionalLight(0x9fdbff, 2.2);
    moon.position.set(-12, 35, 20);
    this.scene.add(moon);
    const pinkLight = new THREE.PointLight(COLORS.pink, 30, 70, 2);
    pinkLight.position.set(-15, 8, -25);
    this.scene.add(pinkLight);
    const cyanLight = new THREE.PointLight(COLORS.cyan, 32, 80, 2);
    cyanLight.position.set(15, 6, -60);
    this.scene.add(cyanLight);

    this.playerPlane = makePlane(COLORS.cyan);
    this.scene.add(this.playerPlane);
    this.remotePlane = makePlane(COLORS.pink, 0.92);
    this.remotePlane.visible = false;
    this.scene.add(this.remotePlane);

    this.addStreet();
    this.addCity();
    this.addRain();
    this.spawnAI(4);
  }

  addStreet() {
    const street = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 900),
      new THREE.MeshStandardMaterial({ color: 0x101b23, metalness: 0.8, roughness: 0.18, envMapIntensity: 1.4 }),
    );
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, -14, -400);
    this.scene.add(street);

    for (const x of [-14.2, 14.2]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.2, 900),
        new THREE.MeshBasicMaterial({ color: x < 0 ? COLORS.pink : COLORS.cyan }),
      );
      rail.position.set(x, -13.6, -400);
      this.scene.add(rail);
    }
    for (const x of [-1.1, 1.1]) {
      for (let index = 0; index < 32; index += 1) {
        const mark = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.025, 4 + Math.random() * 2),
          new THREE.MeshBasicMaterial({ color: 0x9dc9c7, transparent: true, opacity: 0.25 }),
        );
        mark.position.set(x, -13.97, -index * 25);
        this.scene.add(mark);
        this.roadMarks.push(mark);
      }
    }

    const crossingMaterial = new THREE.MeshStandardMaterial({ color: 0x17242a, metalness: 0.72, roughness: 0.24 });
    for (let index = 0; index < 5; index += 1) {
      const intersection = new THREE.Group();
      intersection.position.z = -90 - index * 160;

      const sideRoad = new THREE.Mesh(new THREE.PlaneGeometry(100, 26), crossingMaterial);
      sideRoad.rotation.x = -Math.PI / 2;
      sideRoad.position.y = -13.93;
      intersection.add(sideRoad);

      for (const z of [-5.5, 5.5]) {
        const lane = new THREE.Mesh(
          new THREE.BoxGeometry(96, 0.035, 0.08),
          new THREE.MeshBasicMaterial({ color: z < 0 ? COLORS.cyan : COLORS.pink }),
        );
        lane.position.set(0, -13.86, z);
        intersection.add(lane);
      }

      for (const z of [-11.5, 11.5]) {
        for (let stripe = 0; stripe < 13; stripe += 1) {
          const crosswalk = new THREE.Mesh(
            new THREE.BoxGeometry(1.7, 0.04, 1.1),
            new THREE.MeshBasicMaterial({ color: 0xb9d4cf, transparent: true, opacity: 0.62 }),
          );
          crosswalk.position.set(-15.6 + stripe * 2.6, -13.85, z);
          intersection.add(crosswalk);
        }
      }

      this.intersections.push(intersection);
      this.scene.add(intersection);
    }
  }

  addCity() {
    for (let index = 0; index < 50; index += 1) {
      if (index % 10 === 4 || index % 10 === 5) continue;
      const z = -18 - index * 16;
      for (const side of [-1, 1]) {
        this.buildings.push(makeBuilding(side * random(19, 33), z + random(-5, 5)));
      }
    }
    this.buildings.forEach((building) => this.scene.add(building));
  }

  addRain() {
    const count = 1200;
    const positions = new Float32Array(count * 6);
    for (let index = 0; index < count; index += 1) {
      const offset = index * 6;
      const x = random(-42, 42);
      const y = random(-16, 55);
      const z = random(-170, 20);
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
      positions[offset + 3] = x - 0.11;
      positions[offset + 4] = y - 1.5;
      positions[offset + 5] = z;
    }
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.LineSegments(
      this.rainGeometry,
      new THREE.LineBasicMaterial({ color: 0x91d8de, transparent: true, opacity: 0.36 }),
    );
    this.scene.add(this.rain);
  }

  spawnAI(count = 1) {
    for (let index = 0; index < count; index += 1) {
      const mesh = makePlane(COLORS.pink, 0.82);
      const ai = {
        mesh,
        x: random(-12, 12),
        y: random(-1, 5),
        z: random(-85, -32),
        phase: random(0, Math.PI * 2),
        fireAt: random(2, 5),
        alive: true,
        respawn: 0,
      };
      mesh.position.set(ai.x, ai.y, ai.z);
      mesh.rotation.y = Math.PI;
      this.ai.push(ai);
      this.scene.add(mesh);
    }
  }

  start() {
    this.player.hits = 0;
    this.player.offline = 0;
    this.player.online = 0;
    this.player.invincible = 2;
    this.player.speed = 52;
    this.player.x = 0;
    this.player.y = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.input.targetX = 0;
    this.input.targetY = 0;
    this.timer = 180;
    this.active = true;
    this.paused = false;
    this.bullets.forEach((bullet) => this.scene.remove(bullet.mesh));
    this.bullets = [];
    this.onEvent('start');
  }

  setPaused(paused) {
    this.paused = paused;
  }

  steer(normalizedX, normalizedY) {
    this.input.targetX = clamp(normalizedX, -0.92, 0.92) * 13 * this.sensitivity;
    this.input.targetY = clamp(normalizedY, -0.8, 0.8) * 7 * this.sensitivity;
  }

  setSensitivity(value) {
    this.sensitivity = clamp(value, 0.6, 1.4);
  }

  setPlayerSkin(skin) {
    const color = PLANE_COLORS[skin] || PLANE_COLORS.cyan;
    this.playerPlane.userData.bodyMaterial.color.setHex(color);
    this.playerPlane.userData.bodyMaterial.emissive.setHex(color);
  }

  setThrottle(value) {
    this.input.throttle = clamp(value, -1, 1);
  }

  setBoost(value) {
    this.input.boosting = value;
  }

  setFiring(value) {
    this.input.firing = value;
  }

  useItem() {
    if (!this.active || this.paused || this.player.item <= 0) return false;
    this.player.item -= 1;
    for (const ai of this.ai) {
      if (!ai.alive) continue;
      const glow = new THREE.PointLight(COLORS.cyan, 14, 18);
      glow.position.copy(ai.mesh.position);
      this.scene.add(glow);
      this.effects.push({ mesh: glow, life: 0.45, maxLife: 0.45 });
      this.destroyAI(ai, false);
    }
    this.onEvent('item');
    return true;
  }

  emit(type, detail = {}) {
    this.onEvent(type, detail);
  }

  shoot(fromPlayer = true, origin = null) {
    const color = fromPlayer ? COLORS.cyan : COLORS.pink;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(fromPlayer ? 0.19 : 0.23, 8, 8),
      new THREE.MeshBasicMaterial({ color }),
    );
    const light = new THREE.PointLight(color, 2.6, 7, 2);
    mesh.add(light);
    mesh.position.copy(origin || this.playerPlane.position);
    mesh.position.z += fromPlayer ? -2 : 1;
    this.scene.add(mesh);
    this.bullets.push({ mesh, owner: fromPlayer ? 'player' : 'ai', speed: fromPlayer ? -150 : 64, life: 3 });
    if (fromPlayer) this.emit('shot', {
      position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
    });
  }

  destroyAI(ai, award = true) {
    ai.alive = false;
    ai.mesh.visible = false;
    ai.respawn = 2.4;
    if (award) {
      this.player.hits += 1;
      this.player.online += 1;
      this.emit('hit', { hits: this.player.hits });
    }
  }

  damagePlayer(remote = false) {
    if (this.player.offline > 0 || this.player.invincible > 0) return;
    this.player.offline = 2;
    this.player.online = Math.max(0, this.player.online - 1);
    this.playerPlane.visible = false;
    this.emit('player-hit', { hits: this.player.hits, remote });
  }

  addRemoteShot(origin) {
    this.shoot(false, new THREE.Vector3(origin.x, origin.y, origin.z));
  }

  setRemoteState(state) {
    this.remotePlane.visible = Boolean(state?.active);
    if (!state?.active) return;
    this.remotePlane.position.set(state.x, state.y, state.z);
    this.remotePlane.rotation.set(state.pitch || 0, Math.PI + (state.yaw || 0), -(state.roll || 0));
  }

  getNetworkState() {
    return {
      active: this.active && !this.paused && this.player.offline <= 0,
      x: this.playerPlane.position.x,
      y: this.playerPlane.position.y,
      z: this.playerPlane.position.z,
      pitch: this.playerPlane.rotation.x,
      yaw: this.playerPlane.rotation.y,
      roll: this.playerPlane.rotation.z,
      hits: this.player.hits,
    };
  }

  update(delta) {
    if (!this.active || this.paused) return;
    const dt = Math.min(delta, 0.045);
    this.timer = Math.max(0, this.timer - dt);
    if (this.timer <= 0) {
      this.active = false;
      this.onEvent('finish', { hits: this.player.hits });
      return;
    }

    const player = this.player;
    const maxSpeed = this.input.boosting ? 112 : 82;
    player.speed = clamp(player.speed + this.input.throttle * 26 * dt + (this.input.boosting ? 34 * dt : 0), 28, maxSpeed);
    player.speed = THREE.MathUtils.damp(player.speed, 52, 0.3, dt);
    const desiredX = this.input.targetX + this.input.steerX * 8 * this.sensitivity;
    const desiredY = this.input.targetY + this.input.steerY * 5 * this.sensitivity;
    player.vx = THREE.MathUtils.damp(player.vx, clamp((desiredX - player.x) * 2.8, -18, 18), 2.2, dt);
    player.vy = THREE.MathUtils.damp(player.vy, clamp((desiredY - player.y) * 2.2, -12, 12), 2.0, dt);
    player.x = clamp(player.x + player.vx * dt, -14, 14);
    player.y = clamp(player.y + player.vy * dt, -8, 9);
    this.playerPlane.position.set(player.x, player.y, 0);
    this.playerPlane.rotation.z = THREE.MathUtils.damp(this.playerPlane.rotation.z, -player.vx * 0.035, 5, dt);
    this.playerPlane.rotation.x = THREE.MathUtils.damp(this.playerPlane.rotation.x, player.vy * 0.035, 4, dt);

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, player.x * 0.48, 2.2, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, player.y * 0.38 + 3.2, 2, dt);
    this.camera.lookAt(player.x * 0.35, player.y * 0.28, -15);

    if (player.invincible > 0) player.invincible -= dt;
    if (player.offline > 0) {
      player.offline = Math.max(0, player.offline - dt);
      if (player.offline <= 0) {
        playerPlaneRestore(this.playerPlane);
        player.invincible = 1.2;
        this.emit('player-back');
      }
    }
    if (player.offline <= 0 && player.invincible > 0) {
      this.playerPlane.visible = Math.floor(player.invincible * 12) % 2 === 0;
    }

    for (const building of this.buildings) {
      building.position.z += player.speed * dt;
      if (building.position.z > 34) building.position.z -= 50 * 16;
    }
    for (const intersection of this.intersections) {
      intersection.position.z += player.speed * dt;
      if (intersection.position.z > 42) intersection.position.z -= 50 * 16;
    }
    for (const mark of this.roadMarks) {
      mark.position.z += player.speed * dt;
      if (mark.position.z > 12) mark.position.z -= 25 * 32;
    }

    this.roadTime += dt;
    const rainPosition = this.rainGeometry.attributes.position;
    const rainArray = rainPosition.array;
    for (let index = 0; index < rainArray.length; index += 3) {
      rainArray[index + 1] -= 42 * dt;
      rainArray[index + 2] += player.speed * dt * 0.5;
      if (rainArray[index + 1] < -16) rainArray[index + 1] = 50;
      if (rainArray[index + 2] > 16) rainArray[index + 2] = -170;
    }
    rainPosition.needsUpdate = true;

    this.updateAI(dt);
    this.updateBullets(dt);
    this.updateEffects(dt);

    if (this.input.firing && player.offline <= 0) {
      this.fireCooldown = (this.fireCooldown || 0) - dt;
      if (this.fireCooldown <= 0) {
        this.shoot(true);
        this.fireCooldown = 0.2;
      }
    } else {
      this.fireCooldown = 0;
    }
  }

  updateAI(dt) {
    for (const ai of this.ai) {
      if (!ai.alive) {
        ai.respawn -= dt;
        if (ai.respawn <= 0) {
          ai.alive = true;
          ai.mesh.visible = true;
          ai.x = random(-12, 12);
          ai.y = random(-2, 5);
          ai.z = random(-100, -50);
        }
        continue;
      }
      ai.phase += dt * random(0.7, 1.15);
      ai.x += Math.sin(ai.phase) * dt * 2.5;
      ai.y += Math.cos(ai.phase * 0.73) * dt * 1.4;
      ai.z += this.player.speed * dt * 0.72;
      if (ai.z > 16) ai.z = random(-110, -70);
      ai.mesh.position.set(ai.x, ai.y, ai.z);
      ai.mesh.rotation.z = Math.sin(ai.phase) * 0.16;
      ai.mesh.rotation.x = Math.cos(ai.phase) * 0.08;
      ai.fireAt -= dt;
      if (ai.fireAt <= 0 && ai.z > -38 && ai.z < -5) {
        this.shoot(false, ai.mesh.position);
        ai.fireAt = random(2.4, 5.2);
      }
    }
  }

  updateBullets(dt) {
    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = this.bullets[index];
      bullet.mesh.position.z += bullet.speed * dt;
      bullet.life -= dt;
      if (bullet.owner === 'player') {
        for (const ai of this.ai) {
          if (!ai.alive) continue;
          const dx = bullet.mesh.position.x - ai.mesh.position.x;
          const dy = bullet.mesh.position.y - ai.mesh.position.y;
          const dz = bullet.mesh.position.z - ai.mesh.position.z;
          if (dx * dx + dy * dy + dz * dz < 6.2) {
            this.destroyAI(ai);
            bullet.life = 0;
            this.explosion(ai.mesh.position);
            break;
          }
        }
        if (this.remotePlane.visible && bullet.life > 0 && bullet.mesh.position.distanceTo(this.remotePlane.position) < 2.3) {
          bullet.life = 0;
          this.player.hits += 1;
          this.player.online += 1;
          this.emit('hit', { hits: this.player.hits, target: 'remote' });
          this.emit('remote-hit');
          this.explosion(this.remotePlane.position);
        }
      } else {
        const distance = bullet.mesh.position.distanceTo(this.playerPlane.position);
        if (distance < 2.4 && this.player.offline <= 0) {
          this.damagePlayer();
          this.explosion(this.playerPlane.position);
          bullet.life = 0;
        }
      }
      if (bullet.life <= 0 || Math.abs(bullet.mesh.position.z) > 210) {
        this.scene.remove(bullet.mesh);
        this.bullets.splice(index, 1);
      }
    }
  }

  explosion(position) {
    const ring = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 12, 8),
      new THREE.MeshBasicMaterial({ color: COLORS.amber, transparent: true, opacity: 0.86, wireframe: true }),
    );
    ring.position.copy(position);
    this.scene.add(ring);
    this.effects.push({ mesh: ring, life: 0.4, maxLife: 0.4 });
  }

  updateEffects(dt) {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      effect.life -= dt;
      const progress = 1 - effect.life / effect.maxLife;
      effect.mesh.scale.setScalar(1 + progress * 3.4);
      if (effect.mesh.material) effect.mesh.material.opacity = Math.max(0, 1 - progress);
      if (effect.life <= 0) {
        this.scene.remove(effect.mesh);
        this.effects.splice(index, 1);
      }
    }
  }

  frame() {
    const delta = this.clock.getDelta();
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.frame);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  }
}

function playerPlaneRestore(plane) {
  plane.visible = true;
}

export { COLORS };