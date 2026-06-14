const majorArcana = ["0 愚者 The Fool","I 魔术师 The Magician","II 女祭司 The High Priestess","III 皇后 The Empress","IV 皇帝 The Emperor","V 教皇 The Hierophant","VI 恋人 The Lovers","VII 战车 The Chariot","VIII 力量 Strength","IX 隐士 The Hermit","X 命运之轮 Wheel of Fortune","XI 正义 Justice","XII 倒吊人 The Hanged Man","XIII 死神 Death","XIV 节制 Temperance","XV 恶魔 The Devil","XVI 高塔 The Tower","XVII 星星 The Star","XVIII 月亮 The Moon","XIX 太阳 The Sun","XX 审判 Judgement","XXI 世界 The World"];
const suits = ["权杖 Wands", "圣杯 Cups", "宝剑 Swords", "星币 Pentacles"];
const ranks = ["Ace", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "Page", "Knight", "Queen", "King"];
const fullDeckData = [...majorArcana];
suits.forEach(suit => ranks.forEach(rank => fullDeckData.push(`${suit} ${rank}`)));

// 严格遵循 a-g 的状态机
const STATE = { INIT: 'a', SHUFFLE: 'b', ZOOM: 'c', DRAW: 'd', FINAL: 'f' };
let currentState = STATE.INIT;
let drawnCards = []; 
let handVector = { x: 0, y: 0 };

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 16;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.position = 'absolute'; renderer.domElement.style.top = '0'; renderer.domElement.style.left = '0'; renderer.domElement.style.zIndex = '1';
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xFFEAAA, 2.0); dirLight.position.set(5, 5, 8); scene.add(dirLight);

// --- 极致还原图一的黑金牌背 ---
function createCardBackTexture() {
  const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 896;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#0a0a0c'; ctx.fillRect(0, 0, 512, 896); // 深渊黑底
  const gold = '#E6C27A'; ctx.strokeStyle = gold;
  
  // 外层繁复边框
  ctx.lineWidth = 6; ctx.strokeRect(24, 24, 464, 848);
  ctx.lineWidth = 2; ctx.strokeRect(36, 36, 440, 824);
  
  ctx.save(); ctx.translate(256, 448);
  // 四角繁星
  const drawCorner = (x, y) => { ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI*2); ctx.stroke(); };
  drawCorner(-180, -370); drawCorner(180, -370); drawCorner(-180, 370); drawCorner(180, 370);

  // 中心星象仪法阵 (完美复刻参考图)
  ctx.beginPath(); ctx.arc(0, 0, 160, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.setLineDash([8, 12]); ctx.arc(0, 0, 180, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI*2); ctx.stroke();
  
  // 六芒星
  ctx.beginPath();
  for(let i=0; i<3; i++){ ctx.lineTo(110*Math.cos(i*Math.PI*2/3 - Math.PI/2), 110*Math.sin(i*Math.PI*2/3 - Math.PI/2)); } ctx.closePath(); ctx.stroke();
  ctx.beginPath();
  for(let i=0; i<3; i++){ ctx.lineTo(110*Math.cos(i*Math.PI*2/3 + Math.PI/6), 110*Math.sin(i*Math.PI*2/3 + Math.PI/6)); } ctx.closePath(); ctx.stroke();
  
  // 中心太阳
  ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI*2); ctx.fillStyle = gold; ctx.fill();
  for(let i=0; i<12; i++){ ctx.moveTo(0,0); ctx.lineTo(60*Math.cos(i*Math.PI/6), 60*Math.sin(i*Math.PI/6)); ctx.stroke(); }
  ctx.restore();
  
  return new THREE.CanvasTexture(cvs);
}

