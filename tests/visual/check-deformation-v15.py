# Uses the same EGL setup / compiled production source as the visual loop test.
from pathlib import Path
exec(Path('tests/visual/animate-v15.py').read_text().split('import subprocess')[0])
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
