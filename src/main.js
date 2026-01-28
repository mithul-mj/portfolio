
import '@fontsource/permanent-marker';

// DOM Elements
const horizontalContent = document.getElementById('horizontal-content');
const canvas = document.getElementById('character-canvas');
const ctx = canvas.getContext('2d');
const leavesCanvas = document.getElementById('leaves-canvas');
const leavesCtx = leavesCanvas.getContext('2d');
const lantern = document.getElementById('lantern-cursor');

// --- LANTERN CURSOR LOGIC ---
document.addEventListener('mousemove', (e) => {
  // Update lantern position directly
  // Using transform is more performant than top/left
  lantern.style.transform = `translate(${e.clientX - 100}px, ${e.clientY - 100}px)`;
});

// State
let lastScrollY = window.scrollY;
let isScrollingTimer = null;
let isWalking = false;
let walkTime = 0;
let facingRight = true;
let tick = 0;
let slashTimer = 0; // State for attack animation

// Config - Dynamic for Resize
let viewportHeight = window.innerHeight;
let viewportWidth = window.innerWidth;
// Sync key markers with viewport width
let fallStart = viewportWidth * 2.1;
let landStart = fallStart + 4000;

const skillLists = document.querySelectorAll('.skill-list');
const runeContainers = document.querySelectorAll('.rune-container');
const walkerContainer = document.getElementById('walker-container');
const contactPanel = document.querySelector('.panel.contact');

// ... existing code ...

function resize() {
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;

  // Recalculate triggers
  fallStart = viewportWidth * 2.1;
  landStart = fallStart + 4000;

  leavesCanvas.width = window.innerWidth;
  leavesCanvas.height = window.innerHeight;
  // Canvas resolution matching display size
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}

// --- PARTICLES ---
let leaves = [];
let dust = [];
const leafCount = 40;
const dustCount = 80;

// --- PORTRAIT PARTICLES ---
const heroImg = document.querySelector('.hero-image');
let portraitParticles = [];
let portraitTriggered = false;



window.addEventListener('resize', resize);
resize();

// Init Particles
for (let i = 0; i < leafCount; i++) leaves.push(createLeaf());
for (let i = 0; i < dustCount; i++) dust.push(createDust());

// Init Portrait Particles
// We wait slightly for image load or try immediately
if (heroImg) {
  if (heroImg.complete) initPortraitParticles();
  else heroImg.onload = initPortraitParticles;
}

// Init Landing Pose Image
const landingImg = new Image();
landingImg.src = '/landing_pose.jpg';

function createLeaf() {
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight - 100,
    size: Math.random() * 5 + 3,
    speedY: Math.random() * 1 + 0.5,
    speedX: Math.random() * 1 - 0.5,
    rotation: Math.random() * 360,
    rSpeed: Math.random() * 2 - 1,
    opacity: Math.random() * 0.5 + 0.2
  };
}

function createDust() {
  return {
    x: Math.random() * window.innerWidth,
    y: window.innerHeight - (Math.random() * 200), // Bottom area
    size: Math.random() * 2 + 0.5,
    length: Math.random() * 50 + 20, // Long streaks for wind
    speedX: -(Math.random() * 15 + 8), // Fast wind against char
    opacity: Math.random() * 0.15 + 0.05
  };
}

// --- CLOTH PHYSICS HELPER ---
class ClothPoint {
  constructor(x, y) { this.x = x; this.y = y; this.ox = x; this.oy = y; }
  update(targetX, targetY, drag) {
    // Simple Verlet-ish easing
    this.x += (targetX - this.x) * drag;
    this.y += (targetY - this.y) * drag;
  }
}
// Instantiate cloth points
const leftSleeveTip = new ClothPoint(0, 0);
const rightSleeveTip = new ClothPoint(0, 0);
const hakamaLeft = new ClothPoint(0, 0);
const hakamaRight = new ClothPoint(0, 0);
const headRibbon = new ClothPoint(0, 0);

