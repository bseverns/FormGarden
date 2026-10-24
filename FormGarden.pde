/* Form Garden | Ben Severns | Processing 4 / Java mode
   No contributed libraries. See README.md for controls and mesh limitations.
   Geometry is Z-up. Every export has a JSON recipe with identical settings.
*/
import processing.event.MouseEvent;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Random;
import java.io.File;
import java.io.PrintWriter;
import java.util.Locale;

// Parameter defaults live here; sliders edit these same values.
final int STEPS=0, STEMS=1, SIDES=2, RADIUS=3, ADVANCE=4, TWIST=5,
  BEND=6, PRECESS=7, TAPER=8, WIDTH=9, DEPTH=10, LENGTH=11,
  FORK=12, LEVELS=13, SPREAD=14, CHILD=15, JITTER=16, BUDGET=17, MM=18;
Param[] params = {
  new Param("steps", "Steps per stem", 110, 8, 220, true),
  new Param("stems", "Starting stems", 5, 1, 12, true),
  new Param("sides", "Elements around ring", 9, 3, 18, true),
  new Param("radius", "Ring radius", 13, 0, 40, false),
  new Param("advance", "Advance per step", 2.6f, 0.3f, 8, false),
  new Param("twist", "Ring twist / step (deg)", 8, -35, 35, false),
  new Param("bend", "Bend / step (deg)", 0.8f, -6, 6, false),
  new Param("precession", "Bend axis turn (deg)", 0.25f, -8, 8, false),
  new Param("taper", "Scale / step", 0.988f, 0.97f, 1.01f, false),
  new Param("width", "Element width", 3.4f, 0.5f, 14, false),
  new Param("depth", "Element depth", 2.2f, 0.5f, 14, false),
  new Param("length", "Element length", 5, 0.5f, 18, false),
  new Param("forkEvery", "Fork every N steps", 38, 12, 100, true),
  new Param("levels", "Branch generations", 2, 0, 3, true),
  new Param("spread", "Branch spread (deg)", 32, 0, 85, false),
  new Param("childScale", "Child scale", 0.66f, 0.3f, 0.95f, false),
  new Param("jitter", "Angular variation (deg)", 0.35f, 0, 4, false),
  new Param("budget", "Maximum solid elements", 18000, 1000, 40000, true),
  new Param("exportMM", "Export longest side (mm)", 180, 30, 400, false)
};
final String[] PRESETS = {"CURLING GROVE", "OPEN SWIRL", "ARC CLUSTER", "TRIANGLE TOWER"};
final String[] MOTIFS = {"BLOCKS", "WEDGES", "FRAME"};
int presetIndex=0, motif=0, seed=4721, activeSlider=-1;
final int PANEL=330, TOP=176, ROW=29;
Mesh mesh;
PShape sculpture;
boolean dirty=true, wire=false, spinning=false, rebuildInProgress=false;
float yaw=0.45f, pitch=0.28f, zoom=1, panX=0, panY=0;
String status="Ready. Drag a control; release to rebuild.";

void settings() { size(1280, 900, P3D); smooth(4); }
void setup() {
  surface.setTitle("Form Garden — iterative sculpture");
  textFont(createFont("SansSerif", 13));
  applyPreset(0);
}
void draw() {
  if (dirty && activeSlider<0 && !rebuildInProgress) rebuild();
  background(20,24,31);
  if (spinning) yaw+=0.004f;
  if (sculpture!=null) {
    perspective(PI/3.0f, (float)width/height, 1, 10000);
    ambientLight(95,103,115);
    directionalLight(210,225,230,-0.4f,0.5f,-1);
    directionalLight(90,125,150,0.8f,-0.3f,0.3f);
    pushMatrix();
    translate(PANEL+(width-PANEL)/2.0f+panX,height*0.48f+panY,0);
    rotateX(pitch); rotateY(yaw); rotateX(-HALF_PI);
    float fit=min(width-PANEL-130,height-230)/mesh.span*zoom;
    scale(fit); translate(-mesh.center.x,-mesh.center.y,-mesh.center.z);
    shape(sculpture);
    popMatrix();
  }
  drawPanel();
}
float p(int i) { return params[i].value; }
int ip(int i) { return round(p(i)); }
void rebuild() {
  rebuildInProgress=true;
  try {
    mesh=generateMesh();
    sculpture=createShape(); sculpture.beginShape(TRIANGLES);
    sculpture.fill(185,213,215);
    if (wire) { sculpture.stroke(34,60,70); sculpture.strokeWeight(0.45f); }
    else sculpture.noStroke();
    for (int[] f:mesh.faces) {
      PVector a=mesh.vertices.get(f[0]),b=mesh.vertices.get(f[1]),c=mesh.vertices.get(f[2]);
      PVector n=PVector.sub(b,a).cross(PVector.sub(c,a)).normalize();
      sculpture.normal(n.x,n.y,n.z);
      sculpture.vertex(a.x,a.y,a.z); sculpture.vertex(b.x,b.y,b.z); sculpture.vertex(c.x,c.y,c.z);
    }
    sculpture.endShape();
    status=mesh.solids+" elements / "+mesh.faces.size()+" triangles"+(mesh.clipped?" — element cap reached":"");
    dirty=false;
  } catch(Exception ex) { status="Build failed: "+ex.getMessage(); dirty=false; ex.printStackTrace(); }
  finally { rebuildInProgress=false; }
}
void applyPreset(int which) {
  presetIndex=which;
  for (Param q:params) q.value=q.initial;
  motif=0;
  if (which==1) {
    setP(STEMS,3); setP(STEPS,155); setP(RADIUS,10); setP(ADVANCE,3.5f);
    setP(TWIST,13); setP(BEND,2.2f); setP(PRECESS,0.4f); setP(TAPER,1.003f);
    setP(LEVELS,1); setP(FORK,55); setP(SPREAD,58); setP(JITTER,0.1f);
  } else if (which==2) {
    setP(STEMS,7); setP(STEPS,100); setP(SIDES,5); setP(RADIUS,5);
    setP(ADVANCE,2.7f); setP(TWIST,3); setP(BEND,2.5f); setP(PRECESS,0);
    setP(TAPER,0.997f); setP(WIDTH,6); setP(DEPTH,3); setP(LENGTH,6);
    setP(LEVELS,0); setP(JITTER,0);
  } else if (which==3) {
    motif=2; setP(STEMS,1); setP(STEPS,24); setP(SIDES,3); setP(RADIUS,22);
    setP(ADVANCE,8); setP(TWIST,4.8f); setP(BEND,0.18f); setP(PRECESS,0.2f);
    setP(TAPER,0.994f); setP(WIDTH,2.4f); setP(DEPTH,2.4f); setP(LEVELS,0); setP(JITTER,0);
  }
  resetView(); dirty=true;
}
void setP(int i,float v) { params[i].value=v; }
void resetView() { yaw=0.45f; pitch=0.28f; zoom=1; panX=panY=0; }

class Param {
  String key,label; float value,initial,lo,hi; boolean integer;
  Param(String k,String l,float v,float a,float b,boolean whole) {
    key=k; label=l; value=initial=v; lo=a; hi=b; integer=whole;
  }
  String display() {
    if (integer) return str(round(value));
    return String.format(Locale.US,key.equals("taper")?"%.4f":"%.2f",value);
  }
}
