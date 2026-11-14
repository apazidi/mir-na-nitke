// Original imagegen masters; each section owns pixels from the SAME master.
// No independently regenerated frames, recoloring, or replacement character art.
const ellipse=(x,y,rx,ry)=>`M ${x-rx} ${y} A ${rx} ${ry} 0 1 0 ${x+rx} ${y} A ${rx} ${ry} 0 1 0 ${x-rx} ${y} Z`;
const rect=(x,y,w,h)=>`M${x} ${y}h${w}v${h}h-${w}Z`;
const part=(id,label,d,anchor)=>({id,label,mask:d?{type:'path',d}:{type:'remainder'},anchor});
function plan(id,sections,sequence,priority=sequence){return {id,sequence,ownershipPriority:priority,sections};}
function wedge(x,y,a,b){const p=t=>[x+2000*Math.cos(t*Math.PI/180),y+2000*Math.sin(t*Math.PI/180)];return `M${x} ${y} L${p(a).join(' ')} L${p(b).join(' ')} Z`;}
const motifSections=[part('center','Золотая серединка',ellipse(770,520,145,145),[770,520]),
 ...['Верхний лепесток','Правый лепесток','Правый нижний лепесток','Левый нижний лепесток','Левый лепесток'].map((label,i)=>part('petal-'+i,label,i===4?null:wedge(770,520,-126+i*72,-54+i*72),[[770,190],[1120,400],[980,800],[530,800],[400,400]][i]))];
const scarfSections=[
 part('left-hem','Край левого конца',rect(0,955,724,131),[380,995]),
 part('left-tail','Левый конец с ромашкой',rect(0,515,724,440),[430,750]),
 part('right-hem','Край правого конца',rect(724,955,724,131),[1100,995]),
 part('right-tail','Правый конец с ромашкой',rect(724,515,724,440),[1000,758]),
 part('collar-left','Левая сторона воротника',rect(0,0,724,515),[380,290]),
 part('collar-right','Правая сторона воротника',null,[1080,290])];
const doilySections=[
 part('center','Серединка ромашки',ellipse(780,490,140,100),[780,490]),
 part('top-petal','Верхний лепесток',ellipse(770,300,135,147),[770,300]),
 part('left-petal','Левый лепесток',ellipse(530,420,180,100),[530,420]),
 part('right-petal','Правый лепесток',ellipse(1035,415,175,103),[1035,415]),
 part('left-lower','Левый нижний лепесток',ellipse(605,650,148,125),[605,650]),
 part('right-lower','Правый нижний лепесток',ellipse(950,650,148,125),[950,650]),
 part('rim','Шалфейная кайма',null,[780,860])];
export const PATTERN_ART={
 'flower-pattern':{finishedSprite:'art-experiments/pattern-v1/exports/motif.png',sectionPlan:plan('flower-pattern',motifSections,motifSections.map(s=>s.id)),stageWeights:[1,1,1,1,1,1],pose:{x:.51,foot:.65,maxWidth:200,maxHeight:170}},
 'rabbit-scarf':{finishedSprite:'art-experiments/pattern-v1/exports/scarf.png',sectionPlan:plan('rabbit-scarf',scarfSections,scarfSections.map(s=>s.id)),stageWeights:[.5,1.5,.5,1.5,1,1],pose:{x:.52,foot:.65,maxWidth:210,maxHeight:180},application:{target:'rabbit',rect:[325,960,430,300]}},
 'cat-doily':{finishedSprite:'art-experiments/pattern-v1/exports/doily.png',sectionPlan:plan('cat-doily',doilySections,doilySections.map(s=>s.id)),stageWeights:[1,1,1,1,1,1,1],pose:{x:.52,foot:.65,maxWidth:225,maxHeight:170},application:{target:'kot-cat',pose:{x:.73,foot:.72,maxWidth:100,maxHeight:70}}}
};