// --- ANIMATION LOOP ---
function update() {
  const scrollY = window.scrollY;
  tick += 0.05;

  let isFalling = false;
  let isSpecialMove = false; // New State for Interaction

  // -- CHARACTER X-POSITION LOGIC --
  // Map scroll progress (0 to fallStart) to screen position (10% to 50%)
  if (walkerContainer) {
    if (scrollY < fallStart) {
      const progress = Math.min(scrollY / fallStart, 1.0);
      // Lerp from 5% (Left End) to 50% (Center Hole)
      const newLeft = 5 + (45 * progress);
      walkerContainer.style.left = `${newLeft}%`;
    } else {
      walkerContainer.style.left = '50%'; // Lock to center for fall
    }
  }

  // --- PORTRAIT TRIGGER CHECK ---
  if (heroImg && portraitParticles.length > 0) {
    const rect = heroImg.getBoundingClientRect();
    const triggerPoint = window.innerWidth * 0.20; // 20% - Disintegration
    const preparePoint = window.innerWidth * 0.40; // 40% - Start Special Move
    const resetPoint = window.innerWidth * 0.45;

    // Calculate Special Move State
    if (!portraitTriggered && rect.left < preparePoint && rect.left > triggerPoint) {
      isSpecialMove = true;
    }

    // TRIGGER (Disintegrate)
    // Add scroll check to prevent immediate triggering on mobile where image might start at left=0
    if (!portraitTriggered && rect.left < triggerPoint && lastScrollY > 50) {
      portraitTriggered = true;
      slashTimer = 25; // Trigger 25-frame Slash Animation
      heroImg.style.opacity = 0; // Hide real image
      heroImg.style.transition = 'opacity 0.2s';
    }

    // RESET (Reform)
    if (portraitTriggered && rect.left > resetPoint) {
      portraitTriggered = false;
      heroImg.style.opacity = 0.9;
      portraitParticles.forEach(p => {
        p.exploded = false;
        p.size = Math.random() * 3 + 2;
        p.rotation = Math.random() * 360; // Reset rotation too
      });
    }
  }

  // -- SCROLL LOGIC --
  if (scrollY < fallStart) {
    // PHASE 1: Horizontal
    isFalling = false;
    horizontalContent.style.transform = `translateX(${-scrollY}px)`;

    const delta = scrollY - lastScrollY;
    if (Math.abs(delta) > 0.5) {
      isWalking = true;
      // If moving right (scroll down), he faces right.
      facingRight = delta > 0;
      if (isScrollingTimer) clearTimeout(isScrollingTimer);
      isScrollingTimer = setTimeout(() => { isWalking = false; }, 150);
    }
  } else if (scrollY < landStart) {
    // PHASE 2: Fall
    isFalling = true;
    isWalking = false;
    // Lock X-axis, but move Y-axis UP to simulate falling
    const deepScroll = scrollY - fallStart;
    horizontalContent.style.transform = `translate(${-fallStart}px, ${-deepScroll}px)`;

    const parallaxSpeed = 0.5;
    skillLists.forEach((list, i) => {
      const offset = -deepScroll * parallaxSpeed;
      list.style.transform = `translateY(${offset}px)`;
    });

    // -- RUNES FADE-IN LOGIC --
    runeContainers.forEach(rune => {
      const rect = rune.getBoundingClientRect();
      const viewH = window.innerHeight;

      // Fade in as they enter from bottom
      // Start appearing at 100% height, fully visible at 80% height
      const enterStart = viewH + 100;
      const enterEnd = viewH * 0.5;

      let op = 0;
      if (rect.top < enterStart) {
        if (rect.top > enterEnd) {
          // Transition
          op = 1 - (rect.top - enterEnd) / (enterStart - enterEnd);
        } else {
          // Visible
          op = 1;
        }
      }
      // rune.style.opacity = Math.max(0, Math.min(op, 1));
    });

    // -- ABYSS RISE LOGIC (During Fall Only) --
    // We want the darkness to rise UP to meet the character as they dive.
    // deepScroll goes from 0 to infinity (pixel units).
    // Let's say by 500px fall, it should be fully dark (-20vh).
    const abyssHole = document.querySelector('.abyss-hole');
    if (abyssHole) {
      const fallDistance = 800; // Pixels to full darkness
      const progress = Math.min(deepScroll / fallDistance, 1.0);

      // Start: 100vh (Hidden below) -> End: -20vh (Full screen)
      const startY = 100;
      const endY = -20;
      const currentY = startY - ((startY - endY) * progress);

      abyssHole.style.transform = `translateY(${currentY}vh)`;
      abyssHole.style.opacity = Math.min(progress * 1.5, 1);
    }
  }

  // Handle Fall State Effects
  if (isFalling) {
    // Force full cinematic mode during fall
    document.querySelectorAll('.cinema-bar').forEach(bar => bar.style.height = '10vh');
    const vig = document.querySelector('.cinema-vignette');
    if (vig) vig.style.opacity = 0.8;
  } else {
    // Normal Cinematic Logic (Approach)
    const cinemaStart = viewportWidth * 1.8;
    const cinemaEnd = viewportWidth * 2.3;
    const bars = document.querySelectorAll('.cinema-bar');
    const vig = document.querySelector('.cinema-vignette');

    if (scrollY > cinemaStart) {
      const cinProgress = (scrollY - cinemaStart) / (cinemaEnd - cinemaStart);
      const clampedCin = Math.min(Math.max(cinProgress, 0), 1);
      const barHeight = clampedCin * 10; // 0 to 10vh

      bars.forEach(b => b.style.height = `${barHeight}vh`);
      if (vig) vig.style.opacity = clampedCin * 0.8;
    } else {
      bars.forEach(b => b.style.height = `0`);
      if (vig) vig.style.opacity = 0;
    }

    // Reset Abyss if not falling
    const abyssHole = document.querySelector('.abyss-hole');
    if (abyssHole) {
      abyssHole.style.transform = `translateY(100vh)`;
      abyssHole.style.opacity = 0;
    }
  }

  // Handle Landing State
  if (scrollY >= landStart) {
    // PHASE 3: LANDED
    isFalling = false;
    isWalking = false;

    // Stop the horizontal/vertical scroll at the landing point visually
    // effectively locking the view to the campfire scene
    const deepScroll = landStart - fallStart;
    horizontalContent.style.transform = `translate(${-fallStart}px, ${-deepScroll}px)`;

    // Move Skills away or keep them frozen? Keep frozen.

    // Reveal Contact Panel - DISABLED per user request ("nothing on screen")
    if (contactPanel) {
      // contactPanel.classList.add('active');
      // contactPanel.style.opacity = 1; 
      // contactPanel.style.pointerEvents = 'all';
      contactPanel.style.opacity = 0; // Ensure hidden
      contactPanel.style.pointerEvents = 'none';
    }

    // Hide walker or transition to sitting
    // if (walkerContainer) walkerContainer.style.opacity = 0; <--- OLD

    // NEW: Keep walker visible for the Epic Pose
    if (walkerContainer) {
      walkerContainer.style.opacity = 1;
      // Position him nicely on the "Hill" (CSS positions him, we just draw)
    }

    // Draw the Epic Landed Pose
    drawSamuraiLanded(ctx, tick);

    // Draw Global FX over it
    drawFx();

    lastScrollY = scrollY;
    requestAnimationFrame(update);
    return; // SKIP REST OF LOOP (Don't draw walking/falling)

  } else {
    // Not landed yet
    if (contactPanel) {
      contactPanel.classList.remove('active');
      contactPanel.style.opacity = 0;
      contactPanel.style.pointerEvents = 'none';
    }
    if (walkerContainer) walkerContainer.style.opacity = 1;
  }


  // Animation Timers
  if (isWalking) walkTime += 0.2;
  else if (isFalling) walkTime += 0.1;
  else walkTime = 0;

  // Decrement Slash Timer
  if (slashTimer > 0) slashTimer--;

  // Draw Proper State (Samurai)
  if (isFalling) {
    drawSamuraiFalling(ctx, walkTime);
  } else {
    // Combat Mode Detection: Section 2 (Selected Works)
    // Map roughly 100vw to 180vw (End of Selected Works / Start of Cinematic)
    const combatMode = scrollY > viewportWidth * 0.9 && scrollY < viewportWidth * 1.8;

    // RUN SPRINT LOGIC
    // After combat ends (1.8vw) and before fall (2.4vw), increase animation speed
    // to simulate sprinting towards the edge.
    let speedMultiplier = 1.0;
    if (scrollY > viewportWidth * 1.8 && scrollY < fallStart) {
      speedMultiplier = 2.0; // RUN FASTER
    }

    // Override the time sent to draw function for faster leg movement if sprinting
    const effectiveTime = walkTime * speedMultiplier;

    drawSamuraiWalking(ctx, effectiveTime, isWalking, facingRight, tick, combatMode, isSpecialMove, slashTimer);
  }

  // Draw Global FX
  drawFx();

  lastScrollY = scrollY;
  requestAnimationFrame(update);
}

