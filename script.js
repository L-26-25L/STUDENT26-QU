const STORAGE_KEY = 'lina_grades_v1';

const DEFAULT = {
  aPlusThreshold: 90,
  courses: [
    { id:'economy', name:'Economy', items:[{type:'Quiz', name:'Quiz 1', max:5, val:4.25},{type:'Quiz', name:'Quiz 2', max:5, val:4.5},{type:'Quiz', name:'Quiz 3', max:5, val:5},{type:'Quiz', name:'Quiz 4', max:5, val:0},{type:'Quiz', name:'Quiz 5', max:5, val:0},{type:'Midterm', name:'Midterm 1', max:15, val:14.5},{type:'Midterm', name:'Midterm 2', max:15, val:14.5},{type:'Final', name:'Final', max:50, val:0}]},
    { id:'math', name:'Math', items:[{type:'Quiz', name:'Quiz 1', max:10, val:10},{type:'Quiz', name:'Quiz 2', max:10, val:10},{type:'Quiz', name:'Quiz 3', max:10, val:0},{type:'Midterm', name:'Midterm', max:25, val:24},{type:'Activity', name:'Activities', max:5, val:5},{type:'Final', name:'Final', max:50, val:0}]},
    { id:'technology', name:'Technology', items:[{type:'Quiz', name:'Quiz 1', max:5, val:5},{type:'Quiz', name:'Quiz 2', max:5, val:3.25},{type:'Quiz', name:'Quiz 3', max:5, val:0},{type:'Midterm', name:'Midterm 1', max:20, val:20},{type:'Midterm', name:'Midterm 2', max:20, val:0},{type:'Final', name:'Final', max:50, val:0}]},
    { id:'arba', name:'Arba', items:[{type:'Midterm', name:'Midterm', max:20, val:19},{type:'Activity', name:'Activities', max:20, val:20},{type:'Final', name:'Final', max:60, val:0}]},
    { id:'islamic', name:'Islamic', items:[{type:'Midterm', name:'Midterm', max:20, val:18},{type:'Activity', name:'Activities', max:20, val:20},{type:'Final', name:'Final', max:60, val:0}]},
    { id:'admin', name:'Administration', items:[{type:'Midterm', name:'Midterm 1', max:20, val:18.5},{type:'Midterm', name:'Midterm 2', max:20, val:0},{type:'Report', name:'Report', max:10, val:0},{type:'Final', name:'Final', max:50, val:0}]}
  ]
};

let state = loadState();

// DOM
const coursesList = document.getElementById('coursesList');
const dashboard = document.getElementById('dashboard');
const courseSection = document.getElementById('courseSection');
const courseTitle = document.getElementById('courseTitle');
const courseTableBody = document.querySelector('#courseTable tbody');
const backToDash = document.getElementById('backToDash');
const calcCourse = document.getElementById('calcCourse');
const saveCourse = document.getElementById('saveCourse');
const termWorkValue = document.getElementById('termWorkValue');
const aplusPercent = document.getElementById('aplusPercent');
const aplusGap = document.getElementById('aplusGap');

let bestChart, compareChart;
let activeCourseId = null;

renderSidebar();
renderDashboard();
attachActions();

function loadState(){
  try{
    const json = localStorage.getItem(STORAGE_KEY);
    if(json) return JSON.parse(json);
  }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT));
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function renderSidebar(){
  coursesList.innerHTML = '';
  state.courses.forEach(c=>{
    const btn = document.createElement('button');
    btn.className = 'course-btn';
    btn.innerHTML = <span style="font-weight:600">${c.name}</span>;
    btn.onclick = ()=> onCourseClick(c.id);
    coursesList.appendChild(btn);
  });
}

