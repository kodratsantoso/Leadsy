"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme-context";

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  vx: number;
  vy: number;
  color: string;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;
}

interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  active: boolean;
}

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking for cosmic raycast telemetry
    const mouse = {
      x: -1000,
      y: -1000,
      active: false,
      radius: 140,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
      initNebulae();
    };

    window.addEventListener("resize", handleResize, { passive: true });

    const isDark = resolved === "dark";

    // ── 1. Starfield Initialization ──
    const stars: Star[] = [];
    function initStars() {
      stars.length = 0;
      // Density: ~85 on desktop, ~45 on mobile
      const count = Math.min(Math.floor((width * height) / 12000), 100);
      const starColors = isDark
        ? ["255, 255, 255", "196, 181, 253", "165, 243, 252", "253, 224, 71"]
        : ["109, 40, 217", "79, 70, 229", "14, 165, 233", "99, 102, 241"];

      for (let i = 0; i < count; i++) {
        const color = starColors[Math.floor(Math.random() * starColors.length)];
        const size = Math.random() < 0.85 ? Math.random() * 1.4 + 0.6 : Math.random() * 2.2 + 1.2;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size,
          baseAlpha: Math.random() * 0.5 + 0.35,
          alpha: 0.5,
          twinkleSpeed: Math.random() * 0.003 + 0.001,
          twinkleOffset: Math.random() * Math.PI * 2,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          color,
        });
      }
    }

    // ── 2. Procedural Nebulae (Galactic Gas Clouds) ──
    const nebulae: Nebula[] = [];
    function initNebulae() {
      nebulae.length = 0;
      const nebulaColors = isDark
        ? [
            "rgba(147, 51, 234, ", // Cosmic violet
            "rgba(79, 70, 229, ",  // Deep galactic indigo
            "rgba(6, 182, 212, ",  // Interstellar cyan
            "rgba(217, 70, 239, ", // Stellar fuchsia
          ]
        : [
            "rgba(168, 85, 247, ",
            "rgba(99, 102, 241, ",
            "rgba(56, 189, 248, ",
            "rgba(232, 121, 249, ",
          ];

      const count = 5;
      for (let i = 0; i < count; i++) {
        nebulae.push({
          x: (width / (count + 1)) * (i + 1) + (Math.random() - 0.5) * 200,
          y: (height * 0.4) + (Math.random() - 0.5) * (height * 0.4),
          radius: Math.random() * 260 + 240,
          color: nebulaColors[i % nebulaColors.length],
          vx: (Math.random() - 0.5) * 0.06,
          vy: (Math.random() - 0.5) * 0.06,
        });
      }
    }

    // ── 3. Shooting Stars (Meteors) ──
    const meteors: Meteor[] = [];
    function spawnMeteor() {
      if (meteors.length >= 2) return;
      meteors.push({
        x: Math.random() * width * 1.2,
        y: Math.random() * (height * 0.4),
        length: Math.random() * 90 + 70,
        speed: Math.random() * 7 + 9,
        angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.2, // ~45 deg trajectory
        alpha: 1,
        active: true,
      });
    }

    // Interval to trigger shooting stars occasionally
    const meteorInterval = setInterval(() => {
      if (Math.random() < 0.75) {
        spawnMeteor();
      }
    }, 4500);

    initStars();
    initNebulae();

    // ── Animation Render Loop ──
    let lastTime = performance.now();

    function render(time: number) {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx!.clearRect(0, 0, width, height);

      // ── Render Nebulae (Screen composite blending) ──
      ctx!.save();
      ctx!.globalCompositeOperation = isDark ? "screen" : "multiply";
      for (let i = 0; i < nebulae.length; i++) {
        const neb = nebulae[i];
        neb.x += neb.vx;
        neb.y += neb.vy;

        // Wrap gently
        if (neb.x < -neb.radius) neb.x = width + neb.radius;
        if (neb.x > width + neb.radius) neb.x = -neb.radius;
        if (neb.y < -neb.radius) neb.y = height + neb.radius;
        if (neb.y > height + neb.radius) neb.y = -neb.radius;

        const grad = ctx!.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.radius);
        const opacityMid = isDark ? "0.07)" : "0.04)";
        const opacityCore = isDark ? "0.14)" : "0.08)";
        grad.addColorStop(0, neb.color + opacityCore);
        grad.addColorStop(0.5, neb.color + opacityMid);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();

      // ── Render & Update Starfield ──
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Drift
        s.x += s.vx * dt * 60;
        s.y += s.vy * dt * 60;

        // Screen wrap
        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;

        // Harmonic Twinkle
        s.alpha = s.baseAlpha + Math.sin(time * s.twinkleSpeed + s.twinkleOffset) * 0.28;
        const currentAlpha = Math.max(0.08, Math.min(1, s.alpha));

        // Draw Star
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${s.color}, ${currentAlpha})`;
        if (s.size > 1.8) {
          ctx!.shadowColor = `rgba(${s.color}, 0.8)`;
          ctx!.shadowBlur = 8;
        }
        ctx!.fill();
        ctx!.shadowBlur = 0;

        // ── Cosmic Raycast Sensor to Cursor ──
        if (mouse.active) {
          const dx = mouse.x - s.x;
          const dy = mouse.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius) {
            const rayAlpha = (1 - dist / mouse.radius) * 0.45;

            // Draw laser telemetry line to star
            ctx!.beginPath();
            ctx!.moveTo(mouse.x, mouse.y);
            ctx!.lineTo(s.x, s.y);
            ctx!.strokeStyle = `rgba(6, 182, 212, ${rayAlpha})`; // Cyan laser
            ctx!.lineWidth = 0.8;
            ctx!.stroke();

            // Draw targeting reticle ring around star
            ctx!.beginPath();
            ctx!.arc(s.x, s.y, s.size * 2.8, 0, Math.PI * 2);
            ctx!.strokeStyle = `rgba(168, 85, 247, ${rayAlpha * 1.2})`; // Violet reticle
            ctx!.lineWidth = 0.75;
            ctx!.stroke();
          }
        }
      }

      // ── Render Cursor Navigational Beacon ──
      if (mouse.active) {
        ctx!.beginPath();
        ctx!.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(6, 182, 212, 0.9)";
        ctx!.shadowColor = "rgba(6, 182, 212, 1)";
        ctx!.shadowBlur = 10;
        ctx!.fill();
        ctx!.shadowBlur = 0;
      }

      // ── Render Shooting Stars (Meteors) ──
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        const cos = Math.cos(m.angle);
        const sin = Math.sin(m.angle);

        m.x -= cos * m.speed;
        m.y += sin * m.speed;
        m.alpha -= 0.016;

        if (m.alpha <= 0 || m.x < -100 || m.y > height + 100) {
          meteors.splice(i, 1);
          continue;
        }

        const tailX = m.x + cos * m.length;
        const tailY = m.y - sin * m.length;

        const grad = ctx!.createLinearGradient(m.x, m.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${m.alpha})`);
        grad.addColorStop(0.3, `rgba(168, 85, 247, ${m.alpha * 0.8})`);
        grad.addColorStop(0.7, `rgba(6, 182, 212, ${m.alpha * 0.4})`);
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx!.beginPath();
        ctx!.moveTo(m.x, m.y);
        ctx!.lineTo(tailX, tailY);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.6;
        ctx!.lineCap = "round";
        ctx!.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(meteorInterval);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, [resolved]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* 1. Deep Cosmos Background Base with Radial Space Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_-20%,rgba(120,40,200,0.18),rgba(15,8,38,0)_70%)]" />

      {/* 2. Subtle Planetary Horizon Arc at Top (Cosmic Curvature) */}
      <div className="absolute -top-[520px] left-1/2 -translate-x-1/2 w-[1600px] h-[750px] rounded-[100%] border-b border-primary/25 bg-gradient-to-b from-primary/10 via-transparent to-transparent shadow-[0_20px_90px_rgba(139,92,246,0.18)] pointer-events-none" />

      {/* 3. Deep Space Canvas: Stars, Nebulae, Meteors, Telemetry Raycast */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block opacity-90 transition-opacity duration-500"
      />

      {/* 4. Scanning Horizon Ray (Soft Deep Space Orbital Scanner) */}
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent shadow-[0_0_18px_2px_rgba(6,182,212,0.3)] animate-cyber-beam pointer-events-none" />

      {/* 5. Deep Space Vignette Edge Softener */}
      <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_95%_95%_at_50%_50%,transparent_50%,black_100%)] bg-background/30 pointer-events-none" />
    </div>
  );
}