// --- DRAW FX (Leaves + Dust) ---
function drawFx() {
  leavesCtx.clearRect(0, 0, leavesCanvas.width, leavesCanvas.height);

  // 1. LEAVES
  leaves.forEach(leaf => {
    leaf.y += leaf.speedY;
    leaf.x += leaf.speedX + Math.sin(tick * 0.1 + leaf.y * 0.01) * 0.5;
    leaf.rotation += leaf.rSpeed;
    if (leaf.y > leavesCanvas.height) { leaf.y = -10; leaf.x = Math.random() * leavesCanvas.width; }

    leavesCtx.save();
    leavesCtx.translate(leaf.x, leaf.y);
    leavesCtx.rotate(leaf.rotation * Math.PI / 180);
    leavesCtx.fillStyle = `rgba(30, 25, 20, ${leaf.opacity})`;
    leavesCtx.beginPath();
    leavesCtx.ellipse(0, 0, leaf.size, leaf.size / 2, 0, 0, Math.PI * 2);
    leavesCtx.fill();
    leavesCtx.restore();
  });

  // 2. DUST WIND
  dust.forEach(d => {
    d.x += d.speedX;
    if (d.x < -100) d.x = leavesCanvas.width + 100;

    leavesCtx.save();
    leavesCtx.beginPath();
    // Fast wind streaks
    const gradient = leavesCtx.createLinearGradient(d.x, d.y, d.x + d.length, d.y);
    gradient.addColorStop(0, `rgba(180, 160, 120, 0)`);
    gradient.addColorStop(0.5, `rgba(180, 160, 120, ${d.opacity})`);
    gradient.addColorStop(1, `rgba(180, 160, 120, 0)`);

    leavesCtx.strokeStyle = gradient;
    leavesCtx.lineWidth = d.size;
    leavesCtx.moveTo(d.x, d.y);
    leavesCtx.lineTo(d.x + d.length, d.y + (Math.random() * 2 - 1)); // Slight jitter
    leavesCtx.stroke();
    leavesCtx.stroke();
    leavesCtx.restore();
  });

  // 3. PORTRAIT PARTICLES
  if (portraitTriggered && portraitParticles.length > 0) {
    // Get rect for "Origin" reference if needed, but we already have triggered
    // We assume particles were 'at rest' relative to the image when it triggered.
    // We need to know where the image WAS when triggered?
    // Actually, we can calculate the current 'hypothetical' position of the image
    // even if hidden, using its rect (which updates with scroll).

    const rect = heroImg.getBoundingClientRect();

    portraitParticles.forEach(p => {
      if (!p.exploded) {
        // Initialize start position based on current image rect
        p.currX = rect.left + p.nx * rect.width;
        p.currY = rect.top + p.ny * rect.height;

        // Velocity: Fly LEFT/Up (dispersing)
        // Random cone pointing Left (135 to 225 degrees)
        const angle = (Math.random() * 90 + 135) * Math.PI / 180;
        const speed = Math.random() * 4 + 1; // Slower start

        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 0.5; // Gentle upward bias

        p.exploded = true;
      }

      // Physics
      p.currX += p.vx;
      p.currY += p.vy;
      p.vy += 0.05; // Low gravity for floating effect
      p.vx *= 0.99; // Low air resistance
      p.size *= 0.99; // Very slow shrink

      p.rotation += p.rSpeed; // Spin

      if (p.size > 0.2) {
        leavesCtx.save();
        leavesCtx.translate(p.currX, p.currY);
        leavesCtx.rotate(p.rotation * Math.PI / 180);
        leavesCtx.fillStyle = p.c;
        leavesCtx.beginPath();
        // Draw Leaf Shape (Ellipse)
        leavesCtx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
        leavesCtx.fill();
        leavesCtx.restore();
      }
    });
  }
}

