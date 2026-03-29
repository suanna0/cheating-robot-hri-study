import type p5 from 'p5';

// ── nica theme sprite ──
// Spiky star character: 20 pts, oscillating inner radius, fill #F5FFA6
export default function nicaSketch(p: p5) {
	const OUTER_R = 72;
	const POINTS  = 20;
	const INK     = [11, 57, 60] as const; // #0b393c

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

		const wave   = Math.sin(p.frameCount * 0.025);
		const bob    = wave * 5;
		const innerR = OUTER_R * p.map(wave, -1, 1, 0.80, 0.70);

		p.push();
		p.scale(p.width / 160);
		p.translate(80, 80 + bob);

		// ── star body ──
		p.noStroke();
		p.fill('#F5FFA6');
		drawStar(innerR);

		// ── face — flip if mouse is right of sprite centre ──
		const lookRight = p.mouseX > p.width / 2;
		p.push();
		if (lookRight) p.scale(-1, 1);
		p.translate(-15, 6); // bottom-left (mirrors to bottom-right when flipped)
		drawFace();
		p.pop();

		p.pop();
	};

	function drawStar(innerR: number) {
		const step = p.TWO_PI / POINTS;
		p.beginShape();
		for (let i = 0; i < POINTS; i++) {
			const outerA = i * step - p.HALF_PI;
			const innerA = outerA + step / 2;
			p.vertex(Math.cos(outerA) * OUTER_R, Math.sin(outerA) * OUTER_R);
			p.vertex(Math.cos(innerA) * innerR,  Math.sin(innerA) * innerR);
		}
		p.endShape(p.CLOSE);
	}

	function drawFace() {
		const blinking = Math.sin(p.frameCount * 0.022) > 0.93;
		const fy = 4;
		const S  = 0.24;                         // design → canvas scale
		const FL = 0.45;                         // finger length multiplier
		const SW = 4 * S;                        // stroke weight: 4px

		// derived finger path lengths (bounding box diagonal = path length)
		const L_lo_up = Math.hypot(19.15, 7.37) * S * FL;
		const L_lo_lo = 19.15 * S * FL;
		const L_ri_up = Math.hypot(17.71, 0.77) * S * FL;
		const L_ri_lo = 19.92 * S * FL;

		// finger angles from spec bounding boxes
		const A_lo_up = Math.atan2(7.37, 19.15);      // ≈ 21° above horizontal
		const A_ri_up = Math.atan2(0.77, 17.71);      // ≈ 2.5° above horizontal

		p.noStroke();
		p.fill(...INK);

		// blob dimensions & left edges (scale-derived)
		const blobHW = 11 * S; // half-width  (22*S / 2)
		const blobHH = 16 * S; // half-height (32*S / 2)
		const lCX = -10, lCY = fy + 3; // left blob centre
		const rCX =   7, rCY = fy + 6; // right blob centre

		if (blinking) {
			p.stroke(...INK); p.strokeWeight(SW); p.strokeCap(p.ROUND); p.noFill();
			const blinkR  = blobHW * 0.6;
			const blinkDY = blinkR * Math.tan(A_lo_up);
			p.line(lCX - blinkR, lCY - blinkDY, lCX + blinkR, lCY + blinkDY);
			p.line(rCX - blinkR, rCY - blinkDY, rCX + blinkR, rCY + blinkDY);
		} else {
			// Draw fingers FIRST, blob ON TOP — so fingers appear to grow from the body

			// ── left fingers ──
			p.stroke(...INK); p.strokeWeight(SW); p.strokeCap(p.ROUND); p.noFill();
			// start from blob centre, extend left by (finger length + half-blob-width)
			const lReach = blobHW;
			p.line(lCX, lCY - blobHH * 0.65 - 1,
				   lCX - (L_lo_up + lReach - 1) * Math.cos(A_lo_up),
				   lCY - blobHH * 0.65 - 1 - (L_lo_up + lReach - 1) * Math.sin(A_lo_up));
			p.line(lCX, lCY - blobHH * 0.1 - 1,
				   lCX - (L_lo_lo + lReach),
				   lCY - blobHH * 0.1 - 1);

			// ── left blob (on top) ──
			p.noStroke(); p.fill(...INK);
			p.ellipse(lCX, lCY, 22 * S, 32 * S);

			// ── right fingers ──
			p.stroke(...INK); p.strokeWeight(SW); p.strokeCap(p.ROUND); p.noFill();
			const rReach = blobHW;
			p.line(rCX, rCY - blobHH * 0.6 - 1,
				   rCX - (L_ri_up + rReach) * Math.cos(A_ri_up),
				   rCY - blobHH * 0.6 - 1 - (L_ri_up + rReach) * Math.sin(A_ri_up));
			p.line(rCX, rCY - blobHH * 0.05 - 1,
				   rCX - (L_ri_lo + rReach),
				   rCY - blobHH * 0.05 - 1);

			// ── right blob (on top) ──
			p.noStroke(); p.fill(...INK);
			p.ellipse(rCX, rCY, 22 * S, 32 * S);
		}

		// ── nose: 6×10 ellipse, rotated 18° ──
		p.push();
		p.translate(-4, fy + 10);
		p.rotate(p.radians(-18));
		p.noStroke(); p.fill(...INK);
		p.ellipse(0, 0, 6 * S, 10 * S);
		p.pop();
	}
}
