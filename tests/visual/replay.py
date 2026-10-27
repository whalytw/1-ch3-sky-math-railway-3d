import ctypes as C,json,re,sys,numpy as np
from pathlib import Path
from PIL import Image
source=Path(sys.argv[1]);s=json.loads(source.read_text());W,H=s['width'],s['height']
E=C.CDLL('libEGL.so.1');G=C.CDLL('libGL.so.1');P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float
E.eglGetProcAddress.argtypes=[C.c_char_p];E.eglGetProcAddress.restype=P
getDisplay=C.CFUNCTYPE(P,U,P,C.POINTER(I))(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'));display=getDisplay(0x31DD,None,None)
E.eglInitialize.argtypes=[P,C.POINTER(I),C.POINTER(I)];assert E.eglInitialize(display,C.byref(I()),C.byref(I()));E.eglBindAPI(0x30A0)
E.eglChooseConfig.argtypes=[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)];config=P();num=I();attrs=(I*15)(0x3033,1,0x3040,0x40,0x3024,8,0x3023,8,0x3022,8,0x3025,24,0x3026,8,0x3038);assert E.eglChooseConfig(display,attrs,C.byref(config),1,C.byref(num)) and num.value
E.eglCreateContext.argtypes=[P,P,P,C.POINTER(I)];E.eglCreateContext.restype=P;ctx=E.eglCreateContext(display,config,None,(I*3)(0x3098,3,0x3038));assert ctx
E.eglCreatePbufferSurface.argtypes=[P,P,C.POINTER(I)];E.eglCreatePbufferSurface.restype=P;surf=E.eglCreatePbufferSurface(display,config,(I*5)(0x3057,W,0x3056,H,0x3038));assert surf
E.eglMakeCurrent.argtypes=[P,P,P,P];assert E.eglMakeCurrent(display,surf,surf,ctx)
def fn(name,restype,args):
 f=getattr(G,name);f.restype=restype;f.argtypes=args;return f
createShader=fn('glCreateShader',U,[U]);shaderSource=fn('glShaderSource',None,[U,I,C.POINTER(C.c_char_p),C.POINTER(I)]);compileShader=fn('glCompileShader',None,[U]);shaderiv=fn('glGetShaderiv',None,[U,U,C.POINTER(I)]);shaderlog=fn('glGetShaderInfoLog',None,[U,I,C.POINTER(I),C.c_char_p]);createProgram=fn('glCreateProgram',U,[]);attachShader=fn('glAttachShader',None,[U,U]);link=fn('glLinkProgram',None,[U]);programiv=fn('glGetProgramiv',None,[U,U,C.POINTER(I)]);use=fn('glUseProgram',None,[U]);getUniform=fn('glGetUniformLocation',I,[U,C.c_char_p]);getAttr=fn('glGetAttribLocation',I,[U,C.c_char_p])
program=createProgram()
for typ,name in [(0x8B31,'vertex'),(0x8B30,'fragment')]:
 code=s['shaders'][name].encode();obj=createShader(typ);cp=C.c_char_p(code);shaderSource(obj,1,C.byref(cp),None);compileShader(obj);ok=I();shaderiv(obj,0x8B81,C.byref(ok));log=C.create_string_buffer(4096);shaderlog(obj,4096,None,log);assert ok.value,log.value;attachShader(program,obj)
link(program);ok=I();programiv(program,0x8B82,C.byref(ok));assert ok.value;use(program)
uniform1=fn('glUniform1f',None,[I,F]);uniform2=fn('glUniform2f',None,[I,F,F]);uniform3=fn('glUniform3fv',None,[I,I,C.POINTER(F)]);uniformM=fn('glUniformMatrix4fv',None,[I,I,U,C.POINTER(F)])
uniform={name:getUniform(program,name.encode()) for name in ['uMvp','uModel','uEye','uFog','uFar','uViewport','uOutlinePixels','uTime','uBob','uMode','uAlpha','uOutlineColor','uMotion','uPhase','uSprite','uSpriteTexture','uSpriteGrid','uSpriteCell','uSpriteInset','uSpriteFlip','uArtKind','uArtPhase','uArtMirror','uLightTint','uEmissive','uShadowPass','uDistant','uSky','uSkyMix','uSkyOffset','uPanoramaA','uPanoramaB']}
def one(k,v):uniform1(uniform[k],v)
def vec(k,v):uniform3(uniform[k],1,(F*3)(*v))
def mat(k,v):uniformM(uniform[k],1,0,(F*16)(*v))
def rgb(c):return [int(c[i:i+2],16)/255 for i in [1,3,5]]
gen=fn('glGenBuffers',None,[I,C.POINTER(U)]);bind=fn('glBindBuffer',None,[U,U]);data=fn('glBufferData',None,[U,C.c_ssize_t,P,U]);enableAttr=fn('glEnableVertexAttribArray',None,[U]);attr=fn('glVertexAttribPointer',None,[U,I,U,U,I,P]);genVAO=fn('glGenVertexArrays',None,[I,C.POINTER(U)]);bindVAO=fn('glBindVertexArray',None,[U]);draw=fn('glDrawArrays',None,[U,I,I]);meshes={}
for key,file in s['buffers'].items():
 a=np.fromfile(source.parent/file,dtype='float32');buf=U();vao=U();gen(1,C.byref(buf));genVAO(1,C.byref(vao));bindVAO(vao);bind(34962,buf);data(34962,a.nbytes,a.ctypes.data,35044)
 for j,name in enumerate(['aPosition','aNormal','aColor']):
  loc=getAttr(program,name.encode());enableAttr(loc);attr(loc,3,5126,0,36,P(j*12))
 meshes[key]=vao
