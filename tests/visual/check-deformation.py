import ctypes as C,json,re,sys,numpy as np
from pathlib import Path
from PIL import Image
s=json.loads(Path('qa/deformation-v16.json').read_text());W,H=1280,768
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

program2=createProgram()
code=('#version 300 es\nprecision highp float; uniform vec4 probe; uniform float mirror;out vec3 captured;\n'+s['deformGLSL']+'\nvoid main(){captured=artSkin(probe.x,probe.yz,probe.w,mirror);gl_Position=vec4(captured,1.);}').encode()
for typ,code in [(0x8B31,code),(0x8B30,b'#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(1.);}')]:
 obj=createShader(typ);cp=C.c_char_p(code);shaderSource(obj,1,C.byref(cp),None);compileShader(obj);ok=I();shaderiv(obj,0x8B81,C.byref(ok));log=C.create_string_buffer(4096);shaderlog(obj,4096,None,log);assert ok.value,log.value;attachShader(program2,obj)
fn('glTransformFeedbackVaryings',None,[U,I,C.POINTER(C.c_char_p),U])(program2,1,(C.c_char_p*1)(b'captured'),0x8C8C)
link(program2);ok=I();programiv(program2,0x8B82,C.byref(ok));assert ok.value;use(program2)
buf=U();fn('glGenBuffers',None,[I,C.POINTER(U)])(1,C.byref(buf));fn('glBindBuffer',None,[U,U])(0x8C8E,buf);fn('glBufferData',None,[U,C.c_ssize_t,P,U])(0x8C8E,12,None,0x88E1);fn('glBindBufferBase',None,[U,U,U])(0x8C8E,0,buf);fn('glEnable',None,[U])(0x8C89)
u4=fn('glUniform4f',None,[I,F,F,F,F]);begin=fn('glBeginTransformFeedback',None,[U]);end=fn('glEndTransformFeedback',None,[]);draw=fn('glDrawArrays',None,[U,I,I]);mapbuf=fn('glMapBufferRange',P,[U,C.c_ssize_t,C.c_ssize_t,U]);unmap=fn('glUnmapBuffer',U,[U]);maxerr=0
for p in s['probes']:
 u4(getUniform(program2,b'probe'),p['kind'],p['x'],p['y'],p['t']);uniform1(getUniform(program2,b'mirror'),p['mirror']);begin(0);draw(0,0,1);end();ptr=mapbuf(0x8C8E,0,12,1);assert ptr;got=list(C.cast(ptr,C.POINTER(F*3)).contents);unmap(0x8C8E);error=max(abs(a-b) for a,b in zip(got,p['expected']));maxerr=max(maxerr,error);assert error<2e-6,(p,got)
assert fn('glGetError',U,[])()==0
print(f'PASS {len(s["probes"])} CPU/GPU joint deformation probes, max error {maxerr:.2e}')