// --- 传统塔罗牌面生成器 ---
function generateFaceTexture(cardName) {
  const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 896;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#1A1A24'; ctx.fillRect(0, 0, 512, 896); 
  ctx.strokeStyle = '#E6C27A'; ctx.lineWidth = 6; ctx.strokeRect(20, 20, 472, 856);
  
  // 传统神秘学底纹 (拱门与日/月)
  ctx.beginPath(); ctx.arc(256, 380, 160, Math.PI, 0); ctx.lineTo(416, 700); ctx.lineTo(96, 700); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(230, 194, 122, 0.08)'; ctx.fill();
  
  ctx.beginPath(); ctx.arc(256, 380, 80, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(230, 380, 60, 0, Math.PI*2); ctx.clip(); 
  ctx.fillStyle = '#E6C27A'; ctx.fillRect(0,0,512,896); // 形成新月图腾
  
  // 排版：罗马数字在顶部，英文在底部
  const parts = cardName.split(' ');
  const numOrSuit = parts[0]; 
  const title = parts.slice(1).join(' ');

  ctx.fillStyle = '#E6C27A'; ctx.textAlign = "center";
  ctx.font = "bold 32px serif"; ctx.fillText(numOrSuit, 256, 80); // 顶部
  ctx.font = "italic 36px serif"; ctx.fillText(title, 256, 800);  // 底部主标题
  
  return new THREE.CanvasTexture(cvs);
}

const backTexture = createCardBackTexture();
const deck = new THREE.Group();
const cards = [];
const cardGeo = new THREE.BoxGeometry(2.4, 4.2, 0.02);

for (let i = 0; i < 78; i++) {
  const matFront = new THREE.MeshStandardMaterial({ color: 0x1A1A24, roughness: 0.8, metalness: 0.2 });
  const matBack = new THREE.MeshStandardMaterial({ map: backTexture, color: 0xffffff, roughness: 0.8, metalness: 0.2 });
  const matEdge = new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.4, metalness: 0.8 }); 
  
  const card = new THREE.Mesh(cardGeo, [matEdge, matEdge, matEdge, matEdge, matFront, matBack]);
  card.userData = { id: i, name: fullDeckData[i] };
  card.position.set(0, 0, -i * 0.005);
  card.rotation.y = Math.PI; 
  cards.push(card); deck.add(card);
}
scene.add(deck);

// 边缘粒子系统 (用于单指抽牌时舞动)
const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(300);
for(let i=0; i<300; i++) particlePos[i] = (Math.random()-0.5)*3;
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
const particleMat = new THREE.PointsMaterial({ color: 0xE6C27A, size: 0.15, transparent: true, opacity: 0 });
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// 化作星星消散的全局星尘
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(1000 * 3);
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0 });
const starField = new THREE.Points(starGeo, starMat);
scene.add(starField);

function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;
  
  if(currentState === STATE.INIT) deck.position.y = Math.sin(time*2)*0.1;
  
  // b, e: 牌组平移跟随手势方向
  if(currentState === STATE.SHUFFLE) {
    deck.position.x += (handVector.x * 12 - deck.position.x) * 0.05;
    deck.position.y += (handVector.y * 10 - deck.position.y) * 0.05;
  }
  
  // 粒子边缘舞动
  if(currentState === STATE.DRAW && particles.material.opacity > 0) {
    const pos = particles.geometry.attributes.position.array;
    for(let i=0; i<300; i+=3) pos[i] += Math.sin(time*5 + i)*0.01;
    particles.geometry.attributes.position.needsUpdate = true;
  }
  
  renderer.render(scene, camera);
}
animate();

const setStatus = (txt) => document.getElementById('status-text').innerText = txt;
const slots = [-3.5, 0, 3.5]; // 底部三个槽位 X 坐标

