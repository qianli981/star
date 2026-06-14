const TAROT_BASE_URL = "https://raw.githubusercontent.com/howech/tarot-images/master/cards/";
const fullDeckData = [
  { id: 'ar00', name: "愚者 The Fool" }, { id: 'ar01', name: "魔术师 The Magician" }, { id: 'ar02', name: "女祭司 The High Priestess" }, { id: 'ar03', name: "皇后 The Empress" }, { id: 'ar04', name: "皇帝 The Emperor" }, { id: 'ar05', name: "教皇 The Hierophant" }, { id: 'ar06', name: "恋人 The Lovers" }, { id: 'ar07', name: "战车 The Chariot" }, { id: 'ar08', name: "力量 Strength" }, { id: 'ar09', name: "隐士 The Hermit" }, { id: 'ar10', name: "命运之轮 Wheel of Fortune" }, { id: 'ar11', name: "正义 Justice" }, { id: 'ar12', name: "倒吊人 The Hanged Man" }, { id: 'ar13', name: "死神 Death" }, { id: 'ar14', name: "节制 Temperance" }, { id: 'ar15', name: "恶魔 The Devil" }, { id: 'ar16', name: "高塔 The Tower" }, { id: 'ar17', name: "星星 The Star" }, { id: 'ar18', name: "月亮 The Moon" }, { id: 'ar19', name: "太阳 The Sun" }, { id: 'ar20', name: "审判 Judgement" }, { id: 'ar21', name: "世界 The World" }
];
const suits = [{ pre: 'wa', name: "权杖" }, { pre: 'cu', name: "圣杯" }, { pre: 'sw', name: "宝剑" }, { pre: 'pe', name: "星币" }];
const ranks = ["01","02","03","04","05","06","07","08","09","10","11","12","13","14"];
suits.forEach(suit => ranks.forEach(rank => fullDeckData.push({ id: `${suit.pre}${rank}`, name: `${suit.name} ${rank}` })));

const STATE = { a_STACK: 'a', b_SHUFFLE: 'b', c_ZOOM: 'c', d_DRAW: 'd', e_RESHUFFLE: 'e', f_FINAL: 'f', g_RESET: 'g' };
let currentState = STATE.a_STACK;
let drawnCards = []; 
let handVector = { x: 0, y: 0 };
let currentDrawingCard = null;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 18;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.position = 'absolute'; renderer.domElement.style.top = '0'; renderer.domElement.style.left = '0'; renderer.domElement.style.zIndex = '1';
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xFFEAAA, 2.5); dirLight.position.set(5, 5, 8); scene.add(dirLight);

