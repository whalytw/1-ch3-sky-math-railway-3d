import ctypes as C,json,re,sys,numpy as np
from pathlib import Path
from PIL import Image
s=json.loads(Path('qa/animation-v15.json').read_text());W,H=1280,768
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
uniform={name:getUniform(program,name.encode()) for name in ['uMvp','uModel','uEye','uFog','uFar','uViewport','uOutlinePixels','uTime','uBob','uMode','uAlpha','uOutlineColor','uMotion','uPhase','uSprite','uSpriteTexture','uSpriteGrid','uSpriteCell','uSpriteInset','uSpriteFlip','uArtKind','uArtPhase','uArtMirror']}
def one(k,v):uniform1(uniform[k],v)
def vec(k,v):uniform3(uniform[k],1,(F*3)(*v))
def mat(k,v):uniformM(uniform[k],1,0,(F*16)(*v))
def rgb(c):return [int(c[i:i+2],16)/255 for i in [1,3,5]]
import subprocess
identity=np.eye(4,dtype='float32').flatten().tolist()
mat('uMvp',[.80,0,0,0,0,.80,0,0,0,0,-.1,0,0,0,0,1]);vec('uEye',[0,0,5]);vec('uFog',[.1,.2,.28]);vec('uOutlineColor',[1,1,1]);one('uFar',1000);one('uAlpha',1);uniform2(uniform['uViewport'],256,256)
gen=fn('glGenBuffers',None,[I,C.POINTER(U)]);bind=fn('glBindBuffer',None,[U,U]);data=fn('glBufferData',None,[U,C.c_ssize_t,P,U]);enableAttr=fn('glEnableVertexAttribArray',None,[U]);attr=fn('glVertexAttribPointer',None,[U,I,U,U,I,P]);genVAO=fn('glGenVertexArrays',None,[I,C.POINTER(U)]);bindVAO=fn('glBindVertexArray',None,[U]);draw=fn('glDrawArrays',None,[U,I,I])
meshes={}
for key,vertices in {'art':s['mesh'],**s['fx']}.items():
 a=np.array(vertices,dtype='float32');buf=U();vao=U();gen(1,C.byref(buf));genVAO(1,C.byref(vao));bindVAO(vao);bind(0x8892,buf);data(0x8892,a.nbytes,a.ctypes.data,0x88E4)
 for j,name in enumerate(['aPosition','aNormal','aColor']):
  loc=getAttr(program,name.encode());enableAttr(loc);attr(loc,3,0x1406,0,36,P(j*12))
 meshes[key]=(vao,len(a)//9)
genTexture=fn('glGenTextures',None,[I,C.POINTER(U)]);bindTexture=fn('glBindTexture',None,[U,U]);texImage=fn('glTexImage2D',None,[U,I,I,I,I,I,U,U,P]);texParam=fn('glTexParameteri',None,[U,U,I]);activeTexture=fn('glActiveTexture',None,[U]);uniformInt=fn('glUniform1i',None,[I,I]);textures=[]
for a in s['art']:
 im=Image.open(Path('assets')/a['file']).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM);pixels=np.asarray(im,dtype='uint8');texture=U();genTexture(1,C.byref(texture));activeTexture(0x84C2);bindTexture(0x0DE1,texture);texImage(0x0DE1,0,0x1908,im.width,im.height,0,0x1908,0x1401,pixels.ctypes.data)
 for k,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:texParam(0x0DE1,k,v)
 textures.append((texture,im.width,im.height))
viewport=fn('glViewport',None,[I,I,I,I]);clearColor=fn('glClearColor',None,[F,F,F,F]);clear=fn('glClear',None,[U]);enable=fn('glEnable',None,[U]);disable=fn('glDisable',None,[U]);blendFunc=fn('glBlendFunc',None,[U,U]);read=fn('glReadPixels',None,[I,I,I,I,U,U,P]);getError=fn('glGetError',U,[])
enable(0x0BE2);blendFunc(0x0302,0x0303);clearColor(.055,.105,.145,1);uniformInt(uniform['uSpriteTexture'],2)
def drawmesh(name,m):
 vao,count=meshes[name];bindVAO(vao);mat('uModel',m);draw(4,0,count)
video=Path('docs/animation-check-v1.5.mp4');video.parent.mkdir(exist_ok=True)
pipe=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(video)],stdin=subprocess.PIPE)
first=None;maxdiff=np.zeros(15)
for frame,states in enumerate(s['frames']):
 clear(0x4000);one('uTime',frame/30)
 for j,(a,state) in enumerate(zip(s['art'],states)):
  viewport(j%5*256,(2-j//5)*256,256,256);texture,w,h=textures[j];bindTexture(0x0DE1,texture);one('uSprite',1);one('uAlpha',1);one('uArtKind',a['kind']);one('uArtPhase',state['phase']);one('uArtMirror',1);uniform2(uniform['uSpriteGrid'],a['cols'],a['rows']);uniform2(uniform['uSpriteCell'],0,0);uniform2(uniform['uSpriteInset'],.5*a['cols']/w,.5*a['rows']/h);drawmesh('art',identity)
  one('uSprite',0)
  for fx in state['attachments']:one('uAlpha',fx['alpha']);drawmesh(fx['kind'],fx['matrix'])
 assert getError()==0
 out=np.empty((H,W,4),dtype='uint8');read(0,0,W,H,0x1908,0x1401,out.ctypes.data);out=out[::-1].copy()
 if first is None:first=out.copy()
 for j in range(15):
  row,col=j//5,j%5;d=np.mean(np.abs(out[row*256:(row+1)*256,col*256:(col+1)*256,:3].astype(float)-first[row*256:(row+1)*256,col*256:(col+1)*256,:3]));maxdiff[j]=max(maxdiff[j],d)
 if frame in [0,5,10,15,20,25,30,45,60]:Image.fromarray(out).save(f'qa/motion-v15-{frame:03}.png')
 pipe.stdin.write(out.tobytes())
pipe.stdin.close();assert pipe.wait()==0
assert min(maxdiff)>.04,(s['ids'],maxdiff)
print('PASS production ES3 shader compile/link, 240 animated frames, all 15 subjects visibly change, no GL errors')
print(dict(zip(s['ids'],maxdiff.round(3))))
