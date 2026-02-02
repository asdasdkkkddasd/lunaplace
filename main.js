(() => {
  // ======= UTIL =======
  const $ = (id) => document.getElementById(id);
  const fmt = (n, d=0) => Number(n).toLocaleString('ko-KR', {maximumFractionDigits:d, minimumFractionDigits:d});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ======= GAME STATE =======
  const TICK_MS = 250; // chart update interval
  const MAX_POINTS = 160;

  let round = 1;
  let roundSecTotal = 180; // 3 minutes
  let roundSecLeft = roundSecTotal;
  let timerId = null;
  let tickId = null;

  // Price simulation (random walk)
  let price = 68000; // pseudo "BTC price"
  let points = Array.from({length: MAX_POINTS}, () => price);

  // Account
  let balance = 1_000_000; // KRW virtual
  let equity = balance;     // includes uPnL
  let position = null;      // {side:"LONG"/"SHORT", entry, qty, lev, margin, tpPx, slPx, liqPx, feePaid}
  let lastLog = [];

  // Leaderboard
  const baseLB = [
    {name:"ALPHA", r: 18.4},
    {name:"BETA", r: 12.1},
    {name:"GAMMA", r: 9.7},
    {name:"DELTA", r: 6.9},
    {name:"EPS", r: 4.2},
    {name:"ZETA", r: 2.8},
    {name:"ETA", r: 1.3},
    {name:"THETA", r: -0.4},
    {name:"IOTA", r: -1.2},
    {name:"KAPPA", r: -2.6},
  ];
  const me = {name:"YOU", r: 0};

  // ======= UI =======
  const ctx = $("chart").getContext("2d");
  $("tickMs").textContent = TICK_MS;

  function setStatus(txt){ $("status").textContent = txt; }
  function setRoundInfo(){
    const mm = String(Math.floor(roundSecLeft / 60)).padStart(2,"0");
    const ss = String(roundSecLeft % 60).padStart(2,"0");
    $("roundInfo").textContent = `Round ${round} · ${mm}:${ss}`;
  }

  function log(msg){
    const ts = new Date().toLocaleTimeString("ko-KR", {hour12:false});
    lastLog.unshift(`[${ts}] ${msg}`);
    lastLog = lastLog.slice(0, 60);
    $("log").innerHTML = lastLog.map(x => `<div>${x}</div>`).join("");
  }

  function updateKPI(){
    $("priceNow").textContent = fmt(price, 2);
    $("balance").textContent = `${fmt(balance)} KRW`;

    const upnl = calcUPnL();
    $("upnl").innerHTML = upnl >= 0
      ? `<span class="greenTxt">+${fmt(upnl,0)} KRW</span>`
      : `<span class="redTxt">${fmt(upnl,0)} KRW</span>`;

    renderPosBox();
  }

  function renderPosBox(){
    const box = $("posBox");
    if(!position){
      box.innerHTML = `
        <span class="pill">포지션: FLAT</span>
        <span class="pill">진입가: -</span>
        <span class="pill">수량: -</span>
        <span class="pill">레버리지: -</span>
        <span class="pill">청산가(근사): -</span>
        <span class="pill">TP/SL: -</span>
      `;
      return;
    }
    const sidePill = position.side === "LONG"
      ? `<span class="pill green">포지션: LONG</span>`
      : `<span class="pill red">포지션: SHORT</span>`;
    box.innerHTML = `
      ${sidePill}
      <span class="pill">진입가: ${fmt(position.entry,2)}</span>
      <span class="pill">수량: ${fmt(position.qty,6)}</span>
      <span class="pill">레버리지: x${position.lev}</span>
      <span class="pill">청산가(근사): ${fmt(position.liqPx,2)}</span>
      <span class="pill">TP/SL: ${fmt(position.tpPx,2)} / ${fmt(position.slPx,2)}</span>
    `;
  }

  function renderLB(){
    // include ME based on overall return since round start
    const start = 1_000_000;
    const total = balance + calcUPnL();
    me.r = ((total - start) / start) * 100;

    const list = [...baseLB, {...me}].sort((a,b)=> b.r - a.r).slice(0,10);
    const tb = $("lb").querySelector("tbody");
    tb.innerHTML = list.map(x=>{
      const cls = x.r >= 0 ? "greenTxt" : "redTxt";
      const meMark = x.name === "YOU" ? " (나)" : "";
      return `
        <tr>
          <td>${x.name}${meMark}</td>
          <td class="right ${cls}">${x.r>=0?"+":""}${fmt(x.r,2)}%</td>
        </tr>
      `;
    }).join("");
  }

  // ======= PRICE SIM =======
  function stepPrice(){
    // random walk with slight drift + volatility
    const drift = (Math.random() - 0.5) * 6;     // small drift
    const vol = (Math.random() - 0.5) * 120;     // volatility
    price = Math.max(1000, price + drift + vol);

    points.push(price);
    if(points.length > MAX_POINTS) points.shift();

    // after price change, check TP/SL/liq
    if(position) {
      const hit = checkTriggers();
      if(hit) return; // position closed
    }
    drawChart();
    updateKPI();
  }

  // ======= CHART DRAW =======
  function drawChart(){
    const c = $("chart");
    const w = c.width, h = c.height;
    ctx.clearRect(0,0,w,h);

    // compute min/max
    let min = Infinity, max = -Infinity;
    for(const p of points){ if(p<min) min=p; if(p>max) max=p; }
    const pad = (max - min) * 0.12 || 50;
    min -= pad; max += pad;

    const xStep = w / (points.length - 1);

    // line
    ctx.beginPath();
    points.forEach((p,i)=>{
      const x = i * xStep;
      const y = h - ((p - min) / (max - min)) * h;
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(247,160,0,.9)";
    ctx.stroke();

    // current price marker
    const last = points[points.length-1];
    const yLast = h - ((last - min) / (max - min)) * h;
    ctx.beginPath();
    ctx.arc(w-2, yLast, 5, 0, Math.PI*2);
    ctx.fillStyle = "rgba(247,160,0,1)";
    ctx.fill();

    // TP/SL/Liq lines if position
    if(position){
      drawHLine(position.tpPx, min, max, "rgba(14,203,129,.8)");
      drawHLine(position.slPx, min, max, "rgba(246,70,93,.8)");
      drawHLine(position.liqPx, min, max, "rgba(255,255,255,.35)", [6,6]);
    }
  }

  function drawHLine(px, min, max, color, dash=null){
    const c = $("chart");
    const w = c.width, h = c.height;
    const y = h - ((px - min) / (max - min)) * h;
    ctx.save();
    ctx.beginPath();
    if(dash) ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.restore();
  }

  // ======= TRADING =======
  function calcUPnL(){
    if(!position) return 0;
    const dir = position.side === "LONG" ? 1 : -1;
    const pnl = (price - position.entry) * dir * position.qty;
    return pnl; // KRW-like units (sim)
  }

  function openPosition(side){
    if(position){
      log("이미 포지션이 있음. 먼저 종료하세요.");
      return;
    }
    const lev = Number($("lev").value);
    const riskPct = clamp(Number($("risk").value || 0), 1, 100);
    const feePct = Math.max(0, Number($("fee").value || 0)) / 100;
    const tpPct = Math.max(0, Number($("tp").value || 0)) / 100;
    const slPct = Math.max(0, Number($("sl").value || 0)) / 100;

    // margin = balance * riskPct
    const margin = balance * (riskPct / 100);
    if(margin < 1000){
      log("잔고가 너무 적음.");
      return;
    }

    // qty: we pretend contract value equals price; qty = (margin*lev)/price
    const notional = margin * lev;
    const qty = notional / price;

    // fee: charge on entry+exit (approx, we pre-charge half now)
    const feeEntry = notional * feePct * 0.5;
    if(balance - feeEntry <= 0){
      log("수수료를 낼 잔고가 부족함.");
      return;
    }
    balance -= feeEntry;

    const entry = price;

    // TP/SL prices
    let tpPx, slPx;
    if(side === "LONG"){
      tpPx = entry * (1 + tpPct);
      slPx = entry * (1 - slPct);
    }else{
      tpPx = entry * (1 - tpPct);
      slPx = entry * (1 + slPct);
    }

    // liquidation (very simplified): lose 90% of margin => liq
    // per unit move in price yields pnl = (price-entry)*dir*qty
    // liq when pnl <= -0.9*margin
    const dir = side === "LONG" ? 1 : -1;
    const liqPnl = -0.9 * margin;
    // liqPrice = entry + (liqPnl / (dir*qty))
    const liqPx = entry + (liqPnl / (dir * qty));

    position = {
      side, entry, qty, lev,
      margin,
      tpPx, slPx, liqPx,
      feePaid: feeEntry,
      feePct
    };

    setStatus(side === "LONG" ? "IN LONG" : "IN SHORT");
    log(`${side} 진입 · x${lev} · 비중 ${riskPct}% · 진입가 ${fmt(entry,2)} · (진입 수수료 -${fmt(feeEntry,0)} KRW)`);
    updateKPI();
    drawChart();
  }

  function closePosition(reason="수동 종료"){
    if(!position) { log("포지션이 없음."); return; }

    // realize pnl
    const upnl = calcUPnL();

    // exit fee half
    const notional = position.margin * position.lev;
    const feeExit = notional * position.feePct * 0.5;

    balance += upnl;
    balance -= feeExit;

    // if liquidation: force to lose remaining margin mostly (already reflected by upnl, but clamp)
    // safety clamp: balance can't go below 0
    balance = Math.max(0, balance);

    const side = position.side;
    const entry = position.entry;
    const px = price;

    const pnlTxt = upnl >= 0 ? `+${fmt(upnl,0)}` : `${fmt(upnl,0)}`;
    log(`${reason} · ${side} 종료 · ${fmt(entry,2)} → ${fmt(px,2)} · PnL ${pnlTxt} KRW · (종료 수수료 -${fmt(feeExit,0)} KRW)`);

    position = null;
    setStatus("READY");
    updateKPI();
    renderLB();
    drawChart();
  }

  function checkTriggers(){
    if(!position) return false;

    // liquidation first
    if(position.side === "LONG" && price <= position.liqPx){
      closePosition("💥 강제청산");
      return true;
    }
    if(position.side === "SHORT" && price >= position.liqPx){
      closePosition("💥 강제청산");
      return true;
    }

    // TP/SL
    if(position.side === "LONG"){
      if(price >= position.tpPx){ closePosition("✅ TP"); return true; }
      if(price <= position.slPx){ closePosition("🛑 SL"); return true; }
    }else{
      if(price <= position.tpPx){ closePosition("✅ TP"); return true; }
      if(price >= position.slPx){ closePosition("🛑 SL"); return true; }
    }
    return false;
  }

  // ======= ROUND TIMER =======
  function startRound(){
    stopRound();
    roundSecLeft = roundSecTotal;
    setRoundInfo();
    renderLB();
    updateKPI();
    drawChart();

    timerId = setInterval(()=>{
      roundSecLeft--;
      if(roundSecLeft <= 0){
        // auto close at round end
        if(position) closePosition("⏱ 라운드 종료 자동청산");
        round++;
        roundSecLeft = roundSecTotal;
        log(`--- Round ${round} 시작 ---`);
      }
      setRoundInfo();
    }, 1000);

    tickId = setInterval(stepPrice, TICK_MS);
  }

  function stopRound(){
    if(timerId) clearInterval(timerId);
    if(tickId) clearInterval(tickId);
    timerId = null; tickId = null;
  }

  function newRound(){
    if(position) closePosition("🔄 새 라운드 강제 종료");
    // reset price path a bit
    price = 68000 + (Math.random()-0.5)*800;
    points = Array.from({length: MAX_POINTS}, () => price);
    log(`=== 새 라운드(리셋) ===`);
    startRound();
  }

  // ======= EVENTS =======
  $("btnLong").addEventListener("click", () => openPosition("LONG"));
  $("btnShort").addEventListener("click", () => openPosition("SHORT"));
  $("btnClose").addEventListener("click", () => closePosition("수동 종료"));
  $("btnReset").addEventListener("click", () => newRound());

  // ======= INIT =======
  log("접속 완료. LONG/SHORT 눌러서 시작해봐.");
  updateKPI();
  renderLB();
  startRound();
})();