function createLuxuryBackTexture() {
  const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 896;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#0a0a0c'; ctx.fillRect(0, 0, 512, 896); 
  const goldGradient = ctx.createLinearGradient(0, 0, 512, 896);
  goldGradient.addColorStop(0, '#B38728'); goldGradient.addColorStop(0.5, '#FBF5B7'); goldGradient.addColorStop(1, '#B38728');
  ctx.strokeStyle = goldGradient; ctx.fillStyle = goldGradient;
  
  ctx.lineWidth = 8; ctx.strokeRect(20, 20, 472, 856);
  ctx.lineWidth = 2; ctx.strokeRect(32, 32, 448, 832);
  
  ctx.save(); ctx.translate(256, 448);
  const drawCorner = (x, y) => { 
    ctx.save(); ctx.translate(x, y);
    for(let i=0; i<8; i++) {
      ctx.rotate(Math.PI/4);
      ctx.beginPath(); ctx.ellipse(0, 20, 5, 15, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 40, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  };
  drawCorner(-170, -360); drawCorner(170, -360); drawCorner(-170, 360); drawCorner(170, 360);

  ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.setLineDash([4, 8]); ctx.arc(0, 0, 165, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(0, 0, 180, 0, Math.PI*2); ctx.stroke();
  
  ctx.lineWidth = 3;
  ctx.beginPath(); 
  for(let i=0; i<3; i++){ ctx.lineTo(150*Math.cos(i*Math.PI*2/3 - Math.PI/2), 150*Math.sin(i*Math.PI*2/3 - Math.PI/2)); } ctx.closePath(); ctx.stroke();
  ctx.beginPath(); 
  for(let i=0; i<3; i++){ ctx.lineTo(150*Math.cos(i*Math.PI*2/3 + Math.PI/6), 150*Math.sin(i*Math.PI*2/3 + Math.PI/6)); } ctx.closePath(); ctx.stroke();
  
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI*2); ctx.fill();
  for(let i=0; i<16; i++){ ctx.moveTo(0,0); ctx.lineTo(60*Math.cos(i*Math.PI/8), 60*Math.sin(i*Math.PI/8)); ctx.stroke(); }
  
  ctx.beginPath(); ctx.arc(0, -260, 40, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(-15, -260, 30, 0, Math.PI*2); ctx.clip(); ctx.fillRect(-50,-300,100,100);
  ctx.restore();
  
  return new THREE.CanvasTexture(cvs);
}

const backTexture = createLuxuryBackTexture();
const deck = new THREE.Group();
const cards = [];
const cardGeo = new THREE.BoxGeometry(2.4, 4.2, 0.02);
const textureLoader = new THREE.TextureLoader();

for (let i = 0; i < 78; i++) {
  const matFront = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.1 });
  const matBack = new THREE.MeshStandardMaterial({ map: backTexture, color: 0xffffff, roughness: 0.4, metalness: 0.6 });
  const matEdge = new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.3, metalness: 0.9 }); 
  
  const card = new THREE.Mesh(cardGeo, [matEdge, matEdge, matEdge, matEdge, matFront, matBack]);
  card.userData = { id: i, data: fullDeckData[i] };
  card.position.set(0, 0, -i * 0.005);
  card.rotation.y = Math.PI; 
  cards.push(card); deck.add(card);
}
scene.add(deck);

const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(300);
for(let i=0; i<300; i++) particlePos[i] = (Math.random()-0.5)*3;
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
const particleMat = new THREE.PointsMaterial({ color: 0xE6C27A, size: 0.15, transparent: true, opacity: 0 });
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(1500 * 3);
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0 });
const starField = new THREE.Points(starGeo, starMat);
scene.add(starField);

function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;
  
  if(currentState === STATE.a_STACK) deck.position.y = Math.sin(time*2)*0.1;
  
  if(currentState === STATE.b_SHUFFLE || currentState === STATE.c_ZOOM) {
    deck.position.x += (handVector.x * 15 - deck.position.x) * 0.05;
    deck.position.y += (handVector.y * 10 - deck.position.y) * 0.05;
  }
  
  if(currentState === STATE.d_DRAW && particles.material.opacity > 0) {
    const pos = particles.geometry.attributes.position.array;
    for(let i=0; i<300; i+=3) pos[i] += Math.sin(time*8 + i)*0.015;
    particles.geometry.attributes.position.needsUpdate = true;
  }
  renderer.render(scene, camera);
}
animate();

const setStatus = (txt) => document.getElementById('status-text').innerText = txt;
const slots = [-3.8, 0, 3.8]; 

