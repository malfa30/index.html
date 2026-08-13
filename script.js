const demoQuestions=[
  {q:"Hasil dari 48 ÷ 6 adalah …",o:["6","7","8","9"],a:2},
  {q:"Ibu membeli 5 buku. Setiap buku Rp4.000. Totalnya …",o:["Rp15.000","Rp20.000","Rp25.000","Rp30.000"],a:1},
  {q:"Planet terbesar di tata surya adalah …",o:["Mars","Bumi","Jupiter","Venus"],a:2},
  {q:"Jumlah hari dalam seminggu adalah …",o:["5 hari","6 hari","7 hari","8 hari"],a:2},
  {q:"10 × 4 = …",o:["30","40","50","60"],a:1},
  {q:"Alat untuk mengukur suhu adalah …",o:["Kompas","Termometer","Barometer","Mikroskop"],a:1},
  {q:"Benda yang dapat ditarik magnet adalah …",o:["Kayu","Kertas","Besi","Plastik"],a:2},
  {q:"Warna campuran biru dan kuning adalah …",o:["Hijau","Ungu","Oranye","Merah"],a:0}
];

let questions=[...demoQuestions];
let blueQuestion,redQuestion;
let blueScore=0,redScore=0,ropePosition=50,locked=false;

const $=s=>document.querySelector(s);

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function prepareQuestion(q){
  const options=shuffle(q.o.map((text,index)=>({text,index})));
  return {
    q:q.q,
    options:options.map(x=>x.text),
    answer:options.findIndex(x=>x.index===q.a)
  };
}

function startRound(){
  if(questions.length<2) return;
  const pool=shuffle(questions);
  blueQuestion=prepareQuestion(pool[0]);
  redQuestion=prepareQuestion(pool[1]);
  renderQuestion("blue",blueQuestion);
  renderQuestion("red",redQuestion);
}

function renderQuestion(team,q){
  const questionEl=team==="blue"?$("#blueQuestion"):$("#redQuestion");
  const answersEl=team==="blue"?$("#blueAnswers"):$("#redAnswers");
  questionEl.textContent=q.q;
  answersEl.innerHTML="";
  q.options.forEach((text,index)=>{
    const button=document.createElement("button");
    button.textContent=`${String.fromCharCode(65+index)}. ${text}`;
    button.addEventListener("click",()=>answer(team,index,button));
    answersEl.appendChild(button);
  });
}

function answer(team,index,button){
  if(locked)return;
  locked=true;

  const question=team==="blue"?blueQuestion:redQuestion;
  const correct=index===question.answer;
  const winner=correct?team:(team==="blue"?"red":"blue");

  document.querySelectorAll(".answers button").forEach(b=>b.disabled=true);
  button.classList.add(correct?"correct":"wrong");

  const arena=$(".arena");
  arena.classList.remove("pull-blue","pull-red");
  void arena.offsetWidth;
  arena.classList.add(winner==="blue"?"pull-blue":"pull-red");

  if(winner==="blue"){
    blueScore++;
    ropePosition=Math.max(8,ropePosition-8);
  }else{
    redScore++;
    ropePosition=Math.min(92,ropePosition+8);
  }

  $("#blueScore").textContent=blueScore;
  $("#redScore").textContent=redScore;
  $(".center-marker").style.left=`${ropePosition}%`;

  showMessage(
    correct
      ? (winner==="blue"?"🔵 TIM BIRU MENARIK!":"🔴 TIM MERAH MENARIK!")
      : "❌ Jawaban salah — lawan menarik!"
  );

  setTimeout(()=>{
    hideMessage();
    if(ropePosition<=8||ropePosition>=92){
      showMessage(ropePosition<=8?"🏆 TIM BIRU MENANG!":"🏆 TIM MERAH MENANG!");
      setTimeout(resetGame,1400);
    }else{
      locked=false;
      startRound();
    }
  },850);
}

function showMessage(text){
  $("#message").textContent=text;
  $("#message").classList.add("show");
}
function hideMessage(){$("#message").classList.remove("show")}

function resetGame(){
  blueScore=0;redScore=0;ropePosition=50;locked=false;
  $("#blueScore").textContent="0";
  $("#redScore").textContent="0";
  $(".center-marker").style.left="50%";
  $(".arena").classList.remove("pull-blue","pull-red");
  startRound();
}

function normalize(value){
  return String(value??"").trim().toLowerCase();
}

function parseAnswer(value){
  const v=normalize(value).toUpperCase();
  const letter="ABCD".indexOf(v);
  if(letter>=0)return letter;
  const number=parseInt(v,10);
  return Number.isInteger(number)?number-1:-1;
}

function loadGoogleSheet(){
  const url=$("#sheetUrl").value.trim();
  const match=url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if(!match){
    alert("Masukkan link Google Sheet yang benar.");
    return;
  }

  const id=match[1];
  const callback="sheetCallback_"+Date.now();

  window[callback]=data=>{
    try{
      const rows=(data.table?.rows||[]).map(row=>
        (row.c||[]).map(cell=>cell?cell.v:"")
      );
      if(!rows.length)throw new Error();

      const headers=rows.shift().map(normalize);
      const findHeader=names=>headers.findIndex(h=>names.some(n=>h.includes(n)));

      const qCol=findHeader(["pertanyaan","soal","question"]);
      const aCol=findHeader(["opsi a","option a"]);
      const bCol=findHeader(["opsi b","option b"]);
      const cCol=findHeader(["opsi c","option c"]);
      const dCol=findHeader(["opsi d","option d"]);
      const keyCol=findHeader(["jawaban","kunci","answer"]);

      if([qCol,aCol,bCol,cCol,dCol,keyCol].some(x=>x<0))throw new Error();

      const loaded=rows
        .filter(row=>row[qCol])
        .map(row=>({
          q:row[qCol],
          o:[row[aCol],row[bCol],row[cCol],row[dCol]],
          a:parseAnswer(row[keyCol])
        }))
        .filter(q=>q.o.every(Boolean)&&q.a>=0&&q.a<4);

      if(loaded.length<2)throw new Error();

      questions=loaded;
      resetGame();
      alert(`Berhasil memuat ${loaded.length} soal.`);
    }catch{
      alert("Format Sheet harus: Pertanyaan | Opsi A | Opsi B | Opsi C | Opsi D | Jawaban");
    }finally{
      delete window[callback];
      script.remove();
    }
  };

  const script=document.createElement("script");
  script.src=`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=responseHandler:${callback}`;
  script.onerror=()=>alert("Google Sheet tidak bisa diakses. Pastikan aksesnya dapat dilihat.");
  document.body.appendChild(script);
}

$("#loadSheet").addEventListener("click",loadGoogleSheet);
$("#reset").addEventListener("click",resetGame);
startRound();