function renderDashboard(){
  const labels = state.courses.map(c=>c.name);
  const bestData = state.courses.map(c=>{
    const quizzes = c.items.filter(it=>it.type==='Quiz').map(q=>parseFloat(q.val||0));
    if(quizzes.length<=1) return quizzes.reduce((s,x)=>s+x,0);
    const sorted = quizzes.slice().sort((a,b)=>b-a);
    return sorted.slice(0, quizzes.length-1).reduce((s,x)=>s+x,0);
  });
  const compareData = state.courses.map(c=> computeMeasuresForCourse(c).percent );

  termWorkValue.innerText = computeAverageTermPercent().toFixed(1) + '%';
  const aplusInfo = computeAPlus();
  aplusPercent.innerText = (100 - aplusInfo.minGap).toFixed(1) + '%';
  aplusGap.innerText = ${aplusInfo.minGap.toFixed(1)}% نقص عن ${state.aPlusThreshold}%;

  const apCard = document.getElementById('aplusCard');
  const apVal = 100 - aplusInfo.minGap;
  if(apVal >= state.aPlusThreshold) apCard.style.background = 'linear-gradient(90deg,#caa32b,#e6d28a)';
  else if(apVal >= state.aPlusThreshold - 6) apCard.style.background = 'linear-gradient(90deg,#ffd86b,#ffc107)';
  else apCard.style.background = 'linear-gradient(90deg,#7fcf7f,#3fb76e)';

  if(!bestChart){
    const ctx = document.getElementById('bestQuizzesChart').getContext('2d');
    bestChart = new Chart(ctx, {type:'pie', data:{labels:labels,datasets:[{data:bestData,backgroundColor:generateColors(labels.length)}]}, options:{responsive:true, plugins:{legend:{position:'bottom'}}}});
  } else { bestChart.data.labels = labels; bestChart.data.datasets[0].data = bestData; bestChart.update(); }

  if(!compareChart){
    const ctx2 = document.getElementById('compareChart').getContext('2d');
    compareChart = new Chart(ctx2,{type:'bar',data:{labels:labels,datasets:[{data:compareData,backgroundColor:generateColors(labels.length)}]},options:{indexAxis:'y', responsive:true, scales:{x:{beginAtZero:true, max:100}}}});
  } else { compareChart.data.labels = labels; compareChart.data.datasets[0].data = compareData; compareChart.update(); }

  saveState();
}

function onCourseClick(courseId){
  activeCourseId = courseId;
  const course = state.courses.find(c=>c.id===courseId);
  if(!course) return;
  courseTitle.innerText = course.name;
  courseTableBody.innerHTML = '';
  course.items.forEach(it=>{
    const tr = document.createElement('tr');
    tr.innerHTML = <td>${it.type}</td><td>${it.name}</td><td>${it.max}</td><td contenteditable="true">${it.val!==undefined?it.val:''}</td>;
    tr.querySelector('td[contenteditable]').oninput = ()=> { it.val = parseFloat(tr.querySelector('td[contenteditable]').innerText)||0; renderDashboard(); updateCourseSummary(); };
    courseTableBody.appendChild(tr);
  });
  dashboard.classList.add('hidden'); courseSection.classList.remove('hidden');
  updateCourseSummary();
}

backToDash.onclick = ()=>{ activeCourseId=null; courseSection.classList.add('hidden'); dashboard.classList.remove('hidden'); renderDashboard(); };
calcCourse.onclick = ()=>updateCourseSummary(true);
saveCourse.onclick = ()=>{ saveState(); alert('تم حفظ البيانات محلياً'); };

function updateCourseSummary(showAlert){
  if(!activeCourseId) return;
  const course = state.courses.find(c=>c.id===activeCourseId);
  const res = computeMeasuresForCourse(course);
  document.getElementById('courseTermWork').innerText = res.termWorkValue.toFixed(2)+' نقطة';
  document.getElementById('coursePercent').innerText = res.percent.toFixed(1)+'%';
  document.getElementById('courseAPlusNote').innerText = نقص ${Math.max(0,state.aPlusThreshold-res.percent).toFixed(1)}% للوصول إلى ${state.aPlusThreshold}% (A+);
  if(showAlert) alert(النسبة للمقرر ${course.name} = ${res.percent.toFixed(1)}%);
  renderDashboard();
}