window.tarotApp = {
  stack: () => {
    if(currentState === STATE.a_STACK) return;
    currentState = STATE.a_STACK; drawnCards = [];
    setStatus("万物归原 [一摞背面]"); document.getElementById('card-info').style.opacity = 0;
    
    gsap.to(particles.material, { opacity: 0, duration: 0.5 });
    gsap.to(starField.material, { opacity: 0, duration: 0.5 });
    
    cards.forEach((card, i) => {
      card.visible = true; scene.attach(card); 
      gsap.to(card.position, { x: 0, y: 0, z: -i * 0.005, duration: 1.2, ease: "power2.inOut" });
      gsap.to(card.rotation, { x: 0, y: Math.PI, z: 0, duration: 1.2 }); 
      gsap.to(card.scale, { x: 1, y: 1, z: 1, duration: 0.5 });
      card.material[4].map = null; card.material[4].needsUpdate = true;
    });
    deck.position.set(0,0,0);
  },
  
  shuffle: () => {
    if(drawnCards.length >= 3 || currentState === STATE.b_SHUFFLE) return;
    currentState = STATE.b_SHUFFLE; setStatus("命运流转，跟随手势 [两指并拢]");
    
    gsap.to(deck.position, { z: 0, duration: 1 }); 
    
    const unDrawnCards = cards.filter(c => !drawnCards.includes(c));
    unDrawnCards.forEach((card) => {
      deck.attach(card); 
      gsap.to(card.position, {
        x: (Math.random() - 0.5) * 18, y: (Math.random() - 0.5) * 12, z: (Math.random() - 0.5) * 5,
        duration: 1.5, ease: "power2.out"
      });
      gsap.to(card.rotation, { x: 0, y: Math.PI, z: (Math.random()-0.5)*0.5, duration: 1.5 }); 
    });
  },

  zoom: () => {
    if(drawnCards.length >= 3 || currentState === STATE.c_ZOOM) return;
    currentState = STATE.c_ZOOM; setStatus("放大凝视，挑选宿命 [两指张开]");
    gsap.to(deck.position, { z: 8, duration: 1.2, ease: "power2.out" }); 
  },

  draw: () => {
    if(drawnCards.length >= 3 || currentState === STATE.d_DRAW) return;
    currentState = STATE.d_DRAW; setStatus("锁定宿命落位 [伸出单指]");
    
    const unDrawnCards = cards.filter(c => !drawnCards.includes(c));
    unDrawnCards.forEach(c => scene.attach(c)); 
    unDrawnCards.sort((a, b) => b.position.z - a.position.z); 
    
    currentDrawingCard = unDrawnCards[0];
    drawnCards.push(currentDrawingCard);
    const targetX = slots[drawnCards.length - 1];

    gsap.to(currentDrawingCard.position, { x: targetX, y: -5, z: 6, duration: 1.5, ease: "power3.out" });
    gsap.to(currentDrawingCard.rotation, { x: 0, y: Math.PI, z: 0, duration: 1.5 });
    gsap.to(currentDrawingCard.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 1.5 });
    
    particles.position.set(targetX, -5, 6);
    gsap.to(particles.material, { opacity: 1, duration: 1 });

    if(drawnCards.length === 3) {
      setTimeout(() => window.tarotApp.finalReveal(), 1500);
    }
  },

  finalReveal: () => {
    currentState = STATE.f_FINAL; setStatus("宿命已定，化作星尘 [抽取三张后]");
    gsap.to(particles.material, { opacity: 0, duration: 0.5 });

    const unDrawnCards = cards.filter(c => !drawnCards.includes(c));
    const positions = starField.geometry.attributes.position.array;
    let starIdx = 0;
    
    unDrawnCards.forEach(card => {
      for(let j=0; j<15; j++) {
        if(starIdx < positions.length) {
          positions[starIdx++] = card.position.x + (Math.random()-0.5)*2;
          positions[starIdx++] = card.position.y + (Math.random()-0.5)*2;
          positions[starIdx++] = card.position.z + (Math.random()-0.5)*2;
        }
      }
      gsap.to(card.scale, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.in" });
      setTimeout(() => card.visible = false, 1500);
    });
    
    starField.geometry.attributes.position.needsUpdate = true;
    gsap.to(starField.material, { opacity: 1, duration: 0.5 });
    gsap.to(starField.material, { opacity: 0, duration: 3, delay: 1 }); 

    drawnCards.forEach((card, i) => {
      const isReversed = Math.random() > 0.5;
      card.userData.reversed = isReversed;
      
      const textureUrl = `${TAROT_BASE_URL}${card.userData.data.id}.jpg`;
      textureLoader.load(textureUrl, (tex) => {
        card.material[4].map = tex;
        card.material[4].color.setHex(0xffffff);
        card.material[4].needsUpdate = true;
      });

      gsap.to(card.position, { x: slots[i] * 1.5, y: 1, z: 10, duration: 2.5, ease: "power3.inOut" });
      gsap.to(card.scale, { x: 1.9, y: 1.9, z: 1.9, duration: 2.5 });
      gsap.to(card.rotation, { y: 0, z: isReversed ? Math.PI : 0, duration: 2.5, ease: "back.out(1.2)" });
    });

    setTimeout(() => {
      const titles = ["「溯源 - 过去」", "「具象 - 现在」", "「推演 - 未来」"];
      const infoBoard = document.getElementById('card-info');
      infoBoard.innerHTML = drawnCards.map((c, i) => `
        <div>
          <h3>${titles[i]}</h3>
          <h2>${c.userData.data.name} ${c.userData.reversed ? '▼' : '▲'}</h2>
          <p>${c.userData.reversed ? '力量遭遇阻滞，需向内反思' : '顺应命运的指引，能量正向流动'}</p>
        </div>
      `).join('');
      infoBoard.style.opacity = 1;
    }, 2500);
  }
};