// --- DRAW: WALKING & COMBAT ---
function drawSamuraiWalking(ctx, time, moving, isFacingRight, tick, combatMode = false, isSpecialMove = false, slashTimer = 0) {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2 + 50; // Raised slightly so feet hit shadow

  ctx.clearRect(0, 0, w, h);

  // CLIFF JUMP LOGIC
  // We need to check if we are near the "Edge" (2.4 * VW)
  // Let's use the global lastScrollY to detect proximity to the fall
  const edgeStart = window.innerWidth * 2.3; // Steps before edge
  const edgeEnd = window.innerWidth * 2.4;   // The Void

  let cliffJumpY = 0;
  let cliffJumpRot = 0;

  if (lastScrollY > edgeStart && lastScrollY < edgeEnd) {
    // We are in the "Launch Zone"
    // Progress 0 to 1
    const launchProg = (lastScrollY - edgeStart) / (edgeEnd - edgeStart);

    // Parabolic Arc: 4 * x * (1 - x)
    // Height: 150px
    cliffJumpY = Math.sin(launchProg * Math.PI) * 150;

    // Rotate forward to dive
    cliffJumpRot = launchProg * 0.5;

    // Force tucked legs
    combatMode = true; // Use jump sprites
  }

  // COMBAT STATE LOGIC
  let jumpY = 0;
  let swordRot = -0.6; // Default carry pose
  let isAttacking = false;
  let isDiving = false; // New flag for cliff dive
  let lLegOffset = 0;
  let rLegOffset = Math.PI;

  // Merge combat jump with cliff jump
  if (cliffJumpY > 0) {
    jumpY = cliffJumpY;
    moving = true;
    isDiving = true; // Trigger Dive Pose
  } else if (combatMode && moving) {
    const cycle = time % 12; // 12-frame loop

    // JUMP PHASE (Frames 6-10)
    if (cycle > 6 && cycle < 11) {
      const jumpProgress = (cycle - 6) / 5;
      jumpY = Math.sin(jumpProgress * Math.PI) * 80; // High Jump
      // Tuck legs during jump
      lLegOffset = -Math.PI / 4;
      rLegOffset = Math.PI / 4;
    }

    // ATTACK PHASE 1 (Ground Slash: Frames 2-5)
    if (cycle > 2 && cycle < 5) {
      isAttacking = true;
      swordRot = 1.5 - Math.sin((cycle - 2) * 1.5) * 3.5; // Big overhead swing
    }

    // ATTACK PHASE 2 (Air Spin: Frames 8-10)
    if (cycle > 8 && cycle < 10) {
      isAttacking = true;
      swordRot = time * 2; // Spin sword
    }
  }

  // --- SPECIAL MOVE: IAIDO SLASH ---
  // Default Charge (Preparation)
  if (isSpecialMove) {
    moving = false;
    lLegOffset = -0.5; rLegOffset = 0.5;
    jumpY = -15; // Crouch
    swordRot = -1.8; // Hilt Charge
    isAttacking = false;
  }

  // SLASH ACTION (Triggered by Timer)
  if (slashTimer > 0) {
    moving = false;
    lLegOffset = 0.5; rLegOffset = -0.5; // Lunge
    jumpY = -5; // Rise slightly

    // Slicing Animation
    // Sword goes from Charged (-1.8) to Extended (1.5)
    // slashTimer goes 25 -> 0
    const progress = 1 - (slashTimer / 25);

    // Easing Out Cubic
    const ease = 1 - Math.pow(1 - progress, 3);

    swordRot = -1.8 + (ease * 3.5); // Fast swing to 1.7 rad
    isAttacking = true;
  }

  // Ground Shadow (Shrink when jumping)
  ctx.save();
  ctx.translate(cx, cy + 35);
  ctx.scale(1, 0.2);
  const shadowAlpha = Math.max(0, 0.6 - (jumpY / 80)); // Fade out completely on high jump
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
  ctx.beginPath();
  const shadowSize = Math.max(0, 30 - (jumpY / 3)); // Shrink shadow to nothing
  ctx.ellipse(0, 0, shadowSize, shadowSize / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  // Apply Cliff Rotation
  ctx.rotate(cliffJumpRot);

  if (!isFacingRight) ctx.scale(-1, 1);

  const inkColor = '#1a1816';

  // --- DIVE POSE DRAWING (Replaces Standard Walk/Combat Body) ---
  if (isDiving) {
    // DIVE BODY (V-Shape Falling)
    ctx.translate(0, -jumpY); // Apply Height

    // Legs (V-Shape Up)
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    // Left Leg
    ctx.moveTo(0, 0);
    ctx.lineTo(25, -20); // Knee Out/Up
    ctx.lineTo(40, -40); // Foot Up
    ctx.lineTo(0, 0);
    ctx.fill();

    // Right Leg
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(30, -15);
    ctx.lineTo(45, -35);
    ctx.lineTo(0, 0);
    ctx.fill();

    // Hakama Blowing Up
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(30, -50, 60, -80); // Billow
    ctx.quadraticCurveTo(0, -20, 0, 0);
    ctx.fill();

    // Torso (Arched Back)
    ctx.save();
    ctx.rotate(-0.5); // Dive angle
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(-15, -45);
    ctx.quadraticCurveTo(5, -50, 15, -45);
    ctx.lineTo(10, 10);
    ctx.fill();

    // Head (Looking down/forward)
    ctx.beginPath();
    ctx.arc(0, -55, 12, 0, Math.PI * 2);
    ctx.fill();

    // Arms (Reaching)
    // Back Arm
    ctx.lineWidth = 8;
    ctx.strokeStyle = inkColor;
    ctx.beginPath();
    ctx.moveTo(-10, -45);
    ctx.lineTo(10, -80); // Reaching Up/Back
    ctx.stroke();

    // Front Arm
    ctx.beginPath();
    ctx.moveTo(10, -45);
    ctx.lineTo(30, -75);
    ctx.stroke();

    ctx.restore(); // End Torso

    ctx.restore(); // End Main Context
    return; // SKIP NORMAL DRAWING
  }

  // -- IDLE ANIMATION: BREATHING --
  const breath = Math.sin(tick * 0.5) * 0.02;
  ctx.scale(1, 1 + breath);

  // -- BOBBING + JUMP --
  const bounce = moving ? Math.abs(Math.sin(time)) * 8 : Math.sin(tick) * 2;
  // Apply Jump Y
  ctx.translate(0, -bounce - jumpY);

  // -- PHYSICS UPDATE --
  const windForce = Math.sin(tick) * 3 + 2 + (moving ? (isFacingRight ? -5 : 5) : 0);

  const strideFn = (offset) => Math.sin(time + offset) * 20;

  // Leg Logic (Normal vs Jump)
  let lLegX, rLegX;
  if (jumpY > 10) {
    // Jumping Pose (Tucked)
    lLegX = -10;
    rLegX = 10;
  } else {
    // Walking stride
    lLegX = moving ? strideFn(lLegOffset) : -10;
    rLegX = moving ? strideFn(rLegOffset) : 10;
  }

  // Update Cloth Physics
  // If jumping, cloth drags down violently
  const clothDragY = jumpY > 0 ? 35 + jumpY * 0.5 : 35;
  hakamaLeft.update(lLegX - 25 + windForce, clothDragY, 0.1);
  hakamaRight.update(rLegX + 25 + windForce, clothDragY, 0.1);

  ctx.fillStyle = inkColor;

  // --- DRAWING LEGS ---
  // Left Leg
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.quadraticCurveTo(lLegX - 25, 0, hakamaLeft.x, hakamaLeft.y);
  // If jumping, feet point down
  const footY = jumpY > 10 ? 45 : 35;
  ctx.lineTo(lLegX + 5, footY);
  ctx.quadraticCurveTo(lLegX + 15, 0, 0, -20);
  ctx.fill();

  // Right Leg
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.quadraticCurveTo(rLegX - 20, 0, hakamaRight.x, hakamaRight.y);
  const rFootY = jumpY > 10 ? 48 : 38;
  ctx.lineTo(rLegX + 25, rFootY);
  ctx.quadraticCurveTo(rLegX + 25, 0, 0, -20);
  ctx.fill();

  // Torso (Lean forward if attacking or running)
  ctx.save();
  if (combatMode && moving) ctx.rotate(0.2); // Aggressive lean

  ctx.beginPath();
  ctx.moveTo(4, -20);
  ctx.lineTo(-4, -20);
  ctx.lineTo(-15, -65);
  ctx.lineTo(12, -62);
  ctx.fill();

  // Head
  ctx.save();
  const headTurn = Math.sin(tick * 0.3) * 0.05;
  ctx.rotate(headTurn);

  ctx.beginPath();
  ctx.moveTo(2, -60);
  ctx.lineTo(8, -62);
  ctx.lineTo(10, -68);
  ctx.lineTo(8, -75);
  ctx.lineTo(0, -78);
  ctx.lineTo(-8, -75);
  ctx.lineTo(-6, -65);
  ctx.fill();

  // Bun
  ctx.beginPath();
  ctx.ellipse(-8, -72, 5, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Headband
  const ribbonTargetX = -30 + (moving ? -20 : 0) + windForce * 2;
  const ribbonTargetY = -60 + Math.sin(tick * 2) * 5 + (jumpY * 0.5); // Ribbon flies up on descent
  headRibbon.update(ribbonTargetX, ribbonTargetY, 0.05);

  ctx.strokeStyle = inkColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -68);
  ctx.quadraticCurveTo(-15, -70, headRibbon.x, headRibbon.y);
  ctx.stroke();

  ctx.restore(); // End Head

  // Arms / Sleeves
  const armSwing = moving ? Math.abs(Math.sin(time)) * 0.4 : 0.05;

  // Left Arm (Sleeve)
  let lSleeveX = -12 + (moving ? Math.sin(0.3 + armSwing) * 5 : windForce);
  let lSleeveY = -35 + (jumpY * 0.1);
  leftSleeveTip.update(lSleeveX, lSleeveY, 0.1);
  drawDetailedSleeve(ctx, -12, -62, leftSleeveTip, inkColor);

  // SWORD ARM (Right)
  ctx.save();
  ctx.translate(-5, -28); // Shoulder pivot

  // Apply Sword Rotation (Normal vs Combat)
  let currentSwordAngle = -0.5 + (moving ? Math.sin(time) * 0.1 : 0) + breath;
  if (combatMode && moving) {
    if (isAttacking) currentSwordAngle = swordRot;
    else currentSwordAngle = -1.5; // Guard position when running in combat
  }

  ctx.rotate(currentSwordAngle);

  // Sword Itself
  ctx.fillStyle = '#111';
  ctx.fillRect(-30, -2, 60, 5); // Blade

  // Hilt
  ctx.fillStyle = '#333';
  ctx.fillRect(-22, -4, 4, 9);

  // SWORD TRAIL FX (If attacking)
  if (isAttacking) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, 80, -0.2, 0.2); // Arc trail
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.restore();

  // Right Sleeve
  let rSleeveX = 8 + (moving ? Math.sin(-0.3 - armSwing) * 5 : windForce);
  let rSleeveY = -35 + (jumpY * 0.1);
  rightSleeveTip.update(rSleeveX, rSleeveY, 0.1);
  drawDetailedSleeve(ctx, 8, -60, rightSleeveTip, inkColor);

  ctx.restore(); // End Body
  ctx.restore(); // End Main Flip
}