window.tarotApp = {
  // a, g: 握拳变回一摞
  stack: () => {
    if(currentState === STATE.INIT) return;
    currentState = STATE.INIT; drawnCards = [];
    setStatus("万物归原 [握拳]"); document.getElementById('card-info').style.opacity = 0;
    
    gsap.to(particles.material, { opacity: 0, duration: 0.5 });
    gsap.to(starField.material, { opacity: 0, duration: 0.5 });
    
    cards.forEach((card, i) => {
      card.visible = true; scene.attach(card); // 脱离任何父级
      gsap.to(card.position, { x: 0, y: 0, z: -i * 0.005, duration: 1.2, ease: "power2.inOut" });
      gsap.to(card.rotation, { x: 0, y: Math.PI, z: 0, duration: 1.2 }); 
      gsap.to(card.scale, { x: 1, y: 1, z: 1, duration: 0.5 });
      card.material[4].map = null; card.material[4].needsUpdate = true;
    });
    deck.position.set(0,0,0);
  },
  
  // b, e: 两指并拢散开洗牌
  shuffle: () => {
    if(drawnCards.length >= 3 || currentState === STATE.SHUFFLE) return;
    currentState = STATE.SHUFFLE; setStatus("跟随指引流转 [两指并拢]");
    
    gsap.to(deck.position, { z: 0, duration: 1 }); // 恢复正常 Z 轴
    
    const unDrawnCards = cards.filter(c => !drawnCards.includes(c));
    unDrawnCards.forEach((card) => {
      deck.attach(card); // 绑定回 deck 接受手势平移
      gsap.to(card.position, {
        x: (Math.random() - 0.5) * 18, y: (Math.random() - 0.5) * 12, z: (Math.random() - 0.5) * 4,
        duration: 1.5, ease: "power2.out"
      });
      gsap.to(card.rotation, { x: 0, y: Math.PI, z: (Math.random()-0.5)*0.5, duration: 1.5 }); 
    });
  },

  // c: 两指张开凑近
  zoom: () => {
    if(drawnCards.length >= 3 || currentState === STATE.ZOOM) return;
    currentState = STATE.ZOOM; setStatus("凝视宿命 [两指张开放大]");
    gsap.to(deck.position, { z: 8, duration: 1.5, ease: "power2.out" }); // 整个牌阵拉近
  },

  // d: 单指抽取离用户最近(Z轴最大)的牌
  draw: () => {
    if(drawnCards.length >= 3 || currentState === STATE.DRAW) return;
    currentState = STATE.DRAW; setStatus("命运落位 [单指]");
    
    // 找到尚未抽出且 Z 轴最大的牌 (离用户最近)
    const unDrawnCards = cards.filter(c => !drawnCards.includes(c));
    unDrawnCards.forEach(c => scene.attach(c)); // 转换为世界坐标系比较
    
    unDrawnCards.sort((a, b) => b.position.z - a.position.z);
    const targetCard = unDrawnCards[0];
    
    drawnCards.push(targetCard);
    const targetX = slots[drawnCards.length - 1];

    gsap.to(targetCard.position, { x: targetX, y: -4.5, z: 6, duration: 1.2, ease: "power3.out" });
    gsap.to(targetCard.rotation, { x: 0, y: Math.PI, z: 0, duration: 1.2 });
    gsap.to(targetCard.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 1.2 });
    
    // 粒子边缘附着在这张牌上
    particles.position.set(targetX, -4.5, 6);
    gsap.to(particles.material, { opacity: 1, duration: 1 });

    if(drawnCards.length === 3) {
      setTimeout(() => window.tarotApp.finalReveal(), 1500);
    }
  },

  // f: 三张集齐，中心翻转，其余化作星星
  finalReveal: () => {
    currentState = STATE.FINAL; setStatus("宿命已定 [最终审判]");
    gsap.to(particles.material, { opacity: 0, duration: 0.5 });

    // 1. 其余牌缩小消失并爆出星星
    const unDrawnCards = cards.filter(c => !drawnCards.includes(c));
    const positions = starField.geometry.attributes.position.array;
    let starIdx = 0;
    
    unDrawnCards.forEach(card => {
      // 记录牌的位置生成星星
      for(let j=0; j<10; j++) {
        if(starIdx < positions.length) {
          positions[starIdx++] = card.position.x + (Math.random()-0.5);
          positions[starIdx++] = card.position.y + (Math.random()-0.5);
          positions[starIdx++] = card.position.z + (Math.random()-0.5);
        }
      }
      gsap.to(card.scale, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.in" });
      setTimeout(() => card.visible = false, 1500);
    });
    
    starField.geometry.attributes.position.needsUpdate = true;
    gsap.to(starField.material, { opacity: 1, duration: 0.5 });
    gsap.to(starField.material, { opacity: 0, duration: 3, delay: 1 }); // 星星渐隐

    // 2. 三张牌飞到中心并翻面
    drawnCards.forEach((card, i) => {
      const isReversed = Math.random() > 0.5;
      card.userData.reversed = isReversed;
      
      card.material[4].map = generateFaceTexture(card.userData.name);
      card.material[4].color.setHex(0xffffff); 
      card.material[4].needsUpdate = true;

      gsap.to(card.position, { x: slots[i] * 1.6, y: 1, z: 10, duration: 2, ease: "power3.inOut" });
      gsap.to(card.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 2 });
      gsap.to(card.rotation, { y: 0, z: isReversed ? Math.PI : 0, duration: 2, ease: "back.out(1.2)" });
    });

    // 3. 显示底部解读
    setTimeout(() => {
      const titles = ["「溯源 - 过去」", "「具象 - 现在」", "「推演 - 未来」"];
      const infoBoard = document.getElementById('card-info');
      infoBoard.innerHTML = drawnCards.map((c, i) => `
        <div>
          <h3>${titles[i]}</h3>
          <h2>${c.userData.name.split(' ')[1] || c.userData.name.split(' ')[0]} ${c.userData.reversed ? '▼' : '▲'}</h2>
          <p>${c.userData.name.split(' ').slice(2).join(' ')}</p>
        </div>
      `).join('');
      infoBoard.style.opacity = 1;
    }, 2000);
  }
};

