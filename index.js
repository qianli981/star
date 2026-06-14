// --- 1. 生成完整的 78 张塔罗牌字典 ---
const majorArcana = ["愚者 The Fool","魔术师 The Magician","女祭司 The High Priestess","皇后 The Empress","皇帝 The Emperor","教皇 The Hierophant","恋人 The Lovers","战车 The Chariot","力量 Strength","隐士 The Hermit","命运之轮 Wheel of Fortune","正义 Justice","倒吊人 The Hanged Man","死神 Death","节制 Temperance","恶魔 The Devil","高塔 The Tower","星星 The Star","月亮 The Moon","太阳 The Sun","审判 Judgement","世界 The World"];
const suits = ["权杖 Wands", "圣杯 Cups", "宝剑 Swords", "星币 Pentacles"];
const ranks = ["Ace", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "Page", "Knight", "Queen", "King"];
const fullDeckData = [...majorArcana];
suits.forEach(suit => ranks.forEach(rank => fullDeckData.push(`${suit} ${rank}`)));

// 全局状态机
const STATE = { INIT: 'a', SHUFFLE: 'b', DRAW: 'c', FLIP: 'd' };
let currentState = STATE.INIT;
let drawnCardIndex = -1; 
let isReversed = false;
let handVector = { x: 0, y: 0 };
let lastIndexX = null; // 用于检测晃动

// --- 2. Three.js 场景与渲染器 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 12;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x4A154B, 1.2); scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xFFEAAA, 2); dirLight.position.set(5, 5, 8); scene.add(dirLight);

// --- 3. 材质生成器 (黑金背面 + 动态正面) ---
function createCardBackTexture() {
  const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 896;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#05050A'; ctx.fillRect(0, 0, 512, 896);
  ctx.strokeStyle = '#E6C27A'; ctx.lineWidth = 4; ctx.strokeRect(20, 20, 472, 856);
  ctx.beginPath(); ctx.arc(256, 448, 120, 0, Math.PI*2); ctx.stroke();
  for(let i=0; i<8; i++){ ctx.moveTo(256, 328); ctx.lineTo(256+150*Math.sin(i*Math.PI/4), 448-150*Math.cos(i*Math.PI/4)); ctx.stroke(); }
  return new THREE.CanvasTexture(cvs);
}

// 动态生成被抽中那张牌的正面图案
function generateFaceTexture(cardName) {
  const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 896;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#1A1A24'; ctx.fillRect(0, 0, 512, 896); // 幽暗背景
  ctx.strokeStyle = '#E6C27A'; ctx.lineWidth = 8; ctx.strokeRect(15, 15, 482, 866);
  
  // 绘制正面黑金法阵
  ctx.beginPath(); ctx.arc(256, 448, 180, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(230, 194, 122, 0.1)'; ctx.fill();
  
  // 写入牌名
  ctx.fillStyle = '#E6C27A'; ctx.textAlign = "center";
  ctx.font = "bold 36px serif"; ctx.fillText(cardName.split(' ')[0], 256, 100); // 中文
  ctx.font = "italic 28px serif"; ctx.fillText(cardName.split(' ').slice(1).join(' '), 256, 140); // 英文
  
  return new THREE.CanvasTexture(cvs);
}

const backTexture = createCardBackTexture();
const deck = new THREE.Group();
const cards = [];

// 建立完整的 78 张牌模型
const cardGeo = new THREE.PlaneGeometry(2.4, 4.2);
for (let i = 0; i < 78; i++) {
  // 每张牌都有两面：0是正面(暂为黑屏)，1是背面
  const matFront = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 });
  const matBack = new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.2, metalness: 0.8 });
  const card = new THREE.Mesh(cardGeo, [matFront, matFront, matFront, matFront, matFront, matBack]);
  
  card.position.set(0, 0, -i * 0.005);
  card.rotation.y = Math.PI; // 初始全背面朝上
  cards.push(card); deck.add(card);
}
scene.add(deck);

