"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme-context";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
}

export function FutureBackground() {
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

    // Track mouse for interactive constellation attraction
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 140,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener("resize", handleResize, { passive: true });

    // Generate balanced, elegant particles
    const particles: Particle[] = [];
    const maxParticles = Math.min(Math.floor(width / 32), 48);

    function initParticles() {
      particles.length = 0;
      const count = Math.min(Math.floor(width / 32), 48);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 1.5 + 1.2,
          baseAlpha: Math.random() * 0.4 + 0.3,
        });
      }
    }

    initParticles();

    const isDark = resolved === "dark";
    const dotColor = isDark ? "168, 85, 247" : "124, 58, 237"; // violet rgb
    const lineColor = isDark ? "139, 92, 246" : "99, 102, 241"; // indigo/violet rgb

    let lastTime = performance.now();

    function render(currentTime: number) {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      ctx!.clearRect(0, 0, width, height);

      // Connect particles to mouse
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        // Bounce gently at screen edges
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse interaction: subtle attraction
        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < mouse.radius) {
          const force = (1 - distMouse / mouse.radius) * 0.08;
          p.x += dxMouse * force;
          p.y += dyMouse * force;

          // Draw delicate beam to cursor
          const mouseAlpha = (1 - distMouse / mouse.radius) * 0.35;
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(mouse.x, mouse.y);
          ctx!.strokeStyle = `rgba(${lineColor}, ${mouseAlpha})`;
          ctx!.lineWidth = 0.8;
          ctx!.stroke();
        }

        // Draw particle dot with subtle glow
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${dotColor}, ${p.baseAlpha})`;
        ctx!.shadowColor = `rgba(${dotColor}, 0.6)`;
        ctx!.shadowBlur = 6;
        ctx!.fill();
        ctx!.shadowBlur = 0; // reset shadow for performance

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 125;

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.18;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(p2.x, p2.y);
            ctx!.strokeStyle = `rgba(${lineColor}, ${alpha})`;
            ctx!.lineWidth = 0.7;
            ctx!.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
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
      {/* 1. Cybernetic Perspective Grid Layer */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(147,51,234,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(147,51,234,0.04)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_25%,#000_50%,transparent_100%)] opacity-80 dark:opacity-100" />

      {/* 2. Scanning Laser Cyber-Beam (Sweeps down every 14s) */}
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_16px_2px_rgba(168,85,247,0.4)] animate-cyber-beam pointer-events-none" />

      {/* 3. Floating Aurora Plasma Orbs (GPU Accelerated) */}
      {/* Primary Violet Orb */}
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[650px] h-[400px] md:w-[950px] md:h-[550px] bg-gradient-to-tr from-primary/25 via-indigo-600/20 to-violet-500/20 rounded-full blur-[140px] animate-aurora-1" />

      {/* Counter-drifting Indigo Orb */}
      <div className="absolute top-[28%] left-[10%] w-[380px] h-[380px] md:w-[500px] md:h-[500px] bg-indigo-500/15 rounded-full blur-[120px] animate-aurora-2" />

      {/* Cyan / Tech Teal Orb for Future Apps Vibe */}
      <div className="absolute top-[35%] right-[12%] w-[400px] h-[400px] md:w-[520px] md:h-[520px] bg-cyan-500/12 rounded-full blur-[130px] animate-aurora-3" />

      {/* Deep Rose / Magenta Accent Orb */}
      <div className="absolute top-[65%] left-1/3 w-[500px] h-[350px] bg-fuchsia-600/10 rounded-full blur-[140px] animate-aurora-1" />

      {/* 4. Interactive Constellation Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block opacity-75 dark:opacity-90 transition-opacity duration-500"
      />
    </div>
  );
}
