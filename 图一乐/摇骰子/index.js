// 注册自定义骰子元素
class DiceElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const type = this.getAttribute('type') || '1';
    this.shadowRoot.innerHTML = `
          <style>
            :host {
              display: inline-block;
              margin: 15px;
            }
            .dice {
              position: relative;
              width: 100px;
              height: 100px;
              background: #f8f8f8;
              border-radius: 15px;
              box-shadow: 
                0 0 10px rgba(0,0,0,0.1),
                3px 3px 10px rgba(0,0,0,0.2),
                -1px -1px 2px rgba(255,255,255,0.9) inset;
              transform: rotate(5deg);
            }
            .dot {
              position: absolute;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: ${type === '1' || type === '4' ? '#e74c3c' : '#3498db'};
              transform: translate(-50%, -50%);
              box-shadow: 1px 1px 3px rgba(0,0,0,0.2);
            }
            ${type === '1' ? '.dot { width: 25px; height: 25px; }' : ''}
          </style>
          <div class="dice">
            ${this.generateDots(type)}
          </div>
        `;
  }

  generateDots(type) {
    const positions = {
      0: [],
      1: [[50, 50]],
      2: [[30, 30], [70, 70]],
      3: [[30, 30], [50, 50], [70, 70]],
      4: [[30, 30], [30, 70], [70, 30], [70, 70]],
      5: [[30, 30], [30, 70], [50, 50], [70, 30], [70, 70]],
      6: [[30, 30], [30, 50], [30, 70], [70, 30], [70, 50], [70, 70]]
    };

    return positions[type].map(pos =>
      `<div class="dot" style="top:${pos[0]}%; left:${pos[1]}%"></div>`
    ).join('');
  }
}

customElements.define('dice-element', DiceElement);