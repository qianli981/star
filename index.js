// 使用 jsDelivr CDN 加速突破 GFW，并指向你指定的 AbsoluteWinter/tarot 或类似镜像的传统图库
const TAROT_BASE_URL = "https://cdn.jsdelivr.net/gh/howech/tarot-images@master/cards/";
const fullDeckData = [
  { id: 'ar00', name: "愚者 The Fool" }, { id: 'ar01', name: "魔术师 The Magician" }, { id: 'ar02', name: "女祭司 The High Priestess" }, { id: 'ar03', name: "皇后 The Empress" }, { id: 'ar04', name: "皇帝 The Emperor" }, { id: 'ar05', name: "教皇 The Hierophant" }, { id: 'ar06', name: "恋人 The Lovers" }, { id: 'ar07', name: "战车 The Chariot" }, { id: 'ar08', name: "力量 Strength" }, { id: 'ar09', name: "隐士 The Hermit" }, { id: 'ar10', name: "命运之轮 Wheel of Fortune" }, { id: 'ar11', name: "正义 Justice" }, { id: 'ar12', name: "倒吊人 The Hanged Man" }, { id: 'ar13', name: "死神 Death" }, { id: 'ar14', name: "节制 Temperance" }, { id: 'ar15', name: "恶魔 The Devil" }, { id: 'ar16', name: "高塔 The Tower" }, { id: 'ar17', name: "星星 The Star" }, { id: 'ar18', name: "月亮 The Moon" }, { id: 'ar19', name: "太阳 The Sun" }, { id: 'ar20', name: "审判 Judgement" }, { id: 'ar21', name: "世界 The World" }
];
const suits = [{ pre: 'wa', name: "权杖" }, { pre: 'cu', name: "圣杯" }, { pre: 'sw', name: "宝剑" }, { pre: 'pe', name: "星币" }];
const ranks = ["01","02","03","04","05","06","07","08","09","10","11","12","13","14"];
suits.forEach(suit => ranks.forEach(rank => fullDeckData.push({ id: `${suit.pre}${rank}`, name: `${suit.name} ${rank}` })));

const STATE = { a_STACK: 'a', b_SHUFFLE: 'b', c_ZOOM: 'c', d_DRAW: 'd', f_FINAL: 'f' };
let currentState = STATE.a_STACK;
let drawnCards = []; 
let handVector = { x: 0, y: 0 };

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
  
  ctx.lineWidth = 8; ctx.strokeRect(20, 20, 472, 856); ctx.lineWidth = 2; ctx.strokeRect(32, 32, 448, 832);
  
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
  ctx.beginPath(); for(let i=0; i<3; i++){ ctx.lineTo(150*Math.cos(i*Math.PI*2/3 - Math.PI/2), 150*Math.sin(i*Math.PI*2/3 - Math.PI/2)); } ctx.closePath(); ctx.stroke();
  ctx.beginPath(); for(let i=0; i<3; i++){ ctx.lineTo(150*Math.cos(i*Math.PI*2/3 + Math.PI/6), 150*Math.sin(i*Math.PI*2/3 + Math.PI/6)); } ctx.closePath(); ctx.stroke();
  
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI*2); ctx.fill();
  for(let i=0; i<16; i++){ ctx.moveTo(0,0); ctx.lineTo(60*Math.cos(i*Math.PI/8), 60*Math.sin(i*Math.PI/8)); ctx.stroke(); }
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

let currentStatusText = "";
const setStatus = (txt) => {
  if(currentStatusText !== txt) { document.getElementById('status-text').innerText = txt; currentStatusText = txt; }
};

// 动态响应屏幕尺寸，防止牌飞出屏幕
const getSlots = () => {
  const aspect = window.innerWidth / window.innerHeight;
  const spread = aspect > 1 ? 3.5 : 2.0; // 手机竖屏时牌挨得更紧密
  return [-spread, 0, spread];
};

