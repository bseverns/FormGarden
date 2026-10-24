void drawPanel() {
  hint(DISABLE_DEPTH_TEST); noLights();
  camera(); perspective();
  fill(28,33,42); noStroke(); rect(0,0,PANEL,height);
  fill(128,210,197); textSize(12); text("ITERATIVE SCULPTURE / PROCESSING",20,28);
  fill(242); textSize(28); text("Form Garden",20,62);
  fill(168,182,194); textSize(12); text("01  Emit     02  Turn     03  Grow     04  Branch",20,87);
  for(int i=0;i<4;i++) {
    int col=i%2,row=i/2; float x=20+col*150,y=102+row*30;
    fill(i==presetIndex?color(59,98,98):color(40,47,58)); rect(x,y,142,25,5);
    fill(228); textSize(10); text((i+1)+"  "+PRESETS[i],x+8,y+17);
  }
  for(int i=0;i<params.length;i++) {
    Param q=params[i]; float y=TOP+i*ROW;
    fill(193,204,215); textSize(11); text(q.label,20,y);
    textAlign(RIGHT); fill(132,215,199); text(q.display(),PANEL-20,y); textAlign(LEFT);
    stroke(57,67,80); strokeWeight(3); line(22,y+9,PANEL-22,y+9);
    float x=map(q.value,q.lo,q.hi,22,PANEL-22);
    stroke(119,205,190); line(22,y+9,x,y+9); noStroke(); fill(208,242,232); ellipse(x,y+9,7,7);
  }
  fill(135,215,201); textSize(12);
  text("M  Motif: "+MOTIFS[motif]+"     N  New seed: "+seed,20,748);
  fill(187,199,210); textSize(11);
  text("E  OBJ      T  STL      S  Save recipe      L  Load",20,777);
  text("W  Edges    Space  Spin    F  Fit    P  Screenshot",20,799);
  text("Drag: orbit    Shift/right-drag: pan    Wheel: zoom",20,821);
  text("Arrows: fine-adjust last control (Shift = larger)",20,843);
  fill(118,132,148); text("Built from rules, saved as a repeatable recipe.",20,878);
  fill(165,185,196); textSize(12); text(status,PANEL+22,height-48,width-PANEL-40,45);
  hint(ENABLE_DEPTH_TEST);
}
int lastSlider=-1;
void mousePressed() {
  if(mouseX>=PANEL) return;
  if(mouseY>=102 && mouseY<162) {
    int col=mouseX>=170?1:0,row=mouseY>=132?1:0;
    if(mouseX>=20 && mouseX<312) applyPreset(row*2+col);
    return;
  }
  int i=round((mouseY-TOP-9)/(float)ROW);
  if(i>=0 && i<params.length && abs(mouseY-(TOP+i*ROW+9))<13) {
    activeSlider=lastSlider=i; updateSlider();
  }
}
void updateSlider() {
  Param q=params[activeSlider];
  q.value=constrain(map(mouseX,22,PANEL-22,q.lo,q.hi),q.lo,q.hi);
  if(q.integer) q.value=round(q.value);
  dirty=true; status="Release to rebuild · "+q.label+" = "+q.display();
}
void mouseDragged() {
  if(activeSlider>=0) { updateSlider(); return; }
  if(pmouseX<PANEL) return;
  if(mouseButton==RIGHT || (keyPressed && keyCode==SHIFT)) {
    panX+=mouseX-pmouseX; panY+=mouseY-pmouseY;
  } else { yaw+=(mouseX-pmouseX)*0.008f; pitch+=(mouseY-pmouseY)*0.008f; }
}
void mouseReleased() { activeSlider=-1; }
void mouseWheel(MouseEvent event) {
  if(mouseX>PANEL) zoom=constrain(zoom*(float)Math.exp(-event.getCount()*0.08f),0.08f,12);
}
void keyPressed() {
  if(key>='1' && key<='4') { applyPreset(key-'1'); return; }
  if(key==CODED && (keyCode==LEFT || keyCode==RIGHT) && lastSlider>=0) {
    Param q=params[lastSlider];
    float step=q.integer?1:(q.hi-q.lo)/1000;
    if(keyEvent.isShiftDown()) step*=10;
    q.value=constrain(q.value+(keyCode==RIGHT?step:-step),q.lo,q.hi); dirty=true; return;
  }
  char k=Character.toLowerCase(key);
  if(k=='m') { motif=(motif+1)%MOTIFS.length; dirty=true; }
  if(k=='n') { seed=(seed+1)&0x7fffffff; dirty=true; }
  if(k=='w') { wire=!wire; dirty=true; }
  if(k==' ') spinning=!spinning;
  if(k=='f') resetView();
  if(k=='s') saveRecipe(newExportBase()+".json");
  if(k=='l') selectInput("Choose a Form Garden JSON recipe", "recipeSelected");
  if(k=='e' || k=='t') exportMesh(k=='t');
  if(k=='p') { String path=newExportBase()+".png"; save(path); status="Saved "+path; }
}
