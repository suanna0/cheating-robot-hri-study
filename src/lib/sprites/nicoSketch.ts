import type p5 from 'p5';

// ── nico theme sprite (purple/techy) ──
// Dummy template: a geometric robot character
export default function nicoSketch(p: p5) {
	let t = 0;

	p.setup = () => {
		const size = Math.round(window.innerHeight * 0.5);
		p.createCanvas(size, size);
		p.noStroke();
	};

	p.windowResized = () => {
		const size = Math.round(window.innerHeight * 0.5);
		p.resizeCanvas(size, size);
	};

	p.draw = () => {
		p.clear();
		t = p.frameCount * 0.04;

		const bob = Math.sin(p.frameCount * 0.025) * 4;
		const cx = 80;
		const cy = 80 + bob;
		p.scale(p.width / 160);

		// Shadow
		p.fill(80, 20, 180, 40);
		p.ellipse(cx, 142, 50, 10);

		// Body (rectangle with rounded corners)
		p.fill(100, 40, 220);
		p.rect(cx - 26, cy - 4, 52, 44, 10);

		// Chest light — pulses
		const glow = p.map(Math.sin(t * 1.5), -1, 1, 80, 255);
		p.fill(200, 140, 255, glow);
		p.ellipse(cx, cy + 18, 14, 14);

		// Head (square-ish)
		p.fill(130, 60, 255);
		p.rect(cx - 24, cy - 46, 48, 40, 8);

		// Visor / eye bar
		p.fill(30, 10, 60);
		p.rect(cx - 18, cy - 34, 36, 12, 4);

		// Eye lights
		const blink = Math.sin(t * 0.4) > 0.9 ? 1 : 5;
		p.fill(217, 102, 255);
		p.ellipse(cx - 8, cy - 28, 8, blink);
		p.fill(200, 240, 255);
		p.ellipse(cx + 8, cy - 28, 8, blink);

		// Antenna
		p.fill(180, 100, 255);
		p.rect(cx - 2, cy - 64, 4, 18, 2);
		p.fill(255, 180, 255);
		p.ellipse(cx, cy - 66, 9, 9);

		// Arms
		p.fill(100, 40, 220);
		p.rect(cx - 42, cy - 2, 16, 28, 6);
		p.rect(cx + 26, cy - 2, 16, 28, 6);
	};
}