window.tarotApp = {
  stack: () => {
    if(currentState === STATE.a_STACK) return;
    currentState = STATE.a_STACK; drawnCards = [];
    setStatus("万物归原 [握拳]"); 
    document.getElementById('card-info').style.opacity = 0;
    gsap.to(particles.material, { opacity: 0, duration: 0.5 });
    
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
    currentState = STATE.b_SHUFFLE; 
    setStatus("命运流转，跟随手势 [五指并拢]");
    
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
    currentState = STATE.c_ZOOM; 
    setStatus("放大凝视，挑选宿命 [五指张开]");
    gsap.to(deck.position, { z: 8, duration: 1.2, ease: "power2.out" }); 
  },

  draw: () => {
    if(drawnCards.length >= 3 || currentState === STATE.d_DRAW) return;
    currentState = STATE.d_DRAW; 
    setStatus("锁定宿命落位 [两指抽取]");
    
    const unDrawnCards = cards.filter(c => !drawnCards.includes(c));
    unDrawnCards.forEach(c => scene.attach(c)); 
    unDrawnCards.sort((a, b) => b.position.z - a.position.z); 
    
    const targetCard = unDrawnCards[0];
    drawnCards.push(targetCard);
    
    const slots = getSlots();
    const targetX = slots[drawnCards.length - 1];

    // 抽中的牌飞到底部，并且【缩小尺寸】
    gsap.to(targetCard.position, { x: targetX, y: -6.5, z: 4, duration: 1.5, ease: "power3.out" });
    gsap.to(targetCard.rotation, { x: 0, y: Math.PI, z: 0, duration: 1.5 });
    gsap.to(targetCard.scale, { x: 0.6, y: 0.6, z: 0.6, duration: 1.5 }); // 缩小为 0.6 倍
    
    particles.position.set(targetX, -6.5, 4);
    gsap.to(particles.material, { opacity: 1, duration: 1 });

    if(drawnCards.length === 3) {
      setTimeout(() => window.tarotApp.finalReveal(), 1500);
    }
  },

  finalReveal: () => {
    currentState = STATE.f_FINAL; 
    setStatus("宿命已定，真相显露 [抽取三张后]");
    gsap.to(particles.material, { opacity: 0, duration: 0.5 });

    const unDrawnCards = cards.filter(c => !drawnCards.includes(c));
    unDrawnCards.forEach(card => {
      gsap.to(card.scale, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.in" });
      setTimeout(() => card.visible = false, 1500);
    });

    const slots = getSlots();

    drawnCards.forEach((card, i) => {
      const isReversed = Math.random() > 0.5;
      card.userData.reversed = isReversed;
      
      const textureUrl = `${TAROT_BASE_URL}${card.userData.data.id}.jpg`;
      textureLoader.load(textureUrl, (tex) => {
        card.material[4].map = tex;
        card.material[4].color.setHex(0xffffff);
        card.material[4].needsUpdate = true;
      });

      // 三张牌并列飞到屏幕中央，并且【放大尺寸】，完美自适应不会出框
      const finalScale = window.innerWidth < 600 ? 1.0 : 1.5; // 手机端缩放比例
      gsap.to(card.position, { x: slots[i] * 1.05, y: 2, z: 12, duration: 2.5, ease: "power3.inOut" });
      gsap.to(card.scale, { x: finalScale, y: finalScale, z: finalScale, duration: 2.5 });
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
hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.7 });

hands.onResults((results) => {
  if(currentState === STATE.a_STACK && document.getElementById('status-text').innerText.includes("凝视星空")) {
    setStatus("万物归原 [握拳]");
  }

  canvasElement.width = 80;
  canvasElement.height = 80;
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.image) canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    handVector.x = (0.5 - lm[9].x); handVector.y = (0.5 - lm[9].y);

    const indexY = lm[8].y, indexBase = lm[5].y;
    const middleY = lm[12].y, middleBase = lm[9].y;
    const ringY = lm[16].y, ringBase = lm[13].y;
    const pinkyY = lm[20].y, pinkyBase = lm[17].y;

    const indexUp = indexY < indexBase, middleUp = middleY < middleBase;
    const ringUp = ringY < ringBase, pinkyUp = pinkyY < pinkyBase;

    // 【五指并拢 vs 五指张开】的核心判定：以食指尖到小指尖的宽度判断
    const handSpread = Math.hypot(lm[8].x - lm[20].x, lm[8].y - lm[20].y);
    const THRESHOLD = 0.16;

    const isFist = !indexUp && !middleUp && !ringUp && !pinkyUp;
    // 【两指抽牌】：只有食指和中指竖起（类似剪刀手/比耶✌️）
    const isTwoFingers = indexUp && middleUp && !ringUp && !pinkyUp;
    const isFiveFingers = indexUp && middleUp && ringUp && pinkyUp;
    
    const isFiveTogether = isFiveFingers && handSpread < THRESHOLD;
    const isFiveApart = isFiveFingers && handSpread >= THRESHOLD;

    if (isFist) {
      window.tarotApp.stack(); 
    } else if (currentState !== STATE.f_FINAL) {
      if (isFiveTogether) window.tarotApp.shuffle(); // 五指并拢
      else if (isFiveApart) window.tarotApp.zoom();  // 五指张开
      else if (isTwoFingers) window.tarotApp.draw(); // 两指抽取
    }

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
    lm.forEach(p => { canvasCtx.beginPath(); canvasCtx.arc(p.x * canvasElement.width, p.y * canvasElement.height, 2, 0, 2*Math.PI); canvasCtx.fill(); canvasCtx.stroke(); });
  }
  canvasCtx.restore();
});

document.getElementById('start-cam-btn').addEventListener('click', () => {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('ui-layer').style.display = 'block';
  videoElement.play().catch(()=>{}); 
  setStatus("正在建立星空连接...");
  
  const cameraUtils = new Camera(videoElement, { onFrame: async () => { await hands.send({ image: videoElement }); }, width: 320, height: 240 });
  cameraUtils.start().then(() => setStatus("星空已连接，等待手势指令"));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
