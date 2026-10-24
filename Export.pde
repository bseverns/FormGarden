String newExportBase() {
  File folder=new File(sketchPath("exports")); folder.mkdirs();
  String stamp=new java.text.SimpleDateFormat("yyyyMMdd-HHmmss-SSS").format(new java.util.Date());
  return new File(folder,"form-"+stamp+"-"+seed+"-"+Long.toHexString(System.nanoTime())).getAbsolutePath();
}
JSONObject recipe() {
  JSONObject j=new JSONObject(); j.setString("generator","FormGarden"); j.setInt("version",1);
  j.setInt("seed",seed); j.setInt("motif",motif); j.setInt("preset",presetIndex);
  JSONObject ps=new JSONObject(); for(Param q:params) ps.setFloat(q.key,q.value);
  j.setJSONObject("parameters",ps); return j;
}
void saveRecipe(String path) {
  try {
    if(!saveJSONObject(recipe(),path)) throw new RuntimeException("Cannot write recipe");
    status="Saved recipe: "+new File(path).getName();
  } catch(Exception ex) { status="Recipe save failed: "+ex.getMessage(); }
}
void recipeSelected(File selected) {
  if(selected==null) return;
  try {
    JSONObject j=loadJSONObject(selected.getAbsolutePath());
    if(j==null || !j.getString("generator").equals("FormGarden") || j.getInt("version")!=1)
      throw new RuntimeException("Expected FormGarden version 1");
    JSONObject ps=j.getJSONObject("parameters");
    float[] values=new float[params.length];
    for(int i=0;i<params.length;i++) {
      Param q=params[i]; float v=ps.getFloat(q.key);
      if(Float.isNaN(v) || Float.isInfinite(v) || v<q.lo || v>q.hi || (q.integer && v!=round(v)))
        throw new RuntimeException("Invalid "+q.key);
      values[i]=v;
    }
    int newMotif=j.getInt("motif"),newPreset=j.getInt("preset"),newSeed=j.getInt("seed");
    if(newMotif<0 || newMotif>=3 || newPreset<0 || newPreset>=4) throw new RuntimeException("Invalid motif/preset");
    for(int i=0;i<params.length;i++) params[i].value=values[i];
    motif=newMotif; presetIndex=newPreset; seed=newSeed; dirty=true;
    status="Loaded "+selected.getName();
  } catch(Exception ex) { status="Load failed; settings kept: "+ex.getMessage(); }
}
void exportMesh(boolean stl) {
  if(dirty) rebuild();
  if(mesh==null) { status="Nothing to export"; return; }
  String base=newExportBase(),path=base+(stl?".stl":".obj");
  try {
    PrintWriter out=createWriter(path);
    if(stl) {
      out.println("solid FormGarden");
      for(int[] f:mesh.faces) {
        PVector a=mesh.exportVertex(f[0]),b=mesh.exportVertex(f[1]),c=mesh.exportVertex(f[2]);
        PVector n=PVector.sub(b,a).cross(PVector.sub(c,a)).normalize();
        out.printf(Locale.US,"facet normal %.9g %.9g %.9g%n outer loop%n",n.x,n.y,n.z);
        for(PVector v:new PVector[]{a,b,c}) out.printf(Locale.US,"  vertex %.9g %.9g %.9g%n",v.x,v.y,v.z);
        out.println(" endloop\nendfacet");
      }
      out.println("endsolid FormGarden");
    } else {
      out.println("# FormGarden | coordinates interpreted as mm | Z up");
      out.println("# Separate overlapping solids; no boolean union performed");
      for(int i=0;i<mesh.vertices.size();i++) {
        PVector v=mesh.exportVertex(i); out.printf(Locale.US,"v %.9g %.9g %.9g%n",v.x,v.y,v.z);
      }
      out.println("o FormGarden");
      for(int[] f:mesh.faces) out.println("f "+(f[0]+1)+" "+(f[1]+1)+" "+(f[2]+1));
    }
    out.flush(); boolean error=out.checkError(); out.close();
    if(error) throw new RuntimeException("Mesh write failed");
    if(!saveJSONObject(recipe(),base+".json")) throw new RuntimeException("Mesh written, recipe write failed");
    status="Saved "+new File(path).getName()+" + recipe";
  } catch(Exception ex) { status="Export error: "+ex.getMessage(); ex.printStackTrace(); }
}
