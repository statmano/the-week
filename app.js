// Basic PWA weekly goals app
(function(){
  const MAX_GOALS = 5
  const MIN_GOALS = 3
  const LS_KEY = 'tw:weeks'
  const GOAL_CATEGORIES = ['Work', 'Home', 'Play']

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

  function ensureWeekExists(key){
    if(!weeks[key]){
      weeks[key] = {goals: []}
      saveWeeks(weeks)
    }
  }

  function getDefaultCategory(index = 0){
    return GOAL_CATEGORIES[index % GOAL_CATEGORIES.length]
  }

  function getMissingCategories(goals){
    const counts = { Work: 0, Home: 0, Play: 0 }
    goals.forEach(goal => {
      const category = GOAL_CATEGORIES.includes(goal.category) ? goal.category : 'Work'
      counts[category] += 1
    })
    return GOAL_CATEGORIES.filter(category => counts[category] === 0)
  }

  function renderGoalsForm(){
    goalsContainer.innerHTML = ''
    const current = (weeks[thisWeek] && weeks[thisWeek].goals) || []
    const count = Math.max(current.length, MIN_GOALS)
    for(let i=0;i<count;i++){
      const g = current[i] || {title:'',type:'boolean',target:1,progress:0,category:getDefaultCategory(i)}
      const row = document.createElement('div')
      row.className = 'goal-row'
      row.innerHTML = `
        <input type="text" name="title" placeholder="Goal title" value="${escapeHtml(g.title)}" />
        <select name="category" aria-label="Goal category">
          ${GOAL_CATEGORIES.map(category => `<option value="${category}" ${category === (g.category || 'Work') ? 'selected' : ''}>${category}</option>`).join('')}
        </select>
        <select name="type"><option value="boolean">Yes/No</option><option value="number">Number</option></select>
        <input type="number" name="target" min="1" value="${g.target}" style="width:72px;" />
        <button type="button" class="remove">Remove</button>
      `
      const typeSelect = row.querySelector('[name="type"]')
      const targetInput = row.querySelector('input[name="target"]')
      typeSelect.value = g.type
      if(typeSelect.value === 'boolean') targetInput.style.display = 'none'
      typeSelect.addEventListener('change', ()=>{
        targetInput.style.display = typeSelect.value === 'number' ? '' : 'none'
      })
      row.querySelector('.remove').addEventListener('click',()=>{ row.remove() })
      goalsContainer.appendChild(row)
    }
  }

  function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

  addGoalBtn.addEventListener('click',()=>{
    const existing = goalsContainer.querySelectorAll('.goal-row').length
    if(existing>=MAX_GOALS) return alert('Max goals reached')
    const usedCategories = Array.from(goalsContainer.querySelectorAll('[name="category"]')).map(el => el.value)
    const nextCategory = GOAL_CATEGORIES.find(category => !usedCategories.includes(category)) || 'Work'
    const row = document.createElement('div')
    row.className='goal-row'
    row.innerHTML = `
      <input type="text" name="title" placeholder="Goal title" />
      <select name="category" aria-label="Goal category">
        ${GOAL_CATEGORIES.map(category => `<option value="${category}" ${category === nextCategory ? 'selected' : ''}>${category}</option>`).join('')}
      </select>
      <select name="type"><option value="boolean">Yes/No</option><option value="number">Number</option></select>
      <input type="number" name="target" min="1" value="1" style="width:72px;" />
      <button type="button" class="remove">Remove</button>
    `
    row.querySelector('.remove').addEventListener('click',()=>row.remove())
    const typeSelect = row.querySelector('[name="type"]')
    const targetInput = row.querySelector('input[name="target"]')
    targetInput.style.display = 'none'
    typeSelect.addEventListener('change', ()=>{
      targetInput.style.display = typeSelect.value === 'number' ? '' : 'none'
    })
    goalsContainer.appendChild(row)
  })

  document.getElementById('goalsForm').addEventListener('submit',e=>{
    e.preventDefault()
    const rows = Array.from(goalsContainer.querySelectorAll('.goal-row'))
    const newGoals = rows.map(r=>({
      title: r.querySelector('[name=title]').value.trim(),
      category: r.querySelector('[name=category]').value,
      type: r.querySelector('[name=type]').value,
      target: Number(r.querySelector('[name=target]').value)||1,
      progress: 0
    })).filter(g=>g.title)
    if(newGoals.length < MIN_GOALS) return alert('Please add at least 3 goals')
    const missing = getMissingCategories(newGoals)
    if(missing.length) return alert(`Please add at least one goal in each category: ${GOAL_CATEGORIES.join(', ')}`)
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
      const category = GOAL_CATEGORIES.includes(g.category) ? g.category : 'Work'
      div.innerHTML = `
        <div class="goal-meta">
          <div class="goal-topline">
            <strong>${escapeHtml(g.title)}</strong>
            <span class="category-pill" data-category="${category}">${category}</span>
          </div>
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

  function showGoalPromptIfNeeded(){
    if(!weeks[thisWeek] || !weeks[thisWeek].goals || weeks[thisWeek].goals.length === 0){
      prompt.classList.remove('hidden')
      return
    }

    prompt.classList.add('hidden')
    renderProgress()
  }

  const splashScreen = document.getElementById('splashScreen')
  if(splashScreen){
    const dismissSplash = () => {
      if(splashScreen.classList.contains('is-hidden')) return
      splashScreen.classList.add('is-hidden')
    }

    splashScreen.addEventListener('click', dismissSplash)
    splashScreen.addEventListener('touchstart', dismissSplash, { passive: true })
    splashScreen.addEventListener('pointerdown', dismissSplash, { passive: true })
    setTimeout(dismissSplash, 15000)
  }

  // register service worker
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').catch(()=>{})
  }

  // Startup
  ensureWeekExists(thisWeek)
  renderGoalsForm()
  renderHistory()
  showGoalPromptIfNeeded()

  // utility: save on unload
  window.addEventListener('beforeunload',()=>saveWeeks(weeks))

})();