// --- 边缘粒子特效 (抽牌时显示) ---
const particleGeo = new THREE.BufferGeometry();
const particlePos = [];
for(let i=0; i<100; i++) {
  particlePos.push((Math.random()-0.5)*3, (Math.random()-0.5)*5, (Math.random()-0.5)*0.5);
}
particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePos, 3));
const particleMat = new THREE.PointsMaterial({ color: 0xE6C27A, size: 0.1, transparent: true, opacity: 0 });
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

function animate() {
  requestAnimationFrame(animate);
  // a状态：重叠缓慢呼吸
  if(currentState === STATE.INIT) deck.position.y = Math.sin(Date.now()*0.002)*0.1;
  // b状态：牌组跟随手的向量移动
  if(currentState === STATE.SHUFFLE) {
    deck.position.x += (handVector.x * 15 - deck.position.x) * 0.05;
    deck.position.y += (handVector.y * 10 - deck.position.y) * 0.05;
  }
  // c/d状态：边缘粒子舞动
  if(currentState === STATE.DRAW || currentState === STATE.FLIP) {
    const positions = particles.geometry.attributes.position.array;
    for(let i=0; i<300; i+=3) { positions[i] += Math.sin(Date.now()*0.005 + i)*0.01; }
    particles.geometry.attributes.position.needsUpdate = true;
  }
  renderer.render(scene, camera);
}
animate();

// --- 4. 状态机响应 ---
const setStatus = (txt) => document.getElementById('status-text').innerText = txt;
const hideInfo = () => document.getElementById('card-info').style.opacity = 0;

window.tarotApp = {
  // f/a: 握拳重叠
  stack: () => {
    if(currentState === STATE.INIT) return;
    currentState = STATE.INIT; setStatus("万物归原 (握拳)"); hideInfo();
    gsap.to(particles.material, { opacity: 0, duration: 0.5 }); // 关闭粒子
    cards.forEach((card, i) => {
      gsap.to(card.position, { x: 0, y: 0, z: -i * 0.005, duration: 1.2, ease: "power2.inOut" });
      gsap.to(card.rotation, { x: 0, y: Math.PI, z: 0, duration: 1.2 }); // 强制背面
      gsap.to(card.scale, { x: 1, y: 1, z: 1, duration: 0.5 });
    });
  },
  // b/e: 五指散开洗牌
  shuffle: () => {
    if(currentState === STATE.SHUFFLE) return;
    currentState = STATE.SHUFFLE; setStatus("命运流转，跟随指引 (五指张开)"); hideInfo();
    gsap.to(particles.material, { opacity: 0, duration: 0.5 });
    cards.forEach((card) => {
      gsap.to(card.position, {
        x: (Math.random() - 0.5) * 16, y: (Math.random() - 0.5) * 12, z: (Math.random() - 0.5) * 5 - 2,
        duration: 1.5, ease: "power2.out"
      });
      gsap.to(card.rotation, { x: 0, y: Math.PI, z: (Math.random()-0.5)*0.5, duration: 1.5 }); // 全背面
      gsap.to(card.scale, { x: 1, y: 1, z: 1, duration: 0.5 });
    });
  },
  // c: 一指抽牌
  draw: () => {
    if(currentState === STATE.DRAW || currentState === STATE.FLIP) return;
    currentState = STATE.DRAW; setStatus("锁死宿命，摇晃手指翻开 (单指)");
    
    // 随机抽选1张
    drawnCardIndex = Math.floor(Math.random() * 78);
    const targetCard = cards[drawnCardIndex];
    
    // 其他77张牌缩小推远当背景
    cards.forEach((card, i) => {
      if(i !== drawnCardIndex) {
        gsap.to(card.position, { z: -15, duration: 1.5 });
        gsap.to(card.scale, { x: 0.5, y: 0.5, z: 0.5, duration: 1.5 });
      }
    });

    // 抽中牌飞到正中间放大
    deck.position.set(0,0,0); // 重置跟随偏移
    gsap.to(targetCard.position, { x: 0, y: 0, z: 5, duration: 1.2, ease: "power3.out" });
    gsap.to(targetCard.rotation, { x: 0, y: Math.PI, z: 0, duration: 1.2 });
    gsap.to(targetCard.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 1.2 });
    
    // 开启粒子环绕
    particles.position.set(0,0,5);
    gsap.to(particles.material, { opacity: 1, duration: 2 });
  },
  // d: 摇晃翻牌
  flip: () => {
    if(currentState !== STATE.DRAW) return;
    currentState = STATE.FLIP; setStatus("真相显露");
    
    isReversed = Math.random() > 0.5; // 50%正逆位概率
    const targetCard = cards[drawnCardIndex];
    const cardName = fullDeckData[drawnCardIndex];
    
    // 瞬间画出这一张的正面图并贴上
    targetCard.material[4].map = generateFaceTexture(cardName);
    targetCard.material[4].needsUpdate = true;

    // 翻转动画 (如果是逆位，Z轴多转180度)
    gsap.to(targetCard.rotation, { 
      y: 0, // 翻到正面
      z: isReversed ? Math.PI : 0, 
      duration: 1.5, ease: "back.out(1.2)"
    });

    // 弹出解读字板
    setTimeout(() => {
      const info = document.getElementById('card-info');
      info.innerHTML = `<h2>${cardName.split(' ')[0]} ${isReversed ? '(逆位)' : '(正位)'}</h2><p>命运的齿轮已转动，请用心感受画面的启示。</p>`;
      info.style.opacity = 1;
    }, 1000);
  }
};

