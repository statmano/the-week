// Basic PWA weekly goals app
(function(){
  const MAX_GOALS = 5
  const MIN_GOALS = 3
  const LS_KEY = 'tw:weeks'

  function weekStartISO(d=new Date()){
    const date = new Date(d)
    const day = date.getDay() // 0 = Sunday
    date.setDate(date.getDate() - day)
    date.setHours(0,0,0,0)
    return date.toISOString().slice(0,10)
  }

  function loadWeeks(){
    try{return JSON.parse(localStorage.getItem(LS_KEY))||{}}
    catch(e){return {}}
  }
  function saveWeeks(w){ localStorage.setItem(LS_KEY,JSON.stringify(w)) }

  let weeks = loadWeeks()
  const thisWeek = weekStartISO()

  // UI refs
  const prompt = document.getElementById('prompt')
  const goalsContainer = document.getElementById('goalsContainer')
  const addGoalBtn = document.getElementById('addGoalBtn')
  const saveGoalsBtn = document.getElementById('saveGoalsBtn')
  const progressList = document.getElementById('progressList')
  const historyChart = document.getElementById('historyChart')
  const notifyTest = document.getElementById('notifyTest')

  function ensureWeekExists(key){
    if(!weeks[key]){
      weeks[key] = {goals: []}
      saveWeeks(weeks)
    }
  }

  function renderGoalsForm(){
    goalsContainer.innerHTML = ''
    const current = (weeks[thisWeek] && weeks[thisWeek].goals) || []
    const count = Math.max(current.length, MIN_GOALS)
    for(let i=0;i<count;i++){
      const g = current[i] || {title:'',type:'boolean',target:1,progress:0}
      const row = document.createElement('div')
      row.className = 'goal-row'
      row.innerHTML = `
        <input type="text" name="title" placeholder="Goal title" value="${escapeHtml(g.title)}" />
        <select name="type"><option value="boolean">Yes/No</option><option value="number">Number</option></select>
        <input type="number" name="target" min="1" value="${g.target}" style="width:72px;" />
        <button type="button" class="remove">Remove</button>
      `
      const sel = row.querySelector('select')
      sel.value = g.type
      row.querySelector('.remove').addEventListener('click',()=>{ row.remove() })
      goalsContainer.appendChild(row)
    }
  }

  function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

  addGoalBtn.addEventListener('click',()=>{
    const existing = goalsContainer.querySelectorAll('.goal-row').length
    if(existing>=MAX_GOALS) return alert('Max goals reached')
    const row = document.createElement('div')
    row.className='goal-row'
    row.innerHTML = `
      <input type="text" name="title" placeholder="Goal title" />
      <select name="type"><option value="boolean">Yes/No</option><option value="number">Number</option></select>
      <input type="number" name="target" min="1" value="1" style="width:72px;" />
      <button type="button" class="remove">Remove</button>
    `
    row.querySelector('.remove').addEventListener('click',()=>row.remove())
    goalsContainer.appendChild(row)
  })

  document.getElementById('goalsForm').addEventListener('submit',e=>{
    e.preventDefault()
    const rows = Array.from(goalsContainer.querySelectorAll('.goal-row'))
    const newGoals = rows.map(r=>({
      title: r.querySelector('[name=title]').value.trim(),
      type: r.querySelector('[name=type]').value,
      target: Number(r.querySelector('[name=target]').value)||1,
      progress: 0
    })).filter(g=>g.title)
    if(newGoals.length < MIN_GOALS) return alert('Please add at least 3 goals')
    weeks[thisWeek] = {goals:newGoals}
    saveWeeks(weeks)
    prompt.classList.add('hidden')
    renderProgress()
    renderHistory()
  })

  function renderProgress(){
    progressList.innerHTML = ''
    ensureWeekExists(thisWeek)
    const goals = weeks[thisWeek].goals || []
    goals.forEach((g,idx)=>{
      const div = document.createElement('div')
      div.className='goal-item'
      const percent = computePercent(g)
      div.innerHTML = `
        <div class="goal-meta">
          <strong>${escapeHtml(g.title)}</strong>
          <div style="color:var(--muted);font-size:13px">${g.type==='boolean'?'Yes/No':'Number target: '+g.target}</div>
        </div>
        <div class="goal-controls">
          ${g.type==='boolean'?`<label><input type="checkbox" data-idx="${idx}" ${g.progress? 'checked':''}/> Done</label>`:
            `<input type="number" min="0" value="${g.progress||0}" data-idx="${idx}" style="width:80px"/>`}
          <span class="medal" data-idx="m${idx}">${percent>=100? '🏅':''}</span>
        </div>
      `
      progressList.appendChild(div)
    })

    // attach handlers
    progressList.querySelectorAll('input[type=checkbox]').forEach(cb=>{
      cb.addEventListener('change',e=>{
        const i = Number(e.target.dataset.idx)
        weeks[thisWeek].goals[i].progress = e.target.checked? weeks[thisWeek].goals[i].target : 0
        saveWeeks(weeks)
        renderProgress()
        renderHistory()
      })
    })
    progressList.querySelectorAll('input[type=number]').forEach(inp=>{
      inp.addEventListener('change',e=>{
        const i = Number(e.target.dataset.idx)
        weeks[thisWeek].goals[i].progress = Number(e.target.value)||0
        saveWeeks(weeks)
        renderProgress()
        renderHistory()
      })
    })
  }

  function computePercent(g){
    if(!g) return 0
    if(g.type==='boolean') return (g.progress?100:0)
    const p = Math.round((g.progress/g.target)*100)
    return Math.min(100, isFinite(p)?p:0)
  }

  function averageWeekPercent(key){
    const w = weeks[key]
    if(!w || !w.goals || w.goals.length===0) return 0
    const sum = w.goals.reduce((s,g)=>s+computePercent(g),0)
    return Math.round(sum / w.goals.length)
  }

  // History chart
  let chartInstance = null
  function renderHistory(){
    const keys = Object.keys(weeks).sort()
    const labels = keys.slice(-8)
    const data = labels.map(k=>averageWeekPercent(k))
    if(chartInstance) chartInstance.destroy()
    chartInstance = new Chart(historyChart.getContext('2d'),{
      type:'line',
      data:{labels, datasets:[{label:'% complete',data,backgroundColor:'rgba(39,174,96,0.2)',borderColor:'#27ae60',tension:0.3}]},
      options:{scales:{y:{beginAtZero:true,max:100}}}
    })
  }

  // Notification helpers
  async function ensureNotifications(){
    if(!('Notification' in window)) return false
    if(Notification.permission === 'granted') return true
    if(Notification.permission !== 'denied'){
      const perm = await Notification.requestPermission()
      return perm === 'granted'
    }
    return false
  }

  function showPromptIfSunday(){
    const now = new Date()
    if(now.getDay()===0){
      // It's Sunday
      // If we haven't created goals for this week, show prompt and notify
      if(!weeks[thisWeek] || !weeks[thisWeek].goals || weeks[thisWeek].goals.length===0){
        prompt.classList.remove('hidden')
      }
      // show notification if allowed
      ensureNotifications().then(ok=>{
        if(ok && navigator.serviceWorker && navigator.serviceWorker.controller){
          navigator.serviceWorker.getRegistration().then(reg=>{
            reg && reg.showNotification('The Week — set your weekly goals', {body:'Tap to add 3–5 small achievable goals for the week.'})
          })
        } else if(ok){
          new Notification('The Week — set your weekly goals')
        }
      })
    } else {
      // not Sunday: show current week's data if exists
      if(weeks[thisWeek] && weeks[thisWeek].goals && weeks[thisWeek].goals.length>0){
        renderProgress()
      } else {
        // still show form to allow creating goals anytime
        // leave hidden to avoid forcing prompt
      }
    }
  }

  notifyTest.addEventListener('click',async ()=>{
    const ok = await ensureNotifications()
    if(!ok) return alert('Notifications not allowed')
    if(navigator.serviceWorker && navigator.serviceWorker.getRegistration){
      const reg = await navigator.serviceWorker.getRegistration()
      if(reg) reg.showNotification('Test notification from The Week', {body:'This is a test.'})
    } else new Notification('Test notification from The Week')
  })

  // register service worker
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').catch(()=>{})
  }

  // Startup
  ensureWeekExists(thisWeek)
  renderGoalsForm()
  renderProgress()
  renderHistory()
  showPromptIfSunday()

  // utility: save on unload
  window.addEventListener('beforeunload',()=>saveWeeks(weeks))

})();