const videoElement = document.getElementById('video-input');
const canvasElement = document.getElementById('gesture-canvas');
const canvasCtx = canvasElement.getContext('2d');

const hands = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7 });

hands.onResults((results) => {
  if(currentState === STATE.a_STACK && document.getElementById('status-text').innerText.includes("凝视星空")) {
hands.onResults((results) => {
  if(currentState === STATE.a_STACK && document.getElementById('status-text').innerText.includes("凝视星空")) {
    setStatus("万物归原 [握拳]");
  }

  // 【核心修复1】：缩小画布分辨率以匹配 CSS 的 120x90
  canvasElement.width = 120;
  canvasElement.height = 90;
  
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
  if (results.image) {
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  }

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    
    handVector.x = (0.5 - lm[9].x); handVector.y = (0.5 - lm[9].y);

    const indexY = lm[8].y, indexBase = lm[5].y;
    const middleY = lm[12].y, middleBase = lm[9].y;
    const ringY = lm[16].y, ringBase = lm[13].y;
    const pinkyY = lm[20].y, pinkyBase = lm[17].y;

    // 获取四根手指的抬起/放下状态
    const indexUp = indexY < indexBase, middleUp = middleY < middleBase;
    const ringUp = ringY < ringBase, pinkyUp = pinkyY < pinkyBase;

    // 【核心修复2】：计算食指尖端(8)到小拇指尖端(20)的距离，以此判定五指的开合
    const handSpread = Math.hypot(lm[8].x - lm[20].x, lm[8].y - lm[20].y);

    const isFist = !indexUp && !middleUp && !ringUp && !pinkyUp; // 拳头：全部落下
    const isOneFinger = indexUp && !middleUp && !ringUp && !pinkyUp; // 单指：仅食指抬起
    const isFiveFingers = indexUp && middleUp && ringUp && pinkyUp; // 五指：全部抬起
    
    // 设定间距阈值 0.15，判断五指是并拢还是张开
    const isFiveTogether = isFiveFingers && handSpread < 0.15;
    const isFiveApart = isFiveFingers && handSpread >= 0.15;

    // 严格按指令流转状态机 a-g
    if (isFist) {
      window.tarotApp.stack(); 
    } else if (currentState !== STATE.f_FINAL) {
      if (isFiveTogether) window.tarotApp.shuffle(); // 改为五指并拢洗牌
      else if (isFiveApart) window.tarotApp.zoom();  // 改为五指张开放大
      else if (isOneFinger) window.tarotApp.draw(); 
    }

    // 绘制与手精准贴合的金丝骨骼
    canvasCtx.strokeStyle = "rgba(230, 194, 122, 0.8)";
    canvasCtx.lineWidth = 2;
    canvasCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
    
    const drawLine = (p1, p2) => {
      canvasCtx.beginPath();
      canvasCtx.moveTo(p1.x * canvasElement.width, p1.y * canvasElement.height);
      canvasCtx.lineTo(p2.x * canvasElement.width, p2.y * canvasElement.height);
      canvasCtx.stroke();
    };
    const fingers = [[0,1,2,3,4], [0,5,6,7,8], [0,9,10,11,12], [0,13,14,15,16], [0,17,18,19,20]];
    fingers.forEach(f => { for(let i=0; i<f.length-1; i++) drawLine(lm[f[i]], lm[f[i+1]]); });

    lm.forEach(p => { 
      canvasCtx.beginPath(); 
      canvasCtx.arc(p.x * canvasElement.width, p.y * canvasElement.height, 2, 0, 2*Math.PI); 
      canvasCtx.fill(); 
      canvasCtx.stroke();
    });
  }
  canvasCtx.restore();
});
  
  // 在小窗内绘制摄像头画面
  if (results.image) {
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  }

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    
    handVector.x = (0.5 - lm[9].x); handVector.y = (0.5 - lm[9].y);

    const indexY = lm[8].y, indexBase = lm[5].y;
    const middleY = lm[12].y, middleBase = lm[9].y;
    const ringY = lm[16].y, ringBase = lm[13].y;
    const pinkyY = lm[20].y, pinkyBase = lm[17].y;

    const indexUp = indexY < indexBase, middleUp = middleY < middleBase;
    const ringDown = ringY > ringBase, pinkyDown = pinkyY > pinkyBase;

    const distIM = Math.hypot(lm[8].x - lm[12].x, lm[8].y - lm[12].y);

    const isFist = !indexUp && !middleUp && ringDown && pinkyDown;
    const isOneFinger = indexUp && !middleUp && ringDown && pinkyDown;
    const isTwoFingers = indexUp && middleUp && ringDown && pinkyDown;
    
    const isTwoTogether = isTwoFingers && distIM < 0.08;
    const isTwoApart = isTwoFingers && distIM >= 0.08;

    if (isFist) {
      window.tarotApp.stack(); 
    } else if (currentState !== STATE.f_FINAL) {
      if (isTwoTogether) window.tarotApp.shuffle(); 
      else if (isTwoApart) window.tarotApp.zoom();  
      else if (isOneFinger) window.tarotApp.draw(); 
    }

    // 【核心修复】：在小窗内绘制骨架，精准贴合里面的手
    canvasCtx.strokeStyle = "rgba(230, 194, 122, 0.8)";
    canvasCtx.lineWidth = 2;
    canvasCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
    
    const drawLine = (p1, p2) => {
      canvasCtx.beginPath();
      canvasCtx.moveTo(p1.x * canvasElement.width, p1.y * canvasElement.height);
      canvasCtx.lineTo(p2.x * canvasElement.width, p2.y * canvasElement.height);
      canvasCtx.stroke();
    };
    const fingers = [[0,1,2,3,4], [0,5,6,7,8], [0,9,10,11,12], [0,13,14,15,16], [0,17,18,19,20]];
    fingers.forEach(f => { for(let i=0; i<f.length-1; i++) drawLine(lm[f[i]], lm[f[i+1]]); });

    lm.forEach(p => { 
      canvasCtx.beginPath(); 
      canvasCtx.arc(p.x * canvasElement.width, p.y * canvasElement.height, 3, 0, 2*Math.PI); 
      canvasCtx.fill(); 
      canvasCtx.stroke();
    });
  }
  canvasCtx.restore();
});

document.getElementById('start-cam-btn').addEventListener('click', () => {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('ui-layer').style.display = 'block';
  videoElement.play().catch(()=>{}); 
  setStatus("正在建立星空连接...");
  
  const cameraUtils = new Camera(videoElement, { 
    onFrame: async () => { await hands.send({ image: videoElement }); }, 
    width: 640, height: 480 
  });
  cameraUtils.start().then(() => setStatus("星空已连接，等待手势指令"));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