// --- 5. 摄像头与手势识别 ---
const videoElement = document.getElementById('video-input');
const canvasElement = document.getElementById('gesture-canvas');
const canvasCtx = canvasElement.getContext('2d');

const hands = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6 });

hands.onResults((results) => {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    
    // 记录手势向量给 b 洗牌状态使用
    handVector.x = (0.5 - lm[9].x);
    handVector.y = (0.5 - lm[9].y);

    const indexTipY = lm[8].y, middleTipY = lm[12].y;
    const indexBaseY = lm[5].y, middleBaseY = lm[9].y;
    const ringTipY = lm[16].y, ringBaseY = lm[13].y;

    const isFist = indexTipY > indexBaseY && middleTipY > middleBaseY && ringTipY > ringBaseY;
    const isOpen = indexTipY < indexBaseY && middleTipY < middleBaseY && ringTipY < ringBaseY;
    const isOneFinger = indexTipY < indexBaseY && middleTipY > middleBaseY;

    // 严格按照流程判定
    if (isFist) window.tarotApp.stack(); // f: 变拳头重叠
    else if (isOpen) window.tarotApp.shuffle(); // b/e: 张开洗牌
    else if (isOneFinger) {
      if(currentState === STATE.SHUFFLE) window.tarotApp.draw(); // c: 一指抽牌
      // d: 检测单指晃动 (通过X轴坐标剧烈变化)
      if(currentState === STATE.DRAW) {
        if(lastIndexX !== null && Math.abs(lm[8].x - lastIndexX) > 0.08) {
          window.tarotApp.flip();
        }
        lastIndexX = lm[8].x;
      }
    }

    // 画骨架
    canvasCtx.fillStyle = "#E6C27A";
    lm.forEach(p => { canvasCtx.beginPath(); canvasCtx.arc(p.x * 100, p.y * 75, 2, 0, 2*Math.PI); canvasCtx.fill(); });
  }
});

// 绑定启动按钮 
document.getElementById('start-cam-btn').addEventListener('click', () => {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('ui-layer').style.display = 'block';
  
  // 关键：增加加载提示，让你知道它到底是不是卡在网络了
  setStatus("正在从云端召唤 AI 灵视模型，请耐心等待..."); 
  
  const cameraUtils = new Camera(videoElement, {
    onFrame: async () => { 
      // 只要有一帧画面传过来，就说明摄像头真通了
      await hands.send({ image: videoElement }); 
    },
    width: 320, height: 240
  });

  cameraUtils.start().then(() => {
    setStatus("摄像头已唤醒，正在加载手势模型...");
  }).catch((err) => {
    setStatus("摄像头唤醒失败，请检查浏览器权限。");
  });
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
