import type p5 from 'p5';

// ── nica theme sprite ──
// Spiky star character: 20 pts, inner radius 75%, fill #F5FFA6
export default function nicaSketch(p: p5) {
	const OUTER_R = 72;
	const INNER_R = OUTER_R * 0.75; // 75%
	const POINTS  = 20;
	const INK     = [11, 57, 60] as const;   // #0b393c

	p.setup = () => {
		const size = Math.round(window.innerHeight * 0.5);
		p.createCanvas(size, size);
		p.angleMode(p.RADIANS);
	};

	p.windowResized = () => {
		const size = Math.round(window.innerHeight * 0.5);
		p.resizeCanvas(size, size);
	};

	p.draw = () => {
		p.clear();

		const bob = Math.sin(p.frameCount * 0.025) * 5;
		p.push();
		p.scale(p.width / 160);
		p.translate(80, 80 + bob);

		// ── star body ──
		p.noStroke();
		p.fill('#F5FFA6');
		drawStar(0);

		// ── face (sits slightly below centre) ──
		drawFace();

		p.pop();
	};

	function drawStar(rot: number) {
		const step = p.TWO_PI / POINTS;
		p.beginShape();
		for (let i = 0; i < POINTS; i++) {
			const outerA = i * step - p.HALF_PI + rot;
			const innerA = outerA + step / 2;
			p.vertex(Math.cos(outerA) * OUTER_R, Math.sin(outerA) * OUTER_R);
			p.vertex(Math.cos(innerA) * INNER_R, Math.sin(innerA) * INNER_R);
		}
		p.endShape(p.CLOSE);
	}

	function drawFace() {
		// Blink: eyes close ~every 4 s
		const blinking = Math.sin(p.frameCount * 0.022) > 0.93;

		const fy = 6; // face offset below star centre

		p.stroke(...INK);
		p.strokeWeight(2.8);
		p.strokeCap(p.ROUND);
		p.noFill();

		// left eye  — ">" pointing right
		const lx = -14, ly = fy;
		if (blinking) {
			p.line(lx - 6, ly, lx + 5, ly);
		} else {
			p.line(lx - 6, ly - 4.5, lx + 5, ly);
			p.line(lx + 5, ly,        lx - 6, ly + 4.5);
		}

		// right eye — ">" pointing right
		const rx = 10, ry = fy;
		if (blinking) {
			p.line(rx - 6, ry, rx + 5, ry);
		} else {
			p.line(rx - 6, ry - 4.5, rx + 5, ry);
			p.line(rx + 5, ry,        rx - 6, ry + 4.5);
		}

		// tiny dot pupils at the tip of each ">"
		if (!blinking) {
			p.noStroke();
			p.fill(...INK);
			p.ellipse(lx + 5, ly, 3.5, 3.5);
			p.ellipse(rx + 5, ry, 3.5, 3.5);
		}

		// nose dot
		p.noStroke();
		p.fill(...INK);
		p.ellipse(-1, fy + 11, 3.5, 3.5);
	}
}