texgen=fn('glGenTextures',None,[I,C.POINTER(U)]);texbind=fn('glBindTexture',None,[U,U]);texdata=fn('glTexImage2D',None,[U,I,I,I,I,I,U,U,P]);texparam=fn('glTexParameteri',None,[U,U,I]);active=fn('glActiveTexture',None,[U]);uint=fn('glUniform1i',None,[I,I]);textures={}
for key,file in s['textures'].items():
 im=Image.open(source.parent/file).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM);a=np.asarray(im,dtype='uint8');tx=U();texgen(1,C.byref(tx));texbind(3553,tx);texdata(3553,0,6408,im.width,im.height,0,6408,5121,a.ctypes.data)
 for k,v in [(10241,9729),(10240,9729),(10242,33071),(10243,33071)]:texparam(3553,k,v)
 textures[key]=tx
viewport=fn('glViewport',None,[I,I,I,I]);scissor=fn('glScissor',None,[I,I,I,I]);clearColor=fn('glClearColor',None,[F,F,F,F]);clear=fn('glClear',None,[U]);enable=fn('glEnable',None,[U]);disable=fn('glDisable',None,[U]);blend=fn('glBlendFunc',None,[U,U]);read=fn('glReadPixels',None,[I,I,I,I,U,U,P]);error=fn('glGetError',U,[]);depthmask=fn('glDepthMask',None,[U]);colormask=fn('glColorMask',None,[U,U,U,U]);depthfunc=fn('glDepthFunc',None,[U]);stmask=fn('glStencilMask',None,[U]);stfunc=fn('glStencilFunc',None,[U,I,U]);stop=fn('glStencilOp',None,[U,U,U]);stclear=fn('glClearStencil',None,[I]);stclear(0)
for call in s['calls']:
 t=call['state'];viewport(*t['viewport']);scissor(*t['scissor']);clearColor(*t['clearColor']);depthmask(t['depthWrite']);colormask(*([t['colorWrite']]*4));depthfunc(t['depthFunc']);stmask(t['stencilMask']);stfunc(*t['stencilFunc']);stop(*t['stencilOp']);blend(*t['blend'])
 for cap in [2929,3089,2884,3042,2960]: (enable if cap in t['enabled'] else disable)(cap)
 if call['kind']=='clear':clear(call['bits']);continue
 for k,v in call['uniforms'].items():
  loc=uniform.get(k,-1)
  if loc<0:continue
  if isinstance(v,list):
   if len(v)==16:uniformM(loc,1,0,(F*16)(*v))
   elif len(v)==3:uniform3(loc,1,(F*3)(*v))
   elif len(v)==2:uniform2(loc,*v)
  elif k in ['uSpriteTexture','uPanoramaA','uPanoramaB']:uint(loc,v)
  else:uniform1(loc,v)
 for unit,tid in t['textures'].items():
  active(33984+int(unit));texbind(3553,textures[str(tid)]);texparam(3553,10242,10497 if int(unit)<2 else 33071)
 bindVAO(meshes[str(call['buffer'])]);draw(4,0,call['count'])
 assert error()==0
out=np.empty((H,W,4),dtype='uint8');read(0,0,W,H,6408,5121,out.ctypes.data);Image.fromarray(out[::-1].copy()).save(source.with_suffix('.png'));print('PASS actual ES3 renderer replay',source.stem,len(s['calls']),'draw/clear operations')