function computeMeasuresForCourse(course){
  const quizzes = course.items.filter(i=>i.type==='Quiz').map(q=>parseFloat(q.val||0));
  let sumTopQuizzes = quizzes.length<=1?quizzes.reduce((s,x)=>s+x,0):quizzes.slice().sort((a,b)=>b-a).slice(0,quizzes.length-1).reduce((s,x)=>s+x,0);
  const mids = course.items.filter(i=>['Midterm','Report','Activity'].includes(i.type)).map(i=>parseFloat(i.val||0)).reduce((s,x)=>s+x,0);
  const sumFinal = course.items.filter(i=>i.type==='Final').map(i=>parseFloat(i.val||0)).reduce((s,x)=>s+x,0);
  const quizzesCountedMax = quizzes.length<=1?course.items.filter(i=>i.type==='Quiz').map(q=>q.max).reduce((s,x)=>s+x,0):course.items.filter(i=>i.type==='Quiz').map(q=>q.max).sort((a,b)=>b-a).slice(0,quizzes.length-1).reduce((s,x)=>s+x,0);
  const midMax = course.items.filter(i=>i.type==='Midterm').map(i=>i.max).reduce((s,x)=>s+x,0);
  const repMax = course.items.filter(i=>i.type==='Report').map(i=>i.max).reduce((s,x)=>s+x,0);
  const actMax = course.items.filter(i=>i.type==='Activity').map(i=>i.max).reduce((s,x)=>s+x,0);
  const finalMax = course.items.filter(i=>i.type==='Final').map(i=>i.max).reduce((s,x)=>s+x,0);
  const termWorkValue = sumTopQuizzes + mids;
  const totalMax = quizzesCountedMax + midMax + repMax + actMax + finalMax;
  const totalObtained = termWorkValue + sumFinal;
  const percent = totalMax>0? (totalObtained/totalMax)*100 : 0;
  return {termWorkValue, percent};
}

function computeAverageTermPercent(){
  const arr = state.courses.map(c=>computeMeasuresForCourse(c).termWorkValue / (c.items.filter(i=>['Quiz','Midterm','Report','Activity'].includes(i.type)).map(i=>i.max).reduce((s,x)=>s+x,0))*100);
  return arr.length? arr.reduce((s,x)=>s+x,0)/arr.length:0;
}

function computeAPlus(){
  let minGap=Infinity;
  state.courses.forEach(c=>{ const p=computeMeasuresForCourse(c).percent; const gap=Math.max(0,state.aPlusThreshold-p); if(gap<minGap) minGap=gap; });
  return {minGap};
}

function generateColors(n){
  const palette = ['#4a7ec6','#6a4f6f','#caa32b','#7f3fb7','#3fb76e','#ffb86b','#4fb0b0','#8b5cf6'];
  return Array.from({length:n},(_,i)=>palette[i%palette.length]);
}

function attachActions(){
  document.getElementById('btnMyGrade').onclick = ()=>{ activeCourseId=null; courseSection.classList.add('hidden'); dashboard.classList.remove('hidden'); };
  document.getElementById('exportBtn').onclick = ()=>{
    const data = JSON.stringify(state,null,2);
    const blob = new Blob([data], {type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='grades_backup.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  document.getElementById('importBtn').onclick = ()=>{ document.getElementById('importFile').click(); };
  document.getElementById('importFile').onchange = e=>{
    const file = e.target.files[0]; if(!file) return;
    const fr = new FileReader();
    fr.onload=()=>{ try{ state=JSON.parse(fr.result); saveState(); renderSidebar(); renderDashboard(); alert('تم استيراد البيانات'); }catch(err){ alert('خطأ في الملف'); } };
    fr.readAsText(file);
  };
  document.getElementById('clearBtn').onclick = ()=>{
    if(confirm('تأكيد مسح البيانات المحلية؟')){ localStorage.removeItem(STORAGE_KEY); state=JSON.parse(JSON.stringify(DEFAULT)); renderSidebar(); renderDashboard(); alert('تم مسح البيانات المحلية'); }
  };
}

renderDashboard();