function drawDetailedSleeve(ctx, originX, originY, tipPoint, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(originX + 5, originY);

  let midX = (originX + tipPoint.x) / 2;
  let midY = (originY + tipPoint.y) / 2 + 10;

  ctx.quadraticCurveTo(midX, midY, tipPoint.x, tipPoint.y);
  ctx.lineTo(tipPoint.x - 5, tipPoint.y - 5);
  ctx.quadraticCurveTo(midX - 5, midY - 5, originX, originY + 10);
  ctx.fill();
}

// --- DRAW: FALLING (CINEMATIC V-SHAPE) ---
function drawSamuraiFalling(ctx, time) {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(cx, cy);

  const inkColor = '#1a1816';

  // Cinematic Float/Jitter
  ctx.translate(Math.sin(time * 2) * 4, Math.cos(time * 1.5) * 4);

  // Global Rotation: Tilted back slightly
  ctx.rotate(0.1 + Math.sin(time) * 0.05);

  // Style Settings for Softness
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // V-SHAPE POSE LOGIC
  // Core (Hips) is at (0,0) and leads the fall.

  // --- LEGS (Angled Forward/Up) ---
  const legAngle = -0.6 + Math.cos(time * 2) * 0.1; // Radians

  // Calc Leg End Points (Knees/Feet)
  const lKneeX = Math.cos(legAngle) * 30 + 5;
  const lKneeY = Math.sin(legAngle) * 30 - 10;
  const lFootX = Math.cos(legAngle) * 55 + 10;
  const lFootY = Math.sin(legAngle) * 55 - 20;

  const rKneeX = Math.cos(legAngle + 0.2) * 30 + 10;
  const rKneeY = Math.sin(legAngle + 0.2) * 30;
  const rFootX = Math.cos(legAngle + 0.2) * 55 + 15;
  const rFootY = Math.sin(legAngle + 0.2) * 55;

  ctx.fillStyle = inkColor;
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = 12; // Thicker limbs for softness

  // Draw Legs (visible "meat")
  ctx.beginPath();
  ctx.moveTo(0, 0); // Hips
  ctx.lineTo(lKneeX, lKneeY);
  ctx.lineTo(lFootX, lFootY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(rKneeX, rKneeY);
  ctx.lineTo(rFootX, rFootY);
  ctx.stroke();

  // --- HAKAMA (Billowing BETWEEN/ABOVE Legs) ---
  // Calculates cloth points being pushed UP (-Y) by wind
  hakamaLeft.update(lFootX - 25, -90, 0.1);
  hakamaRight.update(rFootX + 25, -90, 0.1);

  ctx.fillStyle = inkColor;
  ctx.lineWidth = 1;

  // Flowing cloth - Soft curves
  ctx.beginPath();
  ctx.moveTo(0, 0); // Waist
  // Curve up to blown tips
  // Left Pant Billow
  ctx.quadraticCurveTo(lKneeX - 40, -60, hakamaLeft.x, hakamaLeft.y);
  ctx.quadraticCurveTo(lFootX, lKneeY, lFootX, lFootY); // Soft connect to foot
  ctx.lineTo(0, 0); // Back to waist
  ctx.fill();

  // Right Pant Billow
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(rKneeX + 40, -60, hakamaRight.x, hakamaRight.y);
  ctx.quadraticCurveTo(rFootX, rKneeY, rFootX, rFootY);
  ctx.lineTo(0, 0);
  ctx.fill();

  // --- TORSO (Angled Back/Up) ---
  ctx.save();
  ctx.rotate(-0.9); // Lean back ~50deg

  // Soft Torso Shape
  ctx.beginPath();
  ctx.moveTo(0, 8); // Waist connection
  ctx.lineTo(-16, -45); // Shoulder Back
  ctx.quadraticCurveTo(0, -50, 16, -45); // Curvy Neck/Top
  ctx.lineTo(12, 8);    // Waist Front
  ctx.fill();

  // --- HEAD ---
  // Looking UP (at where he fell from)
  ctx.fillStyle = inkColor;
  ctx.beginPath();
  ctx.arc(0, -55, 10, 0, Math.PI * 2);
  ctx.fill();

  // Bun (Soft shape)
  ctx.beginPath();
  ctx.ellipse(-6, -62, 5, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Ribbon (Global Wind affects this)
  ctx.beginPath();
  ctx.moveTo(-6, -55);
  ctx.quadraticCurveTo(-25, -75, -30 + Math.sin(time * 5) * 10, -95);
  ctx.lineWidth = 3;
  ctx.stroke();

  // --- ARMS (Reaching Up/Flailing) ---

  // Back Arm (Reaching Back/Up)
  drawArm(ctx, -15, -45, -2.6 + Math.sin(time) * 0.5);

  // Sword (Being dragged along)
  ctx.save();
  ctx.translate(-10, 0);
  ctx.rotate(-0.2 + Math.sin(time) * 0.1);
  ctx.fillStyle = '#111';
  // Soft sheath
  ctx.beginPath();
  ctx.roundRect(-5, 0, 50, 6, 3);
  ctx.fill();
  ctx.restore();

  // Front Arm (Reaching Forward/Up)
  drawArm(ctx, 15, -45, -0.6 + Math.cos(time) * 0.5);

  ctx.restore(); // Undo Torso Rotate

  // Helper for simple soft arms
  function drawArm(c, x, y, angle) {
    c.save();
    c.translate(x, y);
    c.rotate(angle);

    c.fillStyle = inkColor;
    c.strokeStyle = inkColor;
    c.lineWidth = 10;

    // Arm
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, 32);
    c.stroke();

    // Sleeve billowing DOWN (relative to arm angle = UP in world)
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(25, 20, 8, 50); // Billow
    c.quadraticCurveTo(0, 40, 0, 32); // Connector
    c.restore();
  }

  ctx.restore(); // Final Restore
}

// --- DRAW: EPIC LANDED POSE (Procedural Canvas - Back View Silhouette) ---
function drawSamuraiLanded(ctx, time) {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h * 0.65; // Position character lower in frame

  ctx.clearRect(0, 0, w, h);

  // Silhouette color
  const inkColor = '#0a0a0a';

  // Wind animation
  const wind = Math.sin(time * 0.3) * 8;
  const windFast = Math.sin(time * 0.8) * 5;

  ctx.save();
  ctx.translate(cx, cy);

  // === 1. REALISTIC MOUNTAIN ===

  // Far background mountains (lightest, atmospheric perspective)
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.moveTo(-400, 200);
  ctx.lineTo(-280, 80);
  ctx.quadraticCurveTo(-220, 50, -150, 90);
  ctx.lineTo(-80, 60);
  ctx.quadraticCurveTo(0, 30, 80, 60);
  ctx.lineTo(150, 90);
  ctx.quadraticCurveTo(220, 50, 280, 80);
  ctx.lineTo(400, 200);
  ctx.closePath();
  ctx.fill();

  // Mid mountain layer
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.moveTo(-350, 200);
  ctx.lineTo(-200, 100);
  ctx.quadraticCurveTo(-150, 70, -100, 85);
  ctx.lineTo(-50, 50);
  ctx.quadraticCurveTo(0, 25, 50, 50);
  ctx.lineTo(100, 85);
  ctx.quadraticCurveTo(150, 70, 200, 100);
  ctx.lineTo(350, 200);
  ctx.closePath();
  ctx.fill();

  // Main mountain (where character stands)
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(-250, 200);
  ctx.quadraticCurveTo(-180, 120, -100, 60);
  ctx.quadraticCurveTo(-50, 30, -20, 18);
  ctx.lineTo(0, 12); // Peak
  ctx.lineTo(20, 18);
  ctx.quadraticCurveTo(50, 30, 100, 60);
  ctx.quadraticCurveTo(180, 120, 250, 200);
  ctx.closePath();
  ctx.fill();

  // Snow/highlight on peak
  ctx.fillStyle = 'rgba(80, 80, 80, 0.4)';
  ctx.beginPath();
  ctx.moveTo(-30, 20);
  ctx.quadraticCurveTo(-15, 10, 0, 12);
  ctx.quadraticCurveTo(15, 10, 30, 20);
  ctx.quadraticCurveTo(15, 25, 0, 22);
  ctx.quadraticCurveTo(-15, 25, -30, 20);
  ctx.fill();

  // Rocky texture lines
  ctx.strokeStyle = 'rgba(50, 50, 50, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-60, 40);
  ctx.quadraticCurveTo(-100, 90, -150, 150);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(60, 40);
  ctx.quadraticCurveTo(100, 90, 150, 150);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-30, 30);
  ctx.quadraticCurveTo(-60, 80, -80, 130);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(30, 30);
  ctx.quadraticCurveTo(60, 80, 80, 130);
  ctx.stroke();

  ctx.fillStyle = inkColor;
  ctx.strokeStyle = inkColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // === 2. LEGS (Wide Power Stance) ===
  ctx.lineWidth = 12;

  // Left Leg
  ctx.beginPath();
  ctx.moveTo(0, -40); // Hip
  ctx.lineTo(-35, 20); // Foot wide left
  ctx.stroke();

  // Right Leg
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(35, 20); // Foot wide right
  ctx.stroke();

  // === 3. HAKAMA / FLOWING CLOTH ===
  ctx.fillStyle = inkColor;

  // Left cloth panel (blowing left)
  ctx.beginPath();
  ctx.moveTo(-5, -40); // Waist
  ctx.quadraticCurveTo(-50 + wind, -10, -55 + wind * 1.5, 15);
  ctx.lineTo(-30, 20);
  ctx.lineTo(-5, -30);
  ctx.fill();

  // Right cloth panel (blowing right)
  ctx.beginPath();
  ctx.moveTo(5, -40);
  ctx.quadraticCurveTo(50 + wind, -10, 55 + wind * 1.5, 15);
  ctx.lineTo(30, 20);
  ctx.lineTo(5, -30);
  ctx.fill();

  // Center drape
  ctx.beginPath();
  ctx.moveTo(-15, -35);
  ctx.lineTo(-10, 18);
  ctx.lineTo(10, 18);
  ctx.lineTo(15, -35);
  ctx.fill();

  // === 4. TORSO (Back View - Broad Shoulders) ===
  ctx.beginPath();
  ctx.moveTo(0, -40); // Waist center
  ctx.lineTo(-25, -100); // Left shoulder
  ctx.quadraticCurveTo(0, -110, 25, -100); // Neck curve
  ctx.lineTo(0, -40);
  ctx.fill();

  // === 5. HEAD (Top Knot / Ponytail) ===
  ctx.beginPath();
  ctx.arc(0, -115, 12, 0, Math.PI * 2);
  ctx.fill();

  // Top knot bun
  ctx.beginPath();
  ctx.ellipse(0, -130, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair strands blowing
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(5, -125);
  ctx.quadraticCurveTo(20 + windFast, -135, 35 + windFast * 2, -125 + Math.sin(time) * 3);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(3, -128);
  ctx.quadraticCurveTo(15 + windFast, -140, 28 + windFast * 1.5, -130);
  ctx.stroke();

  // === GLOWING EYES ===
  const eyeGlow = 0.7 + Math.sin(time * 2) * 0.3; // Pulsing glow

  // Eye glow aura
  ctx.shadowColor = '#ff6600';
  ctx.shadowBlur = 15 * eyeGlow;

  // Left Eye
  ctx.fillStyle = `rgba(255, 150, 50, ${eyeGlow})`;
  ctx.beginPath();
  ctx.ellipse(-6, -118, 4, 2, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Right Eye
  ctx.beginPath();
  ctx.ellipse(6, -118, 4, 2, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Eye core (brighter center)
  ctx.fillStyle = `rgba(255, 220, 150, ${eyeGlow})`;
  ctx.beginPath();
  ctx.ellipse(-6, -118, 2, 1, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6, -118, 2, 1, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Reset shadow
  ctx.shadowBlur = 0;

  // === 6. ARMS ===
  ctx.lineWidth = 10;

  // Left Arm (holding sword, relaxed down)
  ctx.beginPath();
  ctx.moveTo(-25, -100); // Shoulder
  ctx.lineTo(-30, -70); // Elbow
  ctx.lineTo(-25, -45); // Hand at hip level
  ctx.stroke();

  // Right Arm (relaxed at side)
  ctx.beginPath();
  ctx.moveTo(25, -100);
  ctx.lineTo(30, -70);
  ctx.lineTo(28, -50);
  ctx.stroke();

  // === 7. SWORD (Long Katana pointing down) ===
  // Blade
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-25, -45); // Hand position
  ctx.lineTo(-60, 25); // Tip at ground, angled left
  ctx.stroke();

  // Hilt (above hand)
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-25, -45);
  ctx.lineTo(-22, -60); // Short hilt going up
  ctx.stroke();

  // === 8. SCABBARD ON BACK ===
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(20, -95); // Right shoulder
  ctx.lineTo(-10, -50); // Left hip
  ctx.stroke();

  ctx.restore();
}

// --- NEW: SPEED LINES FX ---
function drawSpeedLines(ctx, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen'; // Make them pop

  const lineCount = 40; // More lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // Distinctly visible white
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  for (let i = 0; i < lineCount; i++) {
    // Randomize positions based on index and time
    // We want them to appear continuously and rush UPWARDS (simulating falling down)
    // Randomize positions based on index and time
    // We want them to appear continuously and rush UPWARDS (simulating falling down)
    const xSpread = 300; // Wider area
    const x = Math.sin(i * 32.1 + time * 0.5) * xSpread;

    // Y Animation:
    // (time * speed) % height -> loops
    // We want them moving UP: Decreasing Y or Loop logic

    const speed = 800; // Very fast
    const loopH = 1000;
    // Calculate raw Y position moving UP
    let y = loopH - ((time * speed + i * 137) % loopH);
    y -= loopH / 2; // Center loosely around 0

    // Randomized length
    const h = 50 + Math.sin(i) * 30;

    // Opacity flicker
    const alpha = (Math.sin(time * 10 + i) + 1) / 2 * 0.4 + 0.1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - h); // Draw line UP from the point
    ctx.stroke();
  }
  ctx.restore();
}

// --- AUDIO TOGGLE ---
const audioBtn = document.getElementById('audio-toggle');
const bgm = document.getElementById('bgm-loop');
let isAudioPlaying = false;

// Initialize Icons (Global Lucide)
if (window.lucide) {
  lucide.createIcons();
}

if (audioBtn) {
  audioBtn.addEventListener('click', () => {
    isAudioPlaying = !isAudioPlaying;

    if (isAudioPlaying) {
      bgm.play().catch(e => console.log("Audio prevent", e));
      audioBtn.innerHTML = `<i data-lucide="volume-2"></i>`;
    } else {
      bgm.pause();
      audioBtn.innerHTML = `<i data-lucide="volume-x"></i>`;
    }

    // Re-render new icon
    if (window.lucide) {
      lucide.createIcons();
    }
  });
}

update();

function initPortraitParticles() {
  if (!heroImg) return;

  // Create a temporary canvas to read pixel data
  const tmpC = document.createElement('canvas');
  const tmpCtx = tmpC.getContext('2d');

  // Use a moderate resolution for performance
  // Sample every 4th pixel
  const step = 4;
  const w = heroImg.naturalWidth || heroImg.width;
  const h = heroImg.naturalHeight || heroImg.height;

  // Limit max size to avoid huge loops
  const maxDim = 500;
  let scale = 1;
  if (w > maxDim || h > maxDim) {
    scale = maxDim / Math.max(w, h);
  }

  const drawW = w * scale;
  const drawH = h * scale;

  tmpC.width = drawW;
  tmpC.height = drawH;

  tmpCtx.drawImage(heroImg, 0, 0, drawW, drawH);

  try {
    const data = tmpCtx.getImageData(0, 0, drawW, drawH).data;

    for (let y = 0; y < drawH; y += step) {
      for (let x = 0; x < drawW; x += step) {
        const i = (y * drawW + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 50) { // If pixel is visible
          // Grayscale specific for the look
          const gray = r * 0.3 + g * 0.59 + b * 0.11;
          // Increase contrast
          const finalGray = gray < 128 ? gray * 0.8 : gray * 1.2;
          const color = `rgba(${finalGray},${finalGray},${finalGray},${a / 255})`;

          portraitParticles.push({
            nx: x / drawW, // Normalized X
            ny: y / drawH, // Normalized Y
            c: color,
            vx: 0,
            vy: 0,
            size: Math.random() * 3 + 2,
            rotation: Math.random() * 360,
            rSpeed: (Math.random() - 0.5) * 10,
            exploded: false
          });
        }
      }
    }
    console.log("Portrait Particles Init:", portraitParticles.length);
  } catch (e) {
    console.warn("Could not load portrait particles (likely CORS):", e);
  }
}
