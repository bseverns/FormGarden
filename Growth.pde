// A small turtle grammar: emit a ring, advance, rotate, scale, optionally fork.
// Breadth-first stepping shares the element budget across the growing branches.
class Stem {
  PMatrix3D frame; float size; int step,depth,limit;
  Stem(PMatrix3D m,float s,int d,int n) { frame=m; size=s; depth=d; limit=n; }
}
Mesh generateMesh() {
  Mesh out=new Mesh(ip(BUDGET));
  Random rng=new Random(seed);
  ArrayDeque<Stem> queue=new ArrayDeque<Stem>();
  for(int i=0;i<ip(STEMS);i++) {
    PMatrix3D m=new PMatrix3D();
    m.rotateZ(TWO_PI*i/ip(STEMS));
    // Root stems meet at the origin, then splay gently outward.
    if (ip(STEMS)>1) m.rotateY(radians(p(SPREAD)*0.42f));
    queue.add(new Stem(m,1,0,ip(STEPS)));
  }
  while(!queue.isEmpty() && out.solids<out.cap) {
    Stem s=queue.removeFirst();
    if(s.step>=s.limit || s.size<0.025f) continue;
    int n=ip(SIDES);
    float r=p(RADIUS)*s.size;
    float jx=((float)rng.nextDouble()*2-1)*p(JITTER);
    float jy=((float)rng.nextDouble()*2-1)*p(JITTER);
    PMatrix3D next=s.frame.get(); advance(next,s.size,jx,jy);
    PMatrix3D ring=s.frame.get(); ring.rotateZ(radians(p(TWIST)*s.step));
    PMatrix3D nextRing=next.get(); nextRing.rotateZ(radians(p(TWIST)*(s.step+1)));
    for(int j=0;j<n && out.solids<out.cap;j++) {
      float a=TWO_PI*j/n;
      if(motif==2) {
        PVector v=new PVector(r*cos(a),r*sin(a),0);
        float b=TWO_PI*(j+1)/n;
        out.beam(ring,v,new PVector(r*cos(b),r*sin(b),0),p(WIDTH)*s.size,p(DEPTH)*s.size);
        PVector from=ring.mult(v,null),to=nextRing.mult(PVector.mult(v,p(TAPER)),null);
        out.worldBeam(from,to,p(WIDTH)*s.size,p(DEPTH)*s.size);
        PVector diagonal=nextRing.mult(new PVector(r*p(TAPER)*cos(b),r*p(TAPER)*sin(b),0),null);
        out.worldBeam(from,diagonal,p(WIDTH)*s.size,p(DEPTH)*s.size);
      } else {
        PMatrix3D m=ring.get(); m.translate(r*cos(a),r*sin(a),0); m.rotateZ(a);
        out.primitive(m,p(WIDTH)*s.size,p(DEPTH)*s.size,p(LENGTH)*s.size,motif==1);
      }
    }
    if(out.solids>=out.cap) { out.clipped=true; break; }
    s.frame=next;
    s.size*=p(TAPER); s.step++;
    // One offshoot at each interval, alternating handedness by branch and step.
    if(s.depth<ip(LEVELS) && s.step%ip(FORK)==0 && s.step<s.limit-8) {
      PMatrix3D child=s.frame.get();
      child.rotateZ(radians(137.50776f*s.step));
      child.rotateY(radians(p(SPREAD)));
      int remaining=max(12,round((s.limit-s.step)*0.82f));
      queue.addLast(new Stem(child,s.size*p(CHILD),s.depth+1,remaining));
    }
    queue.addLast(s);
  }
  out.finish(); return out;
}
void advance(PMatrix3D frame,float scale,float jx,float jy) {
  frame.translate(0,0,p(ADVANCE)*scale);
  frame.rotateZ(radians(p(PRECESS)));
  frame.rotateX(radians(p(BEND)+jx));
  frame.rotateY(radians(jy));
}

class Mesh {
  ArrayList<PVector> vertices=new ArrayList<PVector>();
  ArrayList<int[]> faces=new ArrayList<int[]>();
  int cap,solids=0; boolean clipped=false;
  PVector low,high,center; float span;
  Mesh(int budget) { cap=budget; }
  void face(int base,int a,int b,int c) { faces.add(new int[]{base+a,base+b,base+c}); }
  void primitive(PMatrix3D m,float w,float d,float h,boolean wedge) {
    if(solids>=cap) { clipped=true; return; }
    int base=vertices.size();
    if(!wedge) {
      float[][] pts={{-1,-1,-1},{1,-1,-1},{1,1,-1},{-1,1,-1},
                     {-1,-1,1},{1,-1,1},{1,1,1},{-1,1,1}};
      for(float[] v:pts) vertices.add(m.mult(new PVector(v[0]*w/2,v[1]*d/2,v[2]*h/2),null));
      int[][] fs={{0,2,1},{0,3,2},{4,5,6},{4,6,7},{0,1,5},{0,5,4},
                  {1,2,6},{1,6,5},{2,3,7},{2,7,6},{3,0,4},{3,4,7}};
      for(int[] f:fs) face(base,f[0],f[1],f[2]);
    } else {
      float[][] pts={{-1,-1,-1},{1,-1,-1},{0,-1,1},{-1,1,-1},{1,1,-1},{0,1,1}};
      for(float[] v:pts) vertices.add(m.mult(new PVector(v[0]*w/2,v[1]*d/2,v[2]*h/2),null));
      int[][] fs={{0,1,2},{3,5,4},{0,3,4},{0,4,1},{1,4,5},{1,5,2},{2,5,3},{2,3,0}};
      for(int[] f:fs) face(base,f[0],f[1],f[2]);
    }
    solids++;
  }
  void beam(PMatrix3D m,PVector a,PVector b,float w,float d) { worldBeam(m.mult(a,null),m.mult(b,null),w,d); }
  void worldBeam(PVector a,PVector b,float w,float d) {
    PVector z=PVector.sub(b,a); float len=z.mag(); if(len<0.00001f) return;
    z.div(len);
    PVector ref=abs(z.z)<0.9f?new PVector(0,0,1):new PVector(0,1,0);
    PVector x=ref.cross(z).normalize(),y=z.cross(x).normalize();
    PVector c=PVector.add(a,b).mult(0.5f);
    PMatrix3D m=new PMatrix3D(x.x,y.x,z.x,c.x,x.y,y.y,z.y,c.y,x.z,y.z,z.z,c.z,0,0,0,1);
    // Slight end overlap avoids tiny numerical gaps; solids remain separate.
    primitive(m,w,d,len+min(w,d)*0.15f,false);
  }
  void finish() {
    low=new PVector(Float.MAX_VALUE,Float.MAX_VALUE,Float.MAX_VALUE);
    high=new PVector(-Float.MAX_VALUE,-Float.MAX_VALUE,-Float.MAX_VALUE);
    for(PVector v:vertices) {
      low.x=min(low.x,v.x); low.y=min(low.y,v.y); low.z=min(low.z,v.z);
      high.x=max(high.x,v.x); high.y=max(high.y,v.y); high.z=max(high.z,v.z);
    }
    center=PVector.add(low,high).mult(0.5f);
    span=max(0.001f,max(high.x-low.x,max(high.y-low.y,high.z-low.z)));
  }
  PVector exportVertex(int i) {
    PVector v=vertices.get(i);
    float factor=p(MM)/span;
    return new PVector((v.x-center.x)*factor,(v.y-center.y)*factor,(v.z-low.z)*factor);
  }
}