// --- 全屏追踪与严格手势判定 ---
const videoElement = document.getElementById('video-input');
const canvasElement = document.getElementById('gesture-canvas');
const canvasCtx = canvasElement.getContext('2d');

// 匹配全屏尺寸
canvasElement.width = window.innerWidth;
canvasElement.height = window.innerHeight;

const hands = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.7 });

hands.onResults((results) => {
  if(currentState === STATE.INIT && document.getElementById('status-text').innerText.includes("深呼吸")) {
    setStatus("万物归原 [握拳]");
  }

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    
    // 更新屏幕全局手势中心
    handVector.x = (0.5 - lm[9].x); handVector.y = (0.5 - lm[9].y);

    // 精确的手指开合检测逻辑
    const indexY = lm[8].y, indexBase = lm[5].y;
    const middleY = lm[12].y, middleBase = lm[9].y;
    const ringY = lm[16].y, ringBase = lm[13].y;
    const pinkyY = lm[20].y, pinkyBase = lm[17].y;

    const indexUp = indexY < indexBase;
    const middleUp = middleY < middleBase;
    const ringDown = ringY > ringBase;
    const pinkyDown = pinkyY > pinkyBase;

    // 两指尖的距离 (用于判断并拢还是张开)
    const distIM = Math.hypot(lm[8].x - lm[12].x, lm[8].y - lm[12].y);

    const isFist = !indexUp && !middleUp && ringDown && pinkyDown;
    const isOneFinger = indexUp && !middleUp && ringDown && pinkyDown;
    const isTwoFingers = indexUp && middleUp && ringDown && pinkyDown;
    
    const isTwoTogether = isTwoFingers && distIM < 0.08;
    const isTwoApart = isTwoFingers && distIM >= 0.08;

    // 严格按指令流转状态机
    if (isFist) {
      window.tarotApp.stack(); // g, a 态
    } else if (currentState !== STATE.FINAL) {
      // 只有没抽满 3 张才能进行中间操作
      if (isTwoTogether) window.tarotApp.shuffle(); // b, e 态
      else if (isTwoApart) window.tarotApp.zoom();  // c 态
      else if (isOneFinger) window.tarotApp.draw(); // d 态
    }

    // 全屏映射绘制骨骼点 (让追踪线完全贴合真实手指)
    canvasCtx.fillStyle = "rgba(230, 194, 122, 0.8)";
    lm.forEach(p => { 
      canvasCtx.beginPath(); 
      canvasCtx.arc(p.x * canvasElement.width, p.y * canvasElement.height, 4, 0, 2*Math.PI); 
      canvasCtx.fill(); 
    });
  }
});

document.getElementById('start-cam-btn').addEventListener('click', () => {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('ui-layer').style.display = 'block';
  videoElement.play().catch(()=>{}); 
  setStatus("正在建立潜意识连接...");
  
  const cameraUtils = new Camera(videoElement, { 
    onFrame: async () => { await hands.send({ image: videoElement }); }, 
    width: window.innerWidth, height: window.innerHeight 
  });
  cameraUtils.start().then(() => setStatus("连接成功，等待手势指令"));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  canvasElement.width = window.innerWidth; canvasElement.height = window.innerHeight;
});